-- ============================================================
-- 029_fixr_system_messages.sql
-- Tacada 5: mensagens automáticas "Fixr" + gatilhos de engajamento
--
-- Eventos que disparam mensagens de sistema:
--   • Rating 5★              → parabeniza pro
--   • Rating < 3★            → mensagem de apoio para ambos
--   • 5 avaliações 5★ em seq → reconhece pro
--   • 10 serviços concluídos → agradece cliente
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Messages: permite mensagens de sistema (sender_id opcional)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.messages
  ALTER COLUMN sender_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS is_system   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS system_tag  TEXT;

-- Garantia: sender_id é obrigatório quando não é mensagem do sistema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_or_system'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_sender_or_system
        CHECK (is_system = true OR sender_id IS NOT NULL);
  END IF;
END $$;

COMMENT ON COLUMN public.messages.is_system IS
  'Mensagem gerada pelo próprio Fixr (felicitações, alertas etc.). sender_id pode ser NULL.';
COMMENT ON COLUMN public.messages.system_tag IS
  'Identificador do tipo de mensagem do sistema (ex: rating_5_congrats, milestone_10_services).';

-- Unicidade suave: evita duplicar o mesmo tag para o mesmo destinatário em 24h
CREATE INDEX IF NOT EXISTS idx_messages_system_dedupe
  ON public.messages (receiver_id, system_tag, created_at DESC)
  WHERE is_system = true;

-- Política extra: qualquer um pode LER suas próprias mensagens do sistema
-- (já coberta pela política "Users can view their own messages"
-- via receiver_id = auth.uid())

-- ────────────────────────────────────────────────────────────
-- 2. Helper: insere mensagem de sistema com dedupe por tag+24h
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._fixr_send_system_message(
  _receiver_id UUID,
  _content     TEXT,
  _tag         TEXT,
  _service_request_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Dedupe: não envia a mesma tag pro mesmo user em 24h
  IF EXISTS (
    SELECT 1 FROM public.messages
     WHERE receiver_id = _receiver_id
       AND system_tag  = _tag
       AND is_system   = true
       AND created_at  >= now() - INTERVAL '24 hours'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.messages (
    sender_id, receiver_id, service_request_id, content,
    is_system, system_tag
  ) VALUES (
    NULL, _receiver_id, _service_request_id, _content,
    true, _tag
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. Trigger: mensagens ao inserir review
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._fixr_trg_review_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consec_5   INTEGER;
BEGIN
  -- Só para reviews do CLIENTE avaliando o PRO (não para avaliação do pro ao cliente)
  IF NEW.reviewer_role IS DISTINCT FROM 'client' THEN
    RETURN NEW;
  END IF;

  -- Rating 5★: parabeniza pro
  IF NEW.rating = 5 THEN
    PERFORM public._fixr_send_system_message(
      NEW.professional_id,
      'Parabéns! Você recebeu uma avaliação 5★. Continue oferecendo esse nível de serviço para alcançar o Fixr Select.',
      'rating_5_congrats',
      NEW.service_request_id
    );

    -- 5 últimas avaliações 5★ → reconhecimento extra
    SELECT COUNT(*) INTO v_consec_5
      FROM (
        SELECT rating
          FROM public.reviews
         WHERE professional_id = NEW.professional_id
           AND reviewer_role = 'client'
         ORDER BY created_at DESC
         LIMIT 5
      ) r
     WHERE r.rating = 5;

    IF v_consec_5 = 5 THEN
      PERFORM public._fixr_send_system_message(
        NEW.professional_id,
        '5 avaliações 5★ seguidas! Você está no caminho do Fixr Select. Obrigado por representar o melhor da plataforma.',
        'rating_5_streak_5',
        NULL
      );
    END IF;

  -- Rating < 3: apoio para ambos
  ELSIF NEW.rating < 3 THEN
    PERFORM public._fixr_send_system_message(
      NEW.professional_id,
      'Vimos que você recebeu uma avaliação abaixo de 3★. Entre em contato com o cliente para entender a insatisfação — estamos aqui para ajudar.',
      'rating_low_pro',
      NEW.service_request_id
    );
    PERFORM public._fixr_send_system_message(
      NEW.client_id,
      'Sentimos muito pela experiência. Se precisar abrir uma disputa ou reportar algo mais grave, entre em contato com o suporte.',
      'rating_low_client',
      NEW.service_request_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fixr_review_messages ON public.reviews;
CREATE TRIGGER trg_fixr_review_messages
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public._fixr_trg_review_messages();

-- ────────────────────────────────────────────────────────────
-- 4. Trigger: ao concluir serviço → marco de 10 do cliente
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._fixr_trg_client_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN

    SELECT COUNT(*) INTO v_total
      FROM public.service_requests
     WHERE client_id = NEW.client_id
       AND status = 'completed';

    IF v_total = 10 THEN
      PERFORM public._fixr_send_system_message(
        NEW.client_id,
        'Você contratou 10 serviços com profissionais Fixr! Obrigado por confiar na nossa plataforma. Seu próximo serviço tem nosso cupom especial — confira em promoções.',
        'milestone_10_services',
        NULL
      );
    ELSIF v_total = 50 THEN
      PERFORM public._fixr_send_system_message(
        NEW.client_id,
        '50 serviços! Você é parte essencial da comunidade Fixr.',
        'milestone_50_services',
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fixr_client_milestone ON public.service_requests;
CREATE TRIGGER trg_fixr_client_milestone
  AFTER INSERT OR UPDATE OF status ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public._fixr_trg_client_milestone();
