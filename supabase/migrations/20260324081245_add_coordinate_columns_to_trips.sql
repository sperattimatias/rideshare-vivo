/*
  # Add coordinate columns to trips table

  1. Changes
    - Add `origin_latitude` column (numeric, nullable)
    - Add `origin_longitude` column (numeric, nullable)
    - Add `destination_latitude` column (numeric, nullable)
    - Add `destination_longitude` column (numeric, nullable)
    - Migrate existing geography data to new coordinate columns
    - Add check constraints for valid coordinate ranges

  2. Notes
    - The existing `origin_location` and `destination_location` columns (geography type) will remain
    - New numeric columns allow direct coordinate access without PostGIS functions
    - Migration extracts lat/lon from existing geography points where they exist
    - Coordinates validated: latitude [-90, 90], longitude [-180, 180]
*/

-- Add coordinate columns to trips table
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS origin_latitude numeric,
  ADD COLUMN IF NOT EXISTS origin_longitude numeric,
  ADD COLUMN IF NOT EXISTS destination_latitude numeric,
  ADD COLUMN IF NOT EXISTS destination_longitude numeric;

-- Add check constraints for valid coordinate ranges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trips_origin_latitude_check'
  ) THEN
    ALTER TABLE trips ADD CONSTRAINT trips_origin_latitude_check 
      CHECK (origin_latitude IS NULL OR (origin_latitude >= -90 AND origin_latitude <= 90));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trips_origin_longitude_check'
  ) THEN
    ALTER TABLE trips ADD CONSTRAINT trips_origin_longitude_check 
      CHECK (origin_longitude IS NULL OR (origin_longitude >= -180 AND origin_longitude <= 180));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trips_destination_latitude_check'
  ) THEN
    ALTER TABLE trips ADD CONSTRAINT trips_destination_latitude_check 
      CHECK (destination_latitude IS NULL OR (destination_latitude >= -90 AND destination_latitude <= 90));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trips_destination_longitude_check'
  ) THEN
    ALTER TABLE trips ADD CONSTRAINT trips_destination_longitude_check 
      CHECK (destination_longitude IS NULL OR (destination_longitude >= -180 AND destination_longitude <= 180));
  END IF;
END $$;

-- Migrate existing geography data to numeric columns
UPDATE trips
SET 
  origin_latitude = ST_Y(origin_location::geometry),
  origin_longitude = ST_X(origin_location::geometry)
WHERE origin_location IS NOT NULL
  AND origin_latitude IS NULL;

UPDATE trips
SET 
  destination_latitude = ST_Y(destination_location::geometry),
  destination_longitude = ST_X(destination_location::geometry)
WHERE destination_location IS NOT NULL
  AND destination_latitude IS NULL;

-- Create trigger to sync geography columns when coordinate columns are updated
CREATE OR REPLACE FUNCTION sync_trip_geography_from_coordinates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update origin_location if origin coordinates are provided
  IF NEW.origin_latitude IS NOT NULL AND NEW.origin_longitude IS NOT NULL THEN
    NEW.origin_location = ST_SetSRID(ST_MakePoint(NEW.origin_longitude, NEW.origin_latitude), 4326)::geography;
  END IF;

  -- Update destination_location if destination coordinates are provided
  IF NEW.destination_latitude IS NOT NULL AND NEW.destination_longitude IS NOT NULL THEN
    NEW.destination_location = ST_SetSRID(ST_MakePoint(NEW.destination_longitude, NEW.destination_latitude), 4326)::geography;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_trip_geography_trigger ON trips;

CREATE TRIGGER sync_trip_geography_trigger
  BEFORE INSERT OR UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION sync_trip_geography_from_coordinates();
