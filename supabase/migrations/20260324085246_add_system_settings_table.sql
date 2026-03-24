/*
  # Add System Settings Table

  1. New Table
    - `system_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique) - Setting key identifier
      - `value` (text) - Setting value (encrypted for sensitive data)
      - `description` (text) - Human-readable description
      - `is_sensitive` (boolean) - If true, value is encrypted/hidden
      - `category` (text) - Category for grouping (payment, general, etc)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid) - Admin user who updated

  2. Security
    - Enable RLS on `system_settings` table
    - Only admins can read/write settings
    - Sensitive values are marked for special handling

  3. Initial Data
    - Insert default Mercado Pago configuration keys
*/

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text DEFAULT '',
  description text NOT NULL,
  is_sensitive boolean DEFAULT false,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES user_profiles(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view system settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Only admins can insert system settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Only admins can update system settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Only admins can delete system settings"
  ON system_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

INSERT INTO system_settings (key, value, description, is_sensitive, category) VALUES
  ('mp_access_token', '', 'Mercado Pago Access Token (TEST o PRODUCTION)', true, 'payment'),
  ('mp_platform_seller_id', '', 'Mercado Pago Platform Seller ID', false, 'payment'),
  ('mp_environment', 'test', 'Entorno de Mercado Pago (test o production)', false, 'payment'),
  ('platform_commission_percent', '20', 'Porcentaje de comisión de la plataforma', false, 'payment')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
