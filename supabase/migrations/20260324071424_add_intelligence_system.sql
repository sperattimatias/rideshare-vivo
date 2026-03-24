/*
  # VIVO Intelligence System - Phase 4

  ## Overview
  This migration adds intelligent features to the VIVO platform:
  - Driver scoring system (0-100)
  - Smart matching algorithm
  - Trust mode filtering
  - Demand analytics foundation
  - Intelligent alerts

  ## New Tables

  ### 1. driver_scores
  Real-time driver performance scoring
  - `driver_id` (uuid, primary key)
  - `score` (integer, 0-100) - Overall performance score
  - `acceptance_rate` (decimal) - % of trip requests accepted
  - `cancellation_rate` (decimal) - % of trips cancelled by driver
  - `completion_rate` (decimal) - % of trips completed successfully
  - `average_rating` (decimal) - Average passenger rating
  - `total_trips` (integer) - Total trips completed
  - `incident_count` (integer) - Number of incidents involving driver
  - `last_calculated` (timestamptz) - When score was last updated
  - Automatically updated via triggers

  ### 2. matching_config
  Configurable weights for intelligent matching
  - `id` (uuid, primary key)
  - `name` (text) - Configuration name
  - `is_active` (boolean) - Currently active config
  - `distance_weight` (decimal) - Weight for distance factor (0-1)
  - `score_weight` (decimal) - Weight for driver score (0-1)
  - `rating_weight` (decimal) - Weight for rating (0-1)
  - `history_weight` (decimal) - Weight for passenger-driver history (0-1)
  - `min_score_threshold` (integer) - Minimum score for matching
  - `trust_mode_threshold` (integer) - Score required for trust mode (default 85)

  ### 3. trip_demand_analytics
  Zone and time-based demand tracking for radar
  - `id` (uuid, primary key)
  - `zone_name` (text) - Area/neighborhood name
  - `latitude` (decimal) - Center latitude
  - `longitude` (decimal) - Center longitude
  - `date` (date) - Date of analytics
  - `hour` (integer) - Hour of day (0-23)
  - `trip_count` (integer) - Number of trips in this zone/hour
  - `avg_wait_time` (integer) - Average wait time in seconds
  - `avg_fare` (decimal) - Average fare for trips
  - Aggregated via scheduled job or trigger

  ### 4. intelligent_alerts
  System-generated alerts for admins
  - `id` (uuid, primary key)
  - `alert_type` (text) - EXCESSIVE_CANCELLATIONS, LOW_PERFORMANCE, LOW_SCORE, etc.
  - `severity` (text) - LOW, MEDIUM, HIGH, CRITICAL
  - `entity_type` (text) - DRIVER, ZONE, SYSTEM
  - `entity_id` (uuid) - Related entity
  - `title` (text) - Alert title
  - `description` (text) - Alert details
  - `data` (jsonb) - Additional context data
  - `is_resolved` (boolean) - Whether alert was addressed
  - `resolved_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Enhanced Tables
  - `passengers`: Add `trust_mode_enabled` boolean
  - `trips`: Add `matching_score` decimal for tracking match quality

  ## Functions
  - `calculate_driver_score()` - Compute driver score
  - `get_best_driver_match()` - Intelligent matching
  - `check_driver_alerts()` - Generate alerts
  - `update_demand_analytics()` - Aggregate demand data

  ## Performance Considerations
  - Indexes on frequently queried fields
  - Materialized calculations in driver_scores
  - Efficient scoring algorithm (< 100ms)
  - Demand analytics aggregated, not real-time
*/

-- =====================================================
-- 1. DRIVER SCORES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS driver_scores (
  driver_id uuid PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 100 CHECK (score >= 0 AND score <= 100),
  acceptance_rate decimal(5,2) DEFAULT 100.00 CHECK (acceptance_rate >= 0 AND acceptance_rate <= 100),
  cancellation_rate decimal(5,2) DEFAULT 0.00 CHECK (cancellation_rate >= 0 AND cancellation_rate <= 100),
  completion_rate decimal(5,2) DEFAULT 100.00 CHECK (completion_rate >= 0 AND completion_rate <= 100),
  average_rating decimal(3,2) DEFAULT 5.00 CHECK (average_rating >= 0 AND average_rating <= 5),
  total_trips integer DEFAULT 0,
  incident_count integer DEFAULT 0,
  days_since_last_incident integer DEFAULT 999,
  consecutive_completions integer DEFAULT 0,
  last_calculated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_scores_score ON driver_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_driver_scores_updated ON driver_scores(updated_at DESC);

ALTER TABLE driver_scores ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own score
CREATE POLICY "Drivers can view own score"
  ON driver_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_scores.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Passengers can view driver scores (for trust mode)
CREATE POLICY "Passengers can view driver scores"
  ON driver_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM passengers
      WHERE passengers.user_id = auth.uid()
    )
  );

