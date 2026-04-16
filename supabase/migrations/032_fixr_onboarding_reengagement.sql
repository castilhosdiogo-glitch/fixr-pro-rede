-- ============================================================
-- 032_fixr_onboarding_reengagement.sql
-- Tacada 4 — reengajamento de usuários com onboarding incompleto
--
-- Marcos:
--   • 24h sem terminar  → "Quase lá! Termine seu cadastro"
--   • 72h sem terminar  → "Pros Fixr Select faturam até R$ 2.400/mês"
--   • 7d  sem terminar  → "Última chamada — seu perfil será removido em breve"
--
-- Cada marco cria UMA notificação por usuário (dedup por type).
-- O NotificationBell e o service worker push cuidam da entrega.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Função tick: percorre usuários e cria notificações
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fixr_onboarding_reengagement_tick()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count_24h INT := 0;
  v_count_72h INT := 0;
  v_count_7d  INT := 0;
BEGIN
  -- ── PROS: 24h ──
  WITH candidates AS (
    SELECT pp.user_id
      FROM professional_profiles pp
     WHERE COALESCE(pp.onboarding_completo, false) = false
       AND pp.created_at BETWEEN now() - INTERVAL '49 hours' AND now() - INTERVAL '24 hours'
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
          WHERE n.user_id = pp.user_id
            AND n.type    = 'onboarding_reengagement_24h'
       )
  ), ins AS (
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT
      c.user_id,
      'onboarding_reengagement_24h',
      'Quase lá! Termine seu cadastro',
      'Falta pouco para você começar a receber pedidos na Fixr. Volte ao onboarding e finalize seu perfil.',
      jsonb_build_object('url', '/onboarding-pro', 'milestone', '24h')
    FROM candidates c
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count_24h FROM ins;

  -- ── PROS: 72h ──
  WITH candidates AS (
    SELECT pp.user_id
      FROM professional_profiles pp
     WHERE COALESCE(pp.onboarding_completo, false) = false
       AND pp.created_at BETWEEN now() - INTERVAL '97 hours' AND now() - INTERVAL '72 hours'
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
          WHERE n.user_id = pp.user_id
            AND n.type    = 'onboarding_reengagement_72h'
       )
  ), ins AS (
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT
      c.user_id,
      'onboarding_reengagement_72h',
      'Pros Fixr Select faturam mais',
      'Profissionais Select na sua categoria faturam até R$ 2.400/mês. Complete seu cadastro e comece a receber pedidos agora.',
      jsonb_build_object('url', '/onboarding-pro', 'milestone', '72h')
    FROM candidates c
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count_72h FROM ins;

  -- ── PROS + CLIENTES: 7d (última chamada) ──
  WITH candidates AS (
    SELECT pp.user_id
      FROM professional_profiles pp
     WHERE COALESCE(pp.onboarding_completo, false) = false
       AND pp.created_at BETWEEN now() - INTERVAL '8 days' AND now() - INTERVAL '7 days'
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
          WHERE n.user_id = pp.user_id
            AND n.type    = 'onboarding_reengagement_7d'
       )
    UNION
    SELECT p.user_id
      FROM profiles p
     WHERE p.user_type = 'client'
       AND (p.endereco_principal IS NULL OR LENGTH(TRIM(p.endereco_principal)) = 0)
       AND p.created_at BETWEEN now() - INTERVAL '8 days' AND now() - INTERVAL '7 days'
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
          WHERE n.user_id = p.user_id
            AND n.type    = 'onboarding_reengagement_7d'
       )
  ), ins AS (
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT
      c.user_id,
      'onboarding_reengagement_7d',
      'Última chamada — termine seu cadastro',
      'Sua conta Fixr ainda não está ativa. Conclua seu cadastro para não perder acesso ao app.',
      jsonb_build_object('url', '/', 'milestone', '7d')
    FROM candidates c
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count_7d FROM ins;

  RETURN jsonb_build_object(
    'reengagement_24h', v_count_24h,
    'reengagement_72h', v_count_72h,
    'reengagement_7d',  v_count_7d,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.fixr_onboarding_reengagement_tick() IS
  'Cria notificações de reengajamento para usuários com onboarding incompleto. Idempotente (dedup por type).';

-- ────────────────────────────────────────────────────────────
-- 2. Agendamento: de hora em hora
-- ────────────────────────────────────────────────────────────

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove agendamento anterior (idempotente)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fixr_onboarding_reengagement_hourly') THEN
      PERFORM cron.unschedule('fixr_onboarding_reengagement_hourly');
    END IF;

    PERFORM cron.schedule(
      'fixr_onboarding_reengagement_hourly',
      '5 * * * *',  -- 5 min past every hour
      $cron$ SELECT public.fixr_onboarding_reengagement_tick(); $cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron not enabled — habilite via Dashboard e rode este bloco novamente.';
  END IF;
END $outer$;
