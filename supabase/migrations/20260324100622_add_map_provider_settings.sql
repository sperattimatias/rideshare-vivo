/*
  # Add Map Provider Configuration

  1. Changes
    - Add map provider settings to system_settings table
    - Support for multiple map providers (OpenStreetMap, Mapbox, Google Maps)
    - Separate settings for passenger and driver apps

  2. New Columns
    - `passenger_map_provider` (text) - Map provider for passenger app
    - `driver_map_provider` (text) - Map provider for driver app
    - `admin_map_provider` (text) - Map provider for admin panel

  3. Default Values
    - All providers default to 'openstreetmap'
    - Can be changed to 'mapbox' or 'googlemaps' later
*/

DO $$
BEGIN
  -- Add passenger map provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_settings' AND column_name = 'passenger_map_provider'
  ) THEN
    ALTER TABLE system_settings
    ADD COLUMN passenger_map_provider text DEFAULT 'openstreetmap' CHECK (passenger_map_provider IN ('openstreetmap', 'mapbox', 'googlemaps'));
  END IF;

  -- Add driver map provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_settings' AND column_name = 'driver_map_provider'
  ) THEN
    ALTER TABLE system_settings
    ADD COLUMN driver_map_provider text DEFAULT 'openstreetmap' CHECK (driver_map_provider IN ('openstreetmap', 'mapbox', 'googlemaps'));
  END IF;

  -- Add admin map provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_settings' AND column_name = 'admin_map_provider'
  ) THEN
    ALTER TABLE system_settings
    ADD COLUMN admin_map_provider text DEFAULT 'openstreetmap' CHECK (admin_map_provider IN ('openstreetmap', 'mapbox', 'googlemaps'));
  END IF;
END $$;

-- Update existing record to have default values
UPDATE system_settings
SET
  passenger_map_provider = COALESCE(passenger_map_provider, 'openstreetmap'),
  driver_map_provider = COALESCE(driver_map_provider, 'openstreetmap'),
  admin_map_provider = COALESCE(admin_map_provider, 'openstreetmap')
WHERE id IS NOT NULL;