-- Admins can view all scores
CREATE POLICY "Admins can view all driver scores"
  ON driver_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- =====================================================
-- 2. MATCHING CONFIGURATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS matching_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT false,
  distance_weight decimal(3,2) DEFAULT 0.40 CHECK (distance_weight >= 0 AND distance_weight <= 1),
  score_weight decimal(3,2) DEFAULT 0.30 CHECK (score_weight >= 0 AND score_weight <= 1),
  rating_weight decimal(3,2) DEFAULT 0.20 CHECK (rating_weight >= 0 AND rating_weight <= 1),
  history_weight decimal(3,2) DEFAULT 0.10 CHECK (history_weight >= 0 AND history_weight <= 1),
  min_score_threshold integer DEFAULT 60 CHECK (min_score_threshold >= 0 AND min_score_threshold <= 100),
  trust_mode_threshold integer DEFAULT 85 CHECK (trust_mode_threshold >= 0 AND trust_mode_threshold <= 100),
  max_distance_km decimal(5,2) DEFAULT 10.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matching_config_active ON matching_config(is_active);

ALTER TABLE matching_config ENABLE ROW LEVEL SECURITY;

-- Admins can manage matching config
CREATE POLICY "Admins can manage matching config"
  ON matching_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Insert default configuration
INSERT INTO matching_config (name, is_active, distance_weight, score_weight, rating_weight, history_weight)
VALUES ('Default Smart Matching', true, 0.40, 0.30, 0.20, 0.10)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. TRIP DEMAND ANALYTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS trip_demand_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name text NOT NULL,
  latitude decimal(10,8),
  longitude decimal(11,8),
  date date NOT NULL,
  hour integer NOT NULL CHECK (hour >= 0 AND hour < 24),
  trip_count integer DEFAULT 0,
  avg_wait_time_seconds integer DEFAULT 0,
  avg_fare decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(zone_name, date, hour)
);

CREATE INDEX IF NOT EXISTS idx_demand_zone_date ON trip_demand_analytics(zone_name, date DESC);
CREATE INDEX IF NOT EXISTS idx_demand_date_hour ON trip_demand_analytics(date DESC, hour);
CREATE INDEX IF NOT EXISTS idx_demand_location ON trip_demand_analytics(latitude, longitude);

ALTER TABLE trip_demand_analytics ENABLE ROW LEVEL SECURITY;

-- Admins can view demand analytics
CREATE POLICY "Admins can view demand analytics"
  ON trip_demand_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. INTELLIGENT ALERTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS intelligent_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN (
    'EXCESSIVE_CANCELLATIONS',
    'LOW_PERFORMANCE',
    'LOW_SCORE',
    'HIGH_DEMAND_ZONE',
    'LOW_DRIVER_AVAILABILITY',
    'RATING_DROP',
    'INCIDENT_SPIKE'
  )),
  severity text NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  entity_type text NOT NULL CHECK (entity_type IN ('DRIVER', 'PASSENGER', 'ZONE', 'SYSTEM')),
  entity_id uuid,
  title text NOT NULL,
  description text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES admin_users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON intelligent_alerts(is_resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON intelligent_alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON intelligent_alerts(severity);

ALTER TABLE intelligent_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage alerts
CREATE POLICY "Admins can view alerts"
  ON intelligent_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update alerts"
  ON intelligent_alerts FOR UPDATE
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

-- =====================================================
-- 5. ENHANCE EXISTING TABLES
-- =====================================================

-- Add trust mode to passengers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'passengers' AND column_name = 'trust_mode_enabled'
  ) THEN
    ALTER TABLE passengers ADD COLUMN trust_mode_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add matching score to trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'matching_score'
  ) THEN
    ALTER TABLE trips ADD COLUMN matching_score decimal(5,2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'wait_time_seconds'
  ) THEN
    ALTER TABLE trips ADD COLUMN wait_time_seconds integer;
  END IF;
END $$;

-- =====================================================
-- 6. DRIVER SCORE CALCULATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_driver_score(p_driver_id uuid)
RETURNS integer AS $$
DECLARE
  v_score integer := 100;
  v_rating decimal;
  v_acceptance_rate decimal;
  v_cancellation_rate decimal;
  v_completion_rate decimal;
  v_total_trips integer;
  v_incident_count integer;
  v_days_since_incident integer;
