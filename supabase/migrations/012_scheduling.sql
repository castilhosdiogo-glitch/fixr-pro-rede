-- 012_scheduling.sql
-- Adds scheduling: professional proposes a date/time → service status → 'scheduled'
-- Client is notified with the proposed date.

-- ── schedule_service RPC ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.schedule_service(
  p_request_id   uuid,
  p_scheduled_date timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_id        uuid;
  v_professional_id  uuid;
  v_description      text;
  v_current_status   text;
BEGIN
  -- Fetch and lock the row
  SELECT client_id, professional_id, description, status
    INTO v_client_id, v_professional_id, v_description, v_current_status
    FROM service_requests
   WHERE id = p_request_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'service_request not found';
  END IF;

  -- Only the assigned professional can schedule
  IF v_professional_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Only accepted services can be scheduled
  IF v_current_status NOT IN ('accepted', 'scheduled') THEN
    RAISE EXCEPTION 'invalid_status: %', v_current_status;
  END IF;

  -- Update the service request
  UPDATE service_requests
     SET status         = 'scheduled',
         scheduled_date = p_scheduled_date,
         updated_at     = now()
   WHERE id = p_request_id;

  -- Notify the client
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_client_id,
    'general',
    'Serviço Agendado',
    'Seu serviço foi agendado para ' ||
      to_char(p_scheduled_date AT TIME ZONE 'America/Sao_Paulo',
              'DD/MM/YYYY "às" HH24:MI') || '.',
    jsonb_build_object(
      'service_request_id', p_request_id,
      'scheduled_date',     p_scheduled_date
    )
  );
END;
$$;
