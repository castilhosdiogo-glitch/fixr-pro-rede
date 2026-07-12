-- ============================================================
-- 043_service_checkins_disputes.sql
--
-- Feature A: "Iniciar serviço" + check-ins proporcionais (33%/66%)
--   Profissional estima a duração ao iniciar. O app pergunta ao
--   cliente "como está indo?" em 2 checkpoints. O histórico vira
--   evidência auditável pra disputa (evita reembolso surpresa no
--   final, sem rastro do que aconteceu durante o serviço).
--
-- Feature B: Disputa/reembolso in-app
--   Cliente pode contestar um serviço `completed` em até 7 dias.
--   Abrir disputa trava o pagamento (escrow_status='held_by_admin').
--   Resolução é SEMPRE manual por admin (sem auto-resolve nessa v1),
--   vendo o histórico de check-ins como evidência.
--
-- NOTA DE RISCO (documentada, não bloqueante): o split Pagar.me manda
-- o dinheiro pro saldo do profissional na hora da cobrança
-- (create-pagarme-payment), e o saque pro banco dele segue o
-- transfer_interval do recipient (default semanal). "held_by_admin"
-- aqui é hoje um label administrativo — não bloqueia automaticamente
-- a transferência real no Pagar.me. Pra v1, assume-se que a maioria
-- das disputas chega antes do saque semanal do profissional.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. service_requests — novas colunas de ciclo de vida
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER
    CHECK (estimated_duration_minutes IS NULL OR (estimated_duration_minutes > 0 AND estimated_duration_minutes <= 1440));

COMMENT ON COLUMN public.service_requests.started_at IS
  'Carimbado pela trigger _fixr_stamp_service_lifecycle quando status entra em ''in_progress''.';
COMMENT ON COLUMN public.service_requests.completed_at IS
  'Carimbado pela trigger _fixr_stamp_service_lifecycle quando status entra em ''completed''. Base da janela de 7 dias de disputa.';

CREATE OR REPLACE FUNCTION public._fixr_stamp_service_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM 'in_progress' AND NEW.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fixr_service_lifecycle ON public.service_requests;
CREATE TRIGGER trg_fixr_service_lifecycle
  BEFORE UPDATE OF status ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public._fixr_stamp_service_lifecycle();

-- ────────────────────────────────────────────────────────────
-- 2. service_checkins — checkpoints proporcionais (33%/66%)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_checkins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id  UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkpoint_pct      INTEGER NOT NULL CHECK (checkpoint_pct IN (33, 66)),
  scheduled_for       TIMESTAMPTZ NOT NULL,
  notified_at         TIMESTAMPTZ,
  responded_at        TIMESTAMPTZ,
  response            TEXT CHECK (response IN ('ok', 'problem')),
  comment             TEXT CHECK (comment IS NULL OR char_length(comment) <= 500),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_request_id, checkpoint_pct)
);

CREATE INDEX IF NOT EXISTS idx_checkins_tick
  ON public.service_checkins (scheduled_for) WHERE notified_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_checkins_client_pending
  ON public.service_checkins (client_id, responded_at) WHERE responded_at IS NULL;

COMMENT ON TABLE public.service_checkins IS
  'Checkpoints proporcionais (33%/66% da duração estimada) durante um serviço in_progress. Evidência auditável pra disputa.';

-- Cria os 2 checkpoints quando o serviço entra em in_progress.
-- Roda AFTER: NEW já reflete o started_at carimbado pela trigger BEFORE acima
-- (na mesma linha/mesmo statement, triggers BEFORE aplicam antes de AFTER rodar).
CREATE OR REPLACE FUNCTION public._fixr_create_service_checkins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'in_progress'
     AND OLD.status IS DISTINCT FROM 'in_progress'
     AND NEW.estimated_duration_minutes IS NOT NULL THEN
    INSERT INTO public.service_checkins
      (service_request_id, client_id, professional_id, checkpoint_pct, scheduled_for)
    VALUES
      (NEW.id, NEW.client_id, NEW.professional_id, 33,
       NEW.started_at + make_interval(mins => (NEW.estimated_duration_minutes * 0.33)::int)),
      (NEW.id, NEW.client_id, NEW.professional_id, 66,
       NEW.started_at + make_interval(mins => (NEW.estimated_duration_minutes * 0.66)::int))
    ON CONFLICT (service_request_id, checkpoint_pct) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fixr_create_service_checkins ON public.service_requests;
CREATE TRIGGER trg_fixr_create_service_checkins
  AFTER UPDATE OF status ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public._fixr_create_service_checkins();

-- Evidência não pode ser adulterada: cliente só mexe em response/comment/responded_at.
CREATE OR REPLACE FUNCTION public._fixr_lock_checkin_immutables()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.service_request_id <> OLD.service_request_id
     OR NEW.checkpoint_pct <> OLD.checkpoint_pct
     OR NEW.scheduled_for <> OLD.scheduled_for THEN
    RAISE EXCEPTION 'campos imutáveis de service_checkins não podem ser alterados';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fixr_lock_checkin_immutables ON public.service_checkins;
