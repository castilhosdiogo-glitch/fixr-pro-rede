-- ============================================================
-- 034_dispatch_rescue.sql
-- T2: Retry automático de broadcasts expirados
--
-- Quando todas as rodadas de dispatch expiram sem aceite, em vez
-- de deixar o broadcast como 'expired' permanente, marca como
-- 'sem_profissional' e agenda retry em 1h (até max_retries vezes).
-- Um cron roda a cada 5 min e reativa broadcasts prontos pra retry.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Colunas de controle de retry
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.broadcast_requests
  ADD COLUMN IF NOT EXISTS retry_count INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_retries INT         NOT NULL DEFAULT 3;

-- Estende o status check pra aceitar 'sem_profissional'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'broadcast_requests_status_check'
  ) THEN
    ALTER TABLE public.broadcast_requests DROP CONSTRAINT broadcast_requests_status_check;
  END IF;
END $$;

ALTER TABLE public.broadcast_requests
  ADD CONSTRAINT broadcast_requests_status_check
  CHECK (status IN ('dispatching','expanding','accepted','expired','cancelled','sem_profissional'));

CREATE INDEX IF NOT EXISTS idx_broadcast_requests_retry
  ON public.broadcast_requests (retry_after)
  WHERE status = 'sem_profissional';

-- ────────────────────────────────────────────────────────────
-- 2. Trigger: quando broadcast vira 'expired', converte para
--    'sem_profissional' com retry agendado (se houver retries)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._trigger_broadcast_expired_to_sem_profissional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'expired'
     AND OLD.status IS DISTINCT FROM 'expired'
     AND NEW.retry_count < NEW.max_retries
  THEN
    UPDATE public.broadcast_requests
    SET status      = 'sem_profissional',
        retry_after = now() + INTERVAL '1 hour',
        updated_at  = now()
    WHERE id = NEW.id;

    BEGIN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        NEW.client_id,
        'sem_profissional',
        'Sem profissionais agora',
        'Não encontramos profissionais disponíveis no momento. Tentaremos novamente em 1 hora. Você também pode ampliar o raio de busca.',
        jsonb_build_object(
          'broadcast_id', NEW.id,
          'retry_after',  (now() + INTERVAL '1 hour')::TEXT,
          'retry_count',  NEW.retry_count
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS broadcast_expired_to_sem_profissional ON public.broadcast_requests;
CREATE TRIGGER broadcast_expired_to_sem_profissional
  AFTER UPDATE OF status ON public.broadcast_requests
  FOR EACH ROW
  EXECUTE FUNCTION public._trigger_broadcast_expired_to_sem_profissional();

-- ────────────────────────────────────────────────────────────
-- 3. Rescue function: reativa broadcasts 'sem_profissional' prontos
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fixr_dispatch_rescue_tick()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broadcast RECORD;
  v_processed INT := 0;
BEGIN
  FOR v_broadcast IN
    SELECT id
    FROM public.broadcast_requests
    WHERE status       = 'sem_profissional'
      AND retry_after IS NOT NULL
      AND retry_after <= now()
      AND retry_count  < max_retries
    ORDER BY retry_after ASC
    LIMIT 100
  LOOP
    UPDATE public.broadcast_requests
    SET status        = 'dispatching',
        current_round = 1,
        retry_count   = retry_count + 1,
        retry_after   = NULL,
        updated_at    = now()
    WHERE id = v_broadcast.id;

    PERFORM public.dispatch_broadcast_request(v_broadcast.id);
    v_processed := v_processed + 1;
  END LOOP;

  RETURN v_processed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fixr_dispatch_rescue_tick() TO service_role;

-- ────────────────────────────────────────────────────────────
-- 4. pg_cron: roda rescue a cada 5 min
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fixr_dispatch_rescue_tick') THEN
      PERFORM cron.unschedule('fixr_dispatch_rescue_tick');
    END IF;

    PERFORM cron.schedule(
      'fixr_dispatch_rescue_tick',
      '*/5 * * * *',
      'SELECT public.fixr_dispatch_rescue_tick();'
    );
  END IF;
END $$;
