-- Operational observability and audit trail for critical flows.

CREATE TABLE IF NOT EXISTS operational_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL CHECK (domain IN ('PAYMENTS', 'OAUTH', 'TRIP_ACCEPTANCE', 'ADMIN')),
  action text NOT NULL,
  status text NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'REJECTED')),
  entity_id uuid,
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_events_domain_created_at
  ON operational_events(domain, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_events_entity_created_at
  ON operational_events(entity_id, created_at DESC);

ALTER TABLE operational_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins can view operational events"
  ON operational_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users au
      WHERE au.user_id = auth.uid()
    )
  );

REVOKE ALL ON operational_events FROM anon;

CREATE OR REPLACE FUNCTION public.log_operational_event(
  p_domain text,
  p_action text,
  p_status text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF p_domain NOT IN ('PAYMENTS', 'OAUTH', 'TRIP_ACCEPTANCE', 'ADMIN') THEN
    RAISE EXCEPTION 'Invalid domain';
  END IF;

  IF p_status NOT IN ('SUCCESS', 'FAILED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  INSERT INTO operational_events (
    domain,
    action,
    status,
    entity_id,
    actor_user_id,
    metadata
  ) VALUES (
    p_domain,
    p_action,
    p_status,
    p_entity_id,
    auth.uid(),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_operational_event(text, text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_operational_event(text, text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_operational_event(text, text, text, uuid, jsonb) TO service_role;
