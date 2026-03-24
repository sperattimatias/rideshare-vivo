/*
  # Add Driver OAuth Tokens Table

  1. New Table
    - `driver_oauth_tokens`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, FK to drivers) - Driver who owns the token
      - `mp_user_id` (text) - Mercado Pago User ID
      - `access_token` (text) - OAuth access token (encrypted/sensitive)
      - `refresh_token` (text) - OAuth refresh token (encrypted/sensitive)
      - `token_type` (text) - Token type (usually 'Bearer')
      - `expires_at` (timestamptz) - When the access token expires
      - `scope` (text) - OAuth scopes granted
      - `public_key` (text) - MP public key
      - `is_active` (boolean) - If token is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `revoked_at` (timestamptz) - When token was revoked

  2. Security
    - Enable RLS on `driver_oauth_tokens` table
    - Drivers can only view their own tokens
    - Admins can view all tokens
    - Edge functions can access via service role

  3. Notes
    - Tokens are stored securely and used for split payments
    - When token expires, driver needs to re-authorize
    - Access token is used to create payments on behalf of driver
*/

CREATE TABLE IF NOT EXISTS driver_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  mp_user_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  token_type text DEFAULT 'Bearer',
  expires_at timestamptz NOT NULL,
  scope text,
  public_key text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(driver_id, is_active)
);

ALTER TABLE driver_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own OAuth tokens"
  ON driver_oauth_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_oauth_tokens.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all OAuth tokens"
  ON driver_oauth_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Only system can insert OAuth tokens"
  ON driver_oauth_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Only system can update OAuth tokens"
  ON driver_oauth_tokens
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Only system can delete OAuth tokens"
  ON driver_oauth_tokens
  FOR DELETE
  TO authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS idx_driver_oauth_tokens_driver_id ON driver_oauth_tokens(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_oauth_tokens_mp_user_id ON driver_oauth_tokens(mp_user_id);
CREATE INDEX IF NOT EXISTS idx_driver_oauth_tokens_is_active ON driver_oauth_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_driver_oauth_tokens_expires_at ON driver_oauth_tokens(expires_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'mp_oauth_status'
  ) THEN
    ALTER TABLE drivers ADD COLUMN mp_oauth_status text DEFAULT 'PENDING' CHECK (mp_oauth_status IN ('PENDING', 'AUTHORIZED', 'EXPIRED', 'REVOKED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'mp_oauth_connected_at'
  ) THEN
    ALTER TABLE drivers ADD COLUMN mp_oauth_connected_at timestamptz;
  END IF;
END $$;
