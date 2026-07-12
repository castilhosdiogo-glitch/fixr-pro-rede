-- ============================================================
-- 044_checkin_problem_urgent.sql
--
-- Quando o cliente responde um check-in com "problem", passa a ser
-- obrigatório descrever o que está errado, e o profissional é avisado
-- IMEDIATAMENTE (trigger na mesma transação, não espera o cron tick
-- de 5min) — inclui notificação com sinal sonoro no app (ver
-- useNotificationsRealtime no frontend) e push. O profissional marca
-- como lida (professional_acknowledged_at) via RPC dedicada, o que
-- também fica registrado como evidência de tempo de resposta.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Descrição obrigatória quando response = 'problem'
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.service_checkins DROP CONSTRAINT IF EXISTS chk_checkin_problem_requires_comment;
ALTER TABLE public.service_checkins ADD CONSTRAINT chk_checkin_problem_requires_comment
  CHECK (response IS DISTINCT FROM 'problem' OR (comment IS NOT NULL AND char_length(btrim(comment)) > 0));

-- ────────────────────────────────────────────────────────────
-- 2. Reconhecimento do profissional ("marcar como lida")
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.service_checkins
  ADD COLUMN IF NOT EXISTS professional_acknowledged_at TIMESTAMPTZ;

COMMENT ON COLUMN public.service_checkins.professional_acknowledged_at IS
  'Quando o profissional marcou o report de problema como visto. Também serve de evidência de tempo de resposta.';

CREATE INDEX IF NOT EXISTS idx_checkins_pro_unacknowledged
  ON public.service_checkins (professional_id, responded_at)
  WHERE response = 'problem' AND professional_acknowledged_at IS NULL;

-- ────────────────────────────────────────────────────────────
-- 3. Trigger: notifica o profissional NA HORA que response vira 'problem'
--    (roda na mesma transação do UPDATE do cliente — não espera cron)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._fixr_notify_checkin_problem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name TEXT;
BEGIN
  IF NEW.response = 'problem' AND OLD.response IS DISTINCT FROM 'problem' THEN
    SELECT full_name INTO v_client_name FROM public.profiles WHERE user_id = NEW.client_id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.professional_id,
      'service_checkin_problem',
      'Cliente reportou um problema agora',
      format('%s: "%s"', COALESCE(v_client_name, 'Cliente'), COALESCE(NEW.comment, '')),
      jsonb_build_object(
        'url', '/painel',
        'checkin_id', NEW.id,
        'service_request_id', NEW.service_request_id,
        'urgent', true
      )
    );

    PERFORM public._fixr_send_push(
      NEW.professional_id,
      'Cliente reportou um problema!',
      COALESCE(NEW.comment, 'Toque para ver detalhes.'),
      'checkin-problem-urgent'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fixr_notify_checkin_problem ON public.service_checkins;
CREATE TRIGGER trg_fixr_notify_checkin_problem
  AFTER UPDATE ON public.service_checkins
  FOR EACH ROW EXECUTE FUNCTION public._fixr_notify_checkin_problem();

-- ────────────────────────────────────────────────────────────
-- 4. RPC: profissional marca o problema como lido/reconhecido
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.acknowledge_checkin_problem(p_checkin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.service_checkins
     SET professional_acknowledged_at = now()
   WHERE id = p_checkin_id
     AND professional_id = auth.uid()
     AND response = 'problem'
     AND professional_acknowledged_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'checkin_not_found_or_already_acknowledged';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_checkin_problem(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acknowledge_checkin_problem(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 5. Correção: open_service_dispute (043) notificava o profissional
--    apontando pra /meu-painel (rota do CLIENTE). Profissional usa
--    /dashboard. Redeclarando a função inteira (CREATE OR REPLACE).
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
    jsonb_build_object('url', '/dashboard', 'dispute_id', v_dispute_id)
  );

  PERFORM public._fixr_send_push(
    v_sr.professional_id, 'Serviço contestado',
    'Pagamento retido até análise do time Fixr.', 'dispute-opened'
  );

  RETURN v_dispute_id;
END;
$$;
