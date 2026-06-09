-- ============================================================
-- 038_push_notify_hardening.sql
-- Conserta 3 problemas descobertos no smoke test de 2026-04-16:
--
--   1. pg_net não estava habilitado → dispatch_broadcast_request
--      falhava com "schema net does not exist".
--
--   2. Função _notify_dispatch_push em PROD tinha um JWT service_role
--      HARDCODED (divergência do repo). Precisa ser rotacionado.
--
--   3. Falha da edge function push-notify bloqueava o dispatch.
--      Agora tudo vai em EXCEPTION → dispatch insere mesmo se push
--      falhar (logs no net._http_response).
--
-- SECRETS: usa Supabase Vault (Supabase bloqueia custom GUCs via
-- ALTER DATABASE/ROLE no SQL editor). A key service_role fica
-- criptografada em vault.secrets; a função lê via vault.decrypted_secrets.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Extensões
-- ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- ────────────────────────────────────────────────────────────
-- 2. Re-cria _notify_dispatch_push sem hardcode + fail-safe
--
--   - JWT vem de vault.decrypted_secrets (name='service_role_key').
--     Se não existir, trigger retorna silencioso (dev / pré-setup).
--   - URL também via vault (name='functions_url'), com fallback.
--   - Todo bloco em EXCEPTION: dispatch nunca quebra por push.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._notify_dispatch_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt       TEXT;
  v_base_url  TEXT;
  v_edge_url  TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_jwt
      FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

    IF v_jwt IS NULL OR LENGTH(TRIM(v_jwt)) = 0 THEN
      RETURN NEW;
    END IF;

    SELECT decrypted_secret INTO v_base_url
      FROM vault.decrypted_secrets WHERE name = 'functions_url' LIMIT 1;

    IF v_base_url IS NULL OR LENGTH(TRIM(v_base_url)) = 0 THEN
      v_base_url := 'https://hoymfqveawkomiixtvpw.supabase.co/functions/v1';
    END IF;

    v_edge_url := v_base_url || '/push-notify';

    PERFORM net.http_post(
      url     := v_edge_url,
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Authorization', 'Bearer ' || v_jwt
                 ),
      body    := jsonb_build_object(
                   'user_id',     NEW.professional_id,
                   'title',       'Nova solicitação chegou!',
                   'body',        'Você tem 5 minutos para aceitar. Abra o app agora.',
                   'dispatch_id', NEW.id
                 )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public._notify_dispatch_push() IS
  'Chama edge function push-notify após INSERT em request_dispatches. Fail-safe: nunca bloqueia dispatch. Secrets via Supabase Vault (service_role_key + functions_url).';

-- ────────────────────────────────────────────────────────────
-- 3. Garante trigger (idempotente)
-- ────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_notify_dispatch_push ON public.request_dispatches;
CREATE TRIGGER trg_notify_dispatch_push
  AFTER INSERT ON public.request_dispatches
  FOR EACH ROW
  EXECUTE FUNCTION public._notify_dispatch_push();

-- ============================================================
-- PÓS-MIGRATION — AÇÕES MANUAIS (fora desse SQL):
--
--   A. No Dashboard → Settings → API Keys:
--      clica "Create new API Keys" → salva a nova `sb_secret_...`
--      (NÃO deleta a antiga ainda — só depois que tudo funcionar).
--
--   B. No Dashboard → Project Settings → Vault (ou SQL abaixo):
--      SELECT vault.create_secret('<NOVA_KEY>', 'service_role_key');
--      SELECT vault.create_secret(
--        'https://hoymfqveawkomiixtvpw.supabase.co/functions/v1',
--        'functions_url'
--      );
--
--   C. Rodar o smoke test geo_dispatch_smoke.sql
--      (se tudo verde, dispatch funciona sem bloquear push).
--
--   D. Confirmado funcionando → volta no Dashboard API Keys e
--      DELETA a key antiga (JWT `eyJ...`).
--
-- Pra atualizar a key depois (rotação futura):
--   SELECT vault.update_secret(
--     (SELECT id FROM vault.secrets WHERE name='service_role_key'),
--     '<NOVA_KEY>'
--   );
-- ============================================================
