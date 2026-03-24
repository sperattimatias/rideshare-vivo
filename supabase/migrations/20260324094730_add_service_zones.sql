/*
  # Add Service Zones Management

  1. New Tables
    - `service_zones`
      - `id` (uuid, primary key)
      - `name` (text) - Zone name (e.g., "Centro", "Zona Norte")
      - `description` (text) - Zone description
      - `is_active` (boolean) - Whether zone is currently active
      - `boundary_points` (jsonb) - Array of {lat, lon} coordinates defining polygon
      - `center_lat` (numeric) - Center latitude for display
      - `center_lon` (numeric) - Center longitude for display
      - `pricing_rule_id` (uuid) - Optional custom pricing for this zone
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `service_zones` table
    - Admins can manage zones
    - Authenticated users can read active zones
    - Public users can read active zones for service area display

  3. Notes
    - Zones are defined by polygon boundaries
    - Multiple zones can overlap
    - Zones can have custom pricing rules
    - Used to validate trip requests are within service area
*/

CREATE TABLE IF NOT EXISTS service_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  boundary_points jsonb NOT NULL,
  center_lat numeric(10, 7) NOT NULL,
  center_lon numeric(10, 7) NOT NULL,
  pricing_rule_id uuid REFERENCES pricing_rules(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active service zones"
  ON service_zones FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all service zones"
  ON service_zones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert service zones"
  ON service_zones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update service zones"
  ON service_zones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete service zones"
  ON service_zones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_service_zones_active ON service_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_service_zones_pricing ON service_zones(pricing_rule_id);
