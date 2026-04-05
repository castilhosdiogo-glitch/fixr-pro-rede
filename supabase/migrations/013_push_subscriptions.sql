-- 013_push_subscriptions.sql
-- Web Push subscription storage + dispatch push trigger

-- ── Table ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_own_manage ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Trigger: notify professional on new dispatch ───────────────────────────
-- Uses pg_net to call the edge function asynchronously.
-- The edge function URL uses the project ref from the environment.
CREATE OR REPLACE FUNCTION public._notify_dispatch_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_edge_url text;
BEGIN
  -- Build edge function URL (project ref is embedded as a constant)
  v_edge_url := 'https://hoymfqveawkomiixtvpw.supabase.co/functions/v1/push-notify';

  PERFORM net.http_post(
    url     := v_edge_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
               ),
    body    := jsonb_build_object(
                 'user_id',     NEW.professional_id,
                 'title',       'Nova solicitação chegou!',
                 'body',        'Você tem 5 minutos para aceitar. Abra o app agora.',
                 'dispatch_id', NEW.id
               )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_dispatch_push ON public.request_dispatches;
CREATE TRIGGER trg_notify_dispatch_push
  AFTER INSERT ON public.request_dispatches
  FOR EACH ROW
  EXECUTE FUNCTION public._notify_dispatch_push();
