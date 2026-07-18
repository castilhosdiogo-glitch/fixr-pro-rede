-- ============================================================
-- 043_rls_hardening_audit.sql
-- Fixes da auditoria de RLS em prod (2026-07-18):
--
--   1. mei_limit_logs SEM RLS — única tabela com rowsecurity=false.
--      Veio da era prisma (prisma/migrations/016): em prod só o
--      CREATE TABLE rodou, o ENABLE RLS não. Expunha faturamento
--      do pro pra anon. [JÁ APLICADO em prod em 2026-07-18]
--
--   2. notifications INSERT WITH CHECK (true) — qualquer autenticado
--      inseria notificação pra QUALQUER user_id com conteúdo
--      arbitrário (phishing in-app). Todos os inserters legítimos
--      são SECURITY DEFINER (_notify_on_service_change,
--      _on_kyc_status_change, reengagement_tick, schedule_service)
--      e bypassam RLS — policy aberta era desnecessária.
--
--   3. referral_codes rc_public USING (true) — enumeração de todos
--      os códigos + user_ids. Lookup no signup passa a ser via RPC.
--
--   4. referrals ref_insert WITH CHECK (true) — qualquer autenticado
--      inseria referral arbitrário (fraude de recompensa). Insert
--      legítimo é só via apply_referral (SECURITY DEFINER, 008).
--
-- Pendente pra migration futura (maior, quebra front se isolado):
--   professional_profiles/profiles SELECT público expõe lat/lng,
--   cnpj, phone — precisa view pública + refactor de SearchPage/
--   ProfessionalProfile. Ver memory security_ship_freeze.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. mei_limit_logs (aplicado em prod 2026-07-18; aqui pra registro)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.mei_limit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário pode ver seus logs de limite MEI" ON public.mei_limit_logs;
DROP POLICY IF EXISTS mei_limit_logs_own_read  ON public.mei_limit_logs;
DROP POLICY IF EXISTS mei_limit_logs_admin_read ON public.mei_limit_logs;

CREATE POLICY mei_limit_logs_own_read ON public.mei_limit_logs
  FOR SELECT USING (profissional_id = auth.uid());

CREATE POLICY mei_limit_logs_admin_read ON public.mei_limit_logs
  FOR SELECT USING (has_role('admin'::app_role, auth.uid()));

-- Escrita: só edge function mei-limit-check (service role bypassa RLS).

-- ────────────────────────────────────────────────────────────
-- 2. notifications: fecha INSERT aberto
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "system inserts notifications" ON public.notifications;

-- Sem policy de INSERT de propósito: triggers SECURITY DEFINER e
-- service role bypassam RLS; cliente nunca insere notificação direto.

-- ────────────────────────────────────────────────────────────
-- 3. referral_codes: remove leitura pública
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS rc_public ON public.referral_codes;

-- Lookup de código no signup vira RPC: valida sem expor a tabela.
CREATE OR REPLACE FUNCTION public.check_referral_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn_check_referral_code$
  SELECT EXISTS (
    SELECT 1 FROM public.referral_codes
    WHERE UPPER(code) = UPPER(TRIM(p_code))
  );
$fn_check_referral_code$;

GRANT EXECUTE ON FUNCTION public.check_referral_code(TEXT) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 4. referrals: fecha INSERT aberto
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS ref_insert ON public.referrals;

-- Insert legítimo só via apply_referral (SECURITY DEFINER, migration 008).

-- ────────────────────────────────────────────────────────────
-- 5. Verificação
-- ────────────────────────────────────────────────────────────

-- (a) Nenhuma tabela sem RLS: deve retornar 0 rows
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

-- (b) Policies abertas de INSERT que sobraram: deve retornar 0 rows
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'INSERT'
  AND with_check = 'true'
  AND tablename NOT IN ('user_ip_log', 'referral_attempt_log');
