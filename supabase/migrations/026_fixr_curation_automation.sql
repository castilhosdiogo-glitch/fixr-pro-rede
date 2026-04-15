-- ============================================================
-- 026_fixr_curation_automation.sql
-- Tacada 2: automação do sistema de curadoria
--
-- • Triggers reativos (reviews, service_requests, disputes)
-- • Rebaixamentos imediatos (3 cancels/7d, 3 avaliações <3★)
-- • Suspensão Fixr Select por disputa perdida acima de R$ 500
-- • Bloqueio temporário de novos pedidos (48h)
-- • pg_cron noturno às 02:00 recalculando todos
-- • Eventos registrados em curation_events (para admin + notificações)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Colunas extras
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS bloqueado_ate            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS select_suspendido_ate    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nivel_manual_override    BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.professional_profiles.bloqueado_ate IS
  'Se > now(): pro não aparece na busca nem aceita pedidos (48h por 3 cancels).';
COMMENT ON COLUMN public.professional_profiles.select_suspendido_ate IS
  'Select suspenso temporariamente (disputa grave). Revisão manual obrigatória.';
COMMENT ON COLUMN public.professional_profiles.nivel_manual_override IS
  'Admin setou nivel manualmente; recalc não mexe enquanto true.';

-- ────────────────────────────────────────────────────────────
-- 2. curation_events — log de decisões automáticas/manuais
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.curation_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type            TEXT NOT NULL,  -- level_up, level_down, select_granted, select_lost,
                                        -- select_suspended, blocked_48h, consecutive_bad_reviews,
                                        -- too_many_cancels, dispute_lost_high_value
  severity              TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','warning','critical')),
  from_nivel            TEXT,
  to_nivel              TEXT,
  reason                TEXT,
  payload               JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notified              BOOLEAN NOT NULL DEFAULT false,
  admin_reviewed        BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_curation_events_pro
  ON public.curation_events (professional_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_curation_events_unreviewed
  ON public.curation_events (admin_reviewed, severity, created_at DESC)
  WHERE admin_reviewed = false;

ALTER TABLE public.curation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pro reads own events" ON public.curation_events;
CREATE POLICY "Pro reads own events" ON public.curation_events
  FOR SELECT USING (auth.uid() = professional_user_id);

DROP POLICY IF EXISTS "Admin reads events" ON public.curation_events;
CREATE POLICY "Admin reads events" ON public.curation_events
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin marks reviewed" ON public.curation_events;
CREATE POLICY "Admin marks reviewed" ON public.curation_events
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- ────────────────────────────────────────────────────────────
-- 3. Wrapper: recalcular e emitir evento se nivel mudou
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._fixr_nivel_rank(_n TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _n
    WHEN 'fixr_select'     THEN 4
    WHEN 'fixr_parceiro'   THEN 3
    WHEN 'fixr_explorador' THEN 2
    WHEN 'fixr_restrito'   THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.fixr_recalc_and_emit(
  _professional_user_id UUID,
  _reason               TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_nivel   TEXT;
  v_new_nivel   TEXT;
  v_old_score   NUMERIC;
  v_new_score   NUMERIC;
  v_manual      BOOLEAN;
BEGIN
  SELECT nivel_curadoria, fixr_score, COALESCE(nivel_manual_override, false)
    INTO v_old_nivel, v_old_score, v_manual
    FROM public.professional_profiles
   WHERE user_id = _professional_user_id;

  IF v_manual THEN
    -- admin setou manualmente; não recalcula nível
    RETURN;
  END IF;

  PERFORM public.recalculate_fixr_score(_professional_user_id, _reason);

  SELECT nivel_curadoria, fixr_score
    INTO v_new_nivel, v_new_score
    FROM public.professional_profiles
   WHERE user_id = _professional_user_id;

  IF v_old_nivel IS DISTINCT FROM v_new_nivel THEN
    INSERT INTO public.curation_events (
      professional_user_id, event_type, severity,
      from_nivel, to_nivel, reason, payload
    ) VALUES (
      _professional_user_id,
      CASE
        WHEN v_new_nivel = 'fixr_select' THEN 'select_granted'
        WHEN v_old_nivel = 'fixr_select' AND v_new_nivel <> 'fixr_select' THEN 'select_lost'
        WHEN v_new_nivel = 'fixr_restrito' THEN 'level_restrito'
        WHEN public._fixr_nivel_rank(v_new_nivel) > public._fixr_nivel_rank(v_old_nivel) THEN 'level_up'
        ELSE 'level_down'
      END,
      CASE
        WHEN v_new_nivel = 'fixr_restrito' THEN 'critical'
        WHEN v_old_nivel = 'fixr_select' THEN 'warning'
        ELSE 'info'
      END,
      v_old_nivel, v_new_nivel, _reason,
      jsonb_build_object('old_score', v_old_score, 'new_score', v_new_score)
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fixr_recalc_and_emit(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fixr_recalc_and_emit(UUID, TEXT) TO service_role;

-- ────────────────────────────────────────────────────────────
-- 4. Triggers reativos
-- ────────────────────────────────────────────────────────────

-- Review inserida ou alterada
CREATE OR REPLACE FUNCTION public._fixr_trg_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.fixr_recalc_and_emit(NEW.professional_id, 'review_change');
  PERFORM public._fixr_check_consecutive_bad(NEW.professional_id);
  RETURN NEW;
END;
$$;

-- Service request concluído ou cancelado
CREATE OR REPLACE FUNCTION public._fixr_trg_service()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('completed','cancelled')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.fixr_recalc_and_emit(NEW.professional_id, 'service_' || NEW.status);
    IF NEW.status = 'cancelled' THEN
      PERFORM public._fixr_check_cancel_streak(NEW.professional_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Disputa resolvida
CREATE OR REPLACE FUNCTION public._fixr_trg_dispute()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pro_id UUID;
  v_amount_cents INTEGER;
BEGIN
  IF NEW.status = 'resolved_client'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'resolved_client') THEN
    SELECT sr.professional_id INTO v_pro_id
      FROM public.service_requests sr WHERE sr.id = NEW.service_request_id;
    IF v_pro_id IS NULL THEN RETURN NEW; END IF;

    PERFORM public.fixr_recalc_and_emit(v_pro_id, 'dispute_lost');

    -- Valor da disputa: pega payment associado, se existir
    BEGIN
      SELECT amount_paid_cents INTO v_amount_cents
        FROM public.payments
       WHERE service_request_id = NEW.service_request_id
       ORDER BY created_at DESC LIMIT 1;
    EXCEPTION WHEN undefined_table THEN
      v_amount_cents := NULL;
    END;

    IF COALESCE(v_amount_cents, 0) >= 50000 THEN
      -- Disputa > R$ 500: suspende Select imediatamente
      UPDATE public.professional_profiles
         SET select_suspendido_ate = now() + INTERVAL '30 days',
             nivel_curadoria       = CASE
               WHEN nivel_curadoria = 'fixr_select' THEN 'fixr_parceiro'
               ELSE nivel_curadoria
             END
       WHERE user_id = v_pro_id;

      INSERT INTO public.curation_events (
        professional_user_id, event_type, severity, reason, payload
      ) VALUES (
        v_pro_id, 'dispute_lost_high_value', 'critical',
        'Disputa perdida com valor >= R$ 500',
        jsonb_build_object('dispute_id', NEW.id, 'amount_cents', v_amount_cents)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fixr_review ON public.reviews;
CREATE TRIGGER trg_fixr_review
  AFTER INSERT OR UPDATE OF rating ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public._fixr_trg_review();

DROP TRIGGER IF EXISTS trg_fixr_service ON public.service_requests;
CREATE TRIGGER trg_fixr_service
  AFTER INSERT OR UPDATE OF status ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public._fixr_trg_service();

DROP TRIGGER IF EXISTS trg_fixr_dispute ON public.disputes;
CREATE TRIGGER trg_fixr_dispute
  AFTER INSERT OR UPDATE OF status ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public._fixr_trg_dispute();

-- ────────────────────────────────────────────────────────────
-- 5. Detectores de padrão crítico
-- ────────────────────────────────────────────────────────────

-- 3 cancels em 7 dias → fixr_restrito + bloqueio 48h
CREATE OR REPLACE FUNCTION public._fixr_check_cancel_streak(_pro UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_cancels INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_recent_cancels
    FROM public.service_requests
   WHERE professional_id = _pro
     AND status = 'cancelled'
     AND updated_at >= (now() - INTERVAL '7 days');

  IF v_recent_cancels >= 3 THEN
    UPDATE public.professional_profiles
       SET nivel_curadoria = 'fixr_restrito',
           bloqueado_ate   = now() + INTERVAL '48 hours'
     WHERE user_id = _pro
       AND nivel_manual_override = false;

    INSERT INTO public.curation_events (
      professional_user_id, event_type, severity, to_nivel, reason, payload
    ) VALUES (
      _pro, 'too_many_cancels', 'critical', 'fixr_restrito',
      '3 cancelamentos em 7 dias',
      jsonb_build_object('cancels_7d', v_recent_cancels,
                         'bloqueado_ate', (now() + INTERVAL '48 hours'))
    );
  END IF;
END;
$$;

-- 3 avaliações <3★ consecutivas → fixr_restrito + alerta
CREATE OR REPLACE FUNCTION public._fixr_check_consecutive_bad(_pro UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last3_ratings INTEGER[];
BEGIN
  SELECT ARRAY_AGG(rating ORDER BY created_at DESC)
    INTO v_last3_ratings
    FROM (
      SELECT rating, created_at
        FROM public.reviews
       WHERE professional_id = _pro
       ORDER BY created_at DESC
       LIMIT 3
    ) r;

  IF COALESCE(array_length(v_last3_ratings, 1), 0) = 3
     AND v_last3_ratings[1] < 3
     AND v_last3_ratings[2] < 3
     AND v_last3_ratings[3] < 3 THEN
    UPDATE public.professional_profiles
       SET nivel_curadoria = 'fixr_restrito'
     WHERE user_id = _pro
       AND nivel_manual_override = false;

    INSERT INTO public.curation_events (
      professional_user_id, event_type, severity, to_nivel, reason, payload
    ) VALUES (
      _pro, 'consecutive_bad_reviews', 'critical', 'fixr_restrito',
      '3 avaliações consecutivas abaixo de 3★',
      jsonb_build_object('last3', v_last3_ratings)
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._fixr_check_cancel_streak(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._fixr_check_consecutive_bad(UUID) FROM PUBLIC;

-- ────────────────────────────────────────────────────────────
-- 6. pg_cron job diário às 02:00
--
-- Requer extensão pg_cron habilitada no Supabase Dashboard.
-- Se a extensão não estiver disponível, este bloco é ignorado
-- silenciosamente e o recalc pode ser disparado externamente.
-- ────────────────────────────────────────────────────────────

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('fixr_daily_recalc');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- job não existia
    END;
    PERFORM cron.schedule(
      'fixr_daily_recalc',
      '0 2 * * *',
      'SELECT public.recalculate_all_fixr_scores();'
    );
  ELSE
    RAISE NOTICE 'pg_cron not enabled — enable via Dashboard and re-run this migration block';
  END IF;
END
$outer$;
