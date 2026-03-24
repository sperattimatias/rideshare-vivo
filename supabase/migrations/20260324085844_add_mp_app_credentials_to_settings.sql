/*
  # Add Mercado Pago App Credentials to System Settings

  1. New Settings
    - `mp_app_id` - Mercado Pago Application ID for OAuth
    - `mp_client_secret` - Mercado Pago Client Secret for OAuth token exchange

  2. Notes
    - These credentials are needed for OAuth 2.0 flow
    - Drivers will connect their MP accounts using OAuth
    - Tokens are stored in driver_oauth_tokens table
*/

INSERT INTO system_settings (key, value, description, is_sensitive, category) VALUES
  ('mp_app_id', '', 'Mercado Pago Application ID (para OAuth)', false, 'payment'),
  ('mp_client_secret', '', 'Mercado Pago Client Secret (para OAuth)', true, 'payment')
ON CONFLICT (key) DO NOTHING;