CREATE TRIGGER trg_fixr_lock_checkin_immutables
  BEFORE UPDATE ON public.service_checkins
  FOR EACH ROW EXECUTE FUNCTION public._fixr_lock_checkin_immutables();

ALTER TABLE public.service_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS checkins_client_read ON public.service_checkins;
CREATE POLICY checkins_client_read ON public.service_checkins
  FOR SELECT USING (client_id = auth.uid());

DROP POLICY IF EXISTS checkins_pro_read ON public.service_checkins;
CREATE POLICY checkins_pro_read ON public.service_checkins
  FOR SELECT USING (professional_id = auth.uid());

DROP POLICY IF EXISTS checkins_admin_read ON public.service_checkins;
CREATE POLICY checkins_admin_read ON public.service_checkins
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS checkins_client_respond ON public.service_checkins;
CREATE POLICY checkins_client_respond ON public.service_checkins
  FOR UPDATE
  USING (client_id = auth.uid() AND responded_at IS NULL)
  WITH CHECK (client_id = auth.uid());

-- Sem policy de INSERT: as linhas só nascem via trigger SECURITY DEFINER.

-- ────────────────────────────────────────────────────────────
-- 3. Helper genérico de push (não mexe em _notify_dispatch_push, já em produção)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._fixr_send_push(_user_id UUID, _title TEXT, _body TEXT, _tag TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt      TEXT;
  v_base_url TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_jwt
      FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
    IF v_jwt IS NULL OR LENGTH(TRIM(v_jwt)) = 0 THEN
      RETURN;
    END IF;

    SELECT decrypted_secret INTO v_base_url
      FROM vault.decrypted_secrets WHERE name = 'functions_url' LIMIT 1;
    IF v_base_url IS NULL OR LENGTH(TRIM(v_base_url)) = 0 THEN
      v_base_url := 'https://hoymfqveawkomiixtvpw.supabase.co/functions/v1';
    END IF;

    PERFORM net.http_post(
      url     := v_base_url || '/push-notify',
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Authorization', 'Bearer ' || v_jwt
                 ),
      body    := jsonb_build_object(
                   'user_id', _user_id,
                   'title',   _title,
                   'body',    _body,
                   'tag',     COALESCE(_tag, 'fixr-notification')
                 )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- nunca bloqueia o caller
  END;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. Tick: cria notificações de checkpoint vencido
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fixr_service_checkin_tick()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row   RECORD;
  v_count INT := 0;
BEGIN
  FOR v_row IN
    SELECT c.id, c.client_id, c.checkpoint_pct, p.full_name AS pro_name
      FROM public.service_checkins c
      JOIN public.service_requests sr ON sr.id = c.service_request_id AND sr.status = 'in_progress'
      JOIN public.profiles p ON p.user_id = c.professional_id
     WHERE c.notified_at IS NULL
       AND c.scheduled_for <= now()
     LIMIT 200
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT v_row.client_id, 'service_checkin_due',
           'Como está indo o serviço?',
           format('Confirme rapidamente se está tudo bem com %s até agora.', v_row.pro_name),
           jsonb_build_object('url', '/meu-painel', 'checkin_id', v_row.id, 'checkpoint_pct', v_row.checkpoint_pct)
     WHERE NOT EXISTS (
       SELECT 1 FROM public.notifications n
        WHERE n.user_id = v_row.client_id AND (n.data ->> 'checkin_id')::uuid = v_row.id
     );

    UPDATE public.service_checkins SET notified_at = now() WHERE id = v_row.id;

    PERFORM public._fixr_send_push(
      v_row.client_id, 'Como está indo o serviço?',
      'Toque para responder — leva 5 segundos.', 'service-checkin'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('checkins_notified', v_count, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.fixr_service_checkin_tick() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fixr_service_checkin_tick() TO service_role;

-- ────────────────────────────────────────────────────────────
-- 5. pg_cron — a cada 5min (checkpoints caem em qualquer minuto,
--    diferente do job de reengajamento que é hora fechada)
-- ────────────────────────────────────────────────────────────

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fixr_service_checkin_tick') THEN
      PERFORM cron.unschedule('fixr_service_checkin_tick');
    END IF;

    PERFORM cron.schedule(
      'fixr_service_checkin_tick',
      '*/5 * * * *',
      $cron$ SELECT public.fixr_service_checkin_tick(); $cron$
    );
  END IF;
END;
$outer$;

-- ────────────────────────────────────────────────────────────
-- 6. payments — extensão do escrow_status pra refund parcial
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_escrow_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_escrow_status_check
  CHECK (escrow_status IN ('holding', 'released', 'held_by_admin', 'refunded', 'partially_refunded'));

-- ────────────────────────────────────────────────────────────
-- 7. service_disputes
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_disputes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id      UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  payment_id               UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  client_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_by                UUID NOT NULL REFERENCES auth.users(id),
  opened_by_role            TEXT NOT NULL DEFAULT 'client' CHECK (opened_by_role IN ('client', 'professional')),
  reason                     TEXT NOT NULL CHECK (reason IN
    ('nao_compareceu', 'servico_incompleto', 'qualidade_ruim', 'cobranca_indevida', 'dano_propriedade', 'outro')),
  description                 TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),
  evidence_snapshot            JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachment_paths               TEXT[] NOT NULL DEFAULT '{}',
  status                          TEXT NOT NULL DEFAULT 'open' CHECK (status IN
    ('open', 'under_review', 'resolved_refund_full', 'resolved_refund_partial', 'resolved_denied')),
  resolution_amount_cents          INTEGER,
  resolution_notes                   TEXT,
  resolved_by                          UUID REFERENCES auth.users(id),
  resolved_at                            TIMESTAMPTZ,
  created_at                              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- só 1 disputa ativa por serviço (permite histórico de disputas resolvidas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_disputes_one_active
  ON public.service_disputes (service_request_id)
  WHERE status IN ('open', 'under_review');

CREATE INDEX IF NOT EXISTS idx_disputes_admin_queue
  ON public.service_disputes (status, created_at);
CREATE INDEX IF NOT EXISTS idx_disputes_client
  ON public.service_disputes (client_id);

COMMENT ON TABLE public.service_disputes IS
  'Disputas/reembolso abertas pelo cliente sobre um serviço completed. Resolução sempre manual por admin nessa v1.';

CREATE OR REPLACE FUNCTION public._set_updated_at_disputes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_disputes_updated_at ON public.service_disputes;
CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON public.service_disputes
  FOR EACH ROW EXECUTE FUNCTION public._set_updated_at_disputes();

ALTER TABLE public.service_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS disputes_client_read ON public.service_disputes;
CREATE POLICY disputes_client_read ON public.service_disputes
  FOR SELECT USING (client_id = auth.uid());

DROP POLICY IF EXISTS disputes_pro_read ON public.service_disputes;
CREATE POLICY disputes_pro_read ON public.service_disputes
  FOR SELECT USING (professional_id = auth.uid());

DROP POLICY IF EXISTS disputes_admin_all ON public.service_disputes;
CREATE POLICY disputes_admin_all ON public.service_disputes
  FOR ALL USING (public.is_admin(auth.uid()));

-- Sem policy de INSERT/UPDATE pro client/pro: toda escrita passa pela RPC abaixo
-- ou pela edge function admin-resolve-dispute (via service role).

-- ────────────────────────────────────────────────────────────
-- 8. RPC: open_service_dispute — único caminho de escrita do cliente
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.open_service_dispute(
  p_service_request_id UUID,
  p_reason TEXT,
  p_description TEXT,
  p_attachment_paths TEXT[] DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sr         RECORD;
  v_payment_id UUID;
  v_dispute_id UUID;
  v_snapshot   JSONB;
BEGIN
  SELECT * INTO v_sr FROM public.service_requests WHERE id = p_service_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'service_request_not_found';
  END IF;
  IF v_sr.client_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_service_client';
  END IF;
  IF v_sr.status <> 'completed' THEN
    RAISE EXCEPTION 'service_not_completed';
  END IF;
  IF v_sr.completed_at IS NULL OR now() > v_sr.completed_at + INTERVAL '7 days' THEN
    RAISE EXCEPTION 'dispute_window_expired';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.service_disputes
     WHERE service_request_id = p_service_request_id AND status IN ('open', 'under_review')
  ) THEN
    RAISE EXCEPTION 'dispute_already_open';
  END IF;

  SELECT id INTO v_payment_id FROM public.payments WHERE service_request_id = p_service_request_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.checkpoint_pct), '[]'::jsonb)
    INTO v_snapshot
    FROM public.service_checkins c
   WHERE c.service_request_id = p_service_request_id;

  INSERT INTO public.service_disputes
    (service_request_id, payment_id, client_id, professional_id, opened_by, opened_by_role,
     reason, description, evidence_snapshot, attachment_paths)
  VALUES
    (p_service_request_id, v_payment_id, v_sr.client_id, v_sr.professional_id, auth.uid(), 'client',
     p_reason, p_description, v_snapshot, p_attachment_paths)
  RETURNING id INTO v_dispute_id;

  IF v_payment_id IS NOT NULL THEN
    UPDATE public.payments SET
      escrow_status = 'held_by_admin',
      escrow_hold_at = now(),
      escrow_hold_reason = 'dispute_opened:' || v_dispute_id::text
    WHERE id = v_payment_id AND escrow_status = 'holding';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_sr.professional_id, 'dispute_opened', 'Serviço contestado',
    'Um cliente contestou um serviço concluído. O pagamento foi retido até a análise da Fixr.',
    jsonb_build_object('url', '/meu-painel', 'dispute_id', v_dispute_id)
  );

  PERFORM public._fixr_send_push(
    v_sr.professional_id, 'Serviço contestado',
    'Pagamento retido até análise do time Fixr.', 'dispute-opened'
  );

  RETURN v_dispute_id;
END;
$$;

REVOKE ALL ON FUNCTION public.open_service_dispute(UUID, TEXT, TEXT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_service_dispute(UUID, TEXT, TEXT, TEXT[]) TO authenticated;
