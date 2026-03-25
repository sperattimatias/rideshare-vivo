/*
  # Add Mercado Pago OAuth Sessions Table

  Stores one-time OAuth state sessions to prevent CSRF/replay and enforce
  strict callback validation.
*/

CREATE TABLE IF NOT EXISTS mp_oauth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL UNIQUE,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE mp_oauth_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can select OAuth sessions"
  ON mp_oauth_sessions
  FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "Only system can insert OAuth sessions"
  ON mp_oauth_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Only system can update OAuth sessions"
  ON mp_oauth_sessions
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Only system can delete OAuth sessions"
  ON mp_oauth_sessions
  FOR DELETE
  TO authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS idx_mp_oauth_sessions_driver_id ON mp_oauth_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_mp_oauth_sessions_user_id ON mp_oauth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_oauth_sessions_expires_at ON mp_oauth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_mp_oauth_sessions_consumed_at ON mp_oauth_sessions(consumed_at);