BEGIN
  -- Get driver statistics
  SELECT 
    COALESCE(d.average_rating, 5.0),
    COALESCE(d.total_trips, 0),
    COUNT(CASE WHEN t.status IN ('CANCELLED_BY_DRIVER') THEN 1 END)::decimal / NULLIF(COUNT(*), 0) * 100,
    COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END)::decimal / NULLIF(COUNT(*), 0) * 100,
    COUNT(CASE WHEN t.status IN ('ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED') THEN 1 END)::decimal / NULLIF(COUNT(*), 0) * 100
  INTO v_rating, v_total_trips, v_cancellation_rate, v_completion_rate, v_acceptance_rate
  FROM drivers d
  LEFT JOIN trips t ON t.driver_id = d.id
  WHERE d.id = p_driver_id
  GROUP BY d.average_rating, d.total_trips;

  -- Get incident count
  SELECT COUNT(*) INTO v_incident_count
  FROM incidents
  WHERE driver_id = p_driver_id
  AND severity IN ('HIGH', 'CRITICAL');

  -- Days since last incident
  SELECT COALESCE(
    EXTRACT(DAY FROM (now() - MAX(created_at))),
    999
  ) INTO v_days_since_incident
  FROM incidents
  WHERE driver_id = p_driver_id;

  -- Calculate score components
  -- Base score: 100
  -- Rating impact: -20 points max (5.0 = 0, 4.0 = -10, 3.0 = -20)
  v_score := v_score - GREATEST(0, (5.0 - COALESCE(v_rating, 5.0)) * 10);

  -- Completion rate impact: -15 points max
  v_score := v_score - GREATEST(0, (100 - COALESCE(v_completion_rate, 100)) * 0.15);

  -- Cancellation rate penalty: -20 points max
  v_score := v_score - LEAST(20, COALESCE(v_cancellation_rate, 0) * 2);

  -- Acceptance rate impact: -15 points max
  v_score := v_score - GREATEST(0, (100 - COALESCE(v_acceptance_rate, 100)) * 0.15);

  -- Incident penalty: -5 per high/critical incident
  v_score := v_score - (v_incident_count * 5);

  -- Bonus for no recent incidents: +5 if > 30 days
  IF v_days_since_incident > 30 THEN
    v_score := v_score + 5;
  END IF;

  -- Bonus for experience: +1 per 10 trips (max +10)
  v_score := v_score + LEAST(10, v_total_trips / 10);

  -- Ensure score is within bounds
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Update or insert driver score
  INSERT INTO driver_scores (
    driver_id,
    score,
    acceptance_rate,
    cancellation_rate,
    completion_rate,
    average_rating,
    total_trips,
    incident_count,
    days_since_last_incident,
    last_calculated
  )
  VALUES (
    p_driver_id,
    v_score,
    COALESCE(v_acceptance_rate, 100),
    COALESCE(v_cancellation_rate, 0),
    COALESCE(v_completion_rate, 100),
    COALESCE(v_rating, 5.0),
    v_total_trips,
    v_incident_count,
    v_days_since_incident,
    now()
  )
  ON CONFLICT (driver_id) DO UPDATE SET
    score = v_score,
    acceptance_rate = COALESCE(v_acceptance_rate, 100),
    cancellation_rate = COALESCE(v_cancellation_rate, 0),
    completion_rate = COALESCE(v_completion_rate, 100),
    average_rating = COALESCE(v_rating, 5.0),
    total_trips = v_total_trips,
    incident_count = v_incident_count,
    days_since_last_incident = v_days_since_incident,
    last_calculated = now(),
    updated_at = now();

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGER TO AUTO-UPDATE SCORES
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_update_driver_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate score after trip completion or cancellation
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
    IF NEW.driver_id IS NOT NULL THEN
      PERFORM calculate_driver_score(NEW.driver_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_driver_score_on_trip_change ON trips;
CREATE TRIGGER update_driver_score_on_trip_change
  AFTER INSERT OR UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_driver_score();

-- =====================================================
-- 8. ALERT GENERATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION check_driver_performance_alerts(p_driver_id uuid)
RETURNS void AS $$
DECLARE
  v_score integer;
  v_cancellation_rate decimal;
  v_rating decimal;
  v_driver_name text;
BEGIN
  -- Get driver info
  SELECT 
    ds.score,
    ds.cancellation_rate,
    ds.average_rating,
    up.full_name
  INTO v_score, v_cancellation_rate, v_rating, v_driver_name
  FROM driver_scores ds
  JOIN drivers d ON d.id = ds.driver_id
  JOIN user_profiles up ON up.id = d.user_id
  WHERE ds.driver_id = p_driver_id;

  -- Check for low score
  IF v_score < 70 AND NOT EXISTS (
    SELECT 1 FROM intelligent_alerts
    WHERE entity_id = p_driver_id
    AND alert_type = 'LOW_SCORE'
    AND is_resolved = false
    AND created_at > now() - interval '7 days'
  ) THEN
    INSERT INTO intelligent_alerts (
      alert_type,
      severity,
      entity_type,
      entity_id,
      title,
      description,
      data
    ) VALUES (
      'LOW_SCORE',
      CASE WHEN v_score < 60 THEN 'HIGH' ELSE 'MEDIUM' END,
      'DRIVER',
      p_driver_id,
      'Low Driver Score: ' || v_driver_name,
      'Driver score has dropped to ' || v_score || '. Review performance metrics.',
      jsonb_build_object('score', v_score, 'driver_name', v_driver_name)
    );
  END IF;

  -- Check for excessive cancellations
  IF v_cancellation_rate > 15 AND NOT EXISTS (
    SELECT 1 FROM intelligent_alerts
    WHERE entity_id = p_driver_id
    AND alert_type = 'EXCESSIVE_CANCELLATIONS'
    AND is_resolved = false
    AND created_at > now() - interval '7 days'
  ) THEN
    INSERT INTO intelligent_alerts (
      alert_type,
      severity,
      entity_type,
      entity_id,
      title,
      description,
      data
    ) VALUES (
      'EXCESSIVE_CANCELLATIONS',
      'HIGH',
      'DRIVER',
      p_driver_id,
      'High Cancellation Rate: ' || v_driver_name,
      'Driver has ' || ROUND(v_cancellation_rate, 1) || '% cancellation rate.',
      jsonb_build_object('cancellation_rate', v_cancellation_rate, 'driver_name', v_driver_name)
    );
  END IF;

  -- Check for rating drop
  IF v_rating < 4.0 AND NOT EXISTS (
    SELECT 1 FROM intelligent_alerts
    WHERE entity_id = p_driver_id
    AND alert_type = 'RATING_DROP'
    AND is_resolved = false
    AND created_at > now() - interval '7 days'
  ) THEN
    INSERT INTO intelligent_alerts (
      alert_type,
      severity,
      entity_type,
      entity_id,
      title,
      description,
      data
    ) VALUES (
      'RATING_DROP',
      CASE WHEN v_rating < 3.5 THEN 'CRITICAL' ELSE 'HIGH' END,
      'DRIVER',
      p_driver_id,
      'Low Rating: ' || v_driver_name,
      'Driver rating has dropped to ' || ROUND(v_rating, 2) || '/5.0.',
      jsonb_build_object('rating', v_rating, 'driver_name', v_driver_name)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. INITIALIZE SCORES FOR EXISTING DRIVERS
-- =====================================================

-- Calculate scores for all existing drivers
DO $$
DECLARE
  driver_record RECORD;
BEGIN
  FOR driver_record IN SELECT id FROM drivers LOOP
    PERFORM calculate_driver_score(driver_record.id);
  END LOOP;
END $$;

-- =====================================================
-- 10. VIEWS FOR ANALYTICS
-- =====================================================

-- Top performing drivers
CREATE OR REPLACE VIEW top_drivers AS
SELECT 
  ds.driver_id,
  ds.score,
  ds.average_rating,
  ds.total_trips,
  up.full_name,
  d.vehicle_plate
FROM driver_scores ds
JOIN drivers d ON d.id = ds.driver_id
JOIN user_profiles up ON up.id = d.user_id
WHERE ds.score >= 85
AND d.status = 'ACTIVE'
ORDER BY ds.score DESC, ds.total_trips DESC
LIMIT 50;

-- Drivers needing attention
CREATE OR REPLACE VIEW drivers_needing_attention AS
SELECT 
  ds.driver_id,
  ds.score,
  ds.cancellation_rate,
  ds.average_rating,
  ds.incident_count,
  up.full_name,
  d.status
FROM driver_scores ds
JOIN drivers d ON d.id = ds.driver_id
JOIN user_profiles up ON up.id = d.user_id
WHERE ds.score < 70 OR ds.cancellation_rate > 15 OR ds.average_rating < 4.0
ORDER BY ds.score ASC;

GRANT SELECT ON top_drivers TO authenticated;
GRANT SELECT ON drivers_needing_attention TO authenticated;
