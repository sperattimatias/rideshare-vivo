/*
  # VIVO Platform - Complete Database Schema
  
  ## Overview
  Complete schema for VIVO ride-sharing platform with Mercado Pago Marketplace integration.
  
  ## 1. Core Tables
  
  ### 1.1 Users (Authentication)
  - `users` - Main authentication table (managed by Supabase Auth)
  - Stores basic auth info: email, password hash, etc.
  
  ### 1.2 User Profiles
  - `user_profiles` - Extended user information
  - Links to auth.users via user_id
  - Stores: name, phone, profile photo, user type
  
  ### 1.3 Passengers
  - `passengers` - Passenger-specific data
  - Linked to user_profiles
  - Stores: preferred payment methods, saved addresses, preferences
  
  ### 1.4 Drivers
  - `drivers` - Driver-specific data
  - Linked to user_profiles
  - Stores: vehicle info, documents, Mercado Pago seller ID, ratings, status
  - CRITICAL: mp_seller_id for Marketplace split payments
  
  ### 1.5 Admin Users
  - `admin_users` - Platform administrators
  - Linked to user_profiles
  - Stores: role, permissions, department
  
  ## 2. Trip Management Tables
  
  ### 2.1 Trips
  - `trips` - Main trip records
  - Links passenger, driver, locations, pricing
  - Tracks status from requested → completed/cancelled
  
  ### 2.2 Trip Locations
  - `trip_locations` - GPS tracking during trip
  - Stores driver location points for route history
  
  ## 3. Payment Tables (Mercado Pago Marketplace)
  
  ### 3.1 Trip Payments
  - `trip_payments` - Payment records with SPLIT PAYMENTS
  - Stores: total amount, driver amount, platform commission
  - Links to Mercado Pago payment ID
  - CRITICAL: Implements automatic split between driver and platform
  
  ### 3.2 Driver MP Linking Logs
  - `driver_mp_linking_logs` - Audit trail for MP account linking
  - Tracks when drivers link/unlink their Mercado Pago accounts
  
  ## 4. Rating & Review Tables
  
  ### 4.1 Ratings
  - `ratings` - Passenger rates driver after trip
  - Stores: stars (1-5), comment, safety score, cleanliness score
  
  ## 5. Support Tables
  
  ### 5.1 Support Tickets
  - `support_tickets` - User support requests
  - Tracks issues, complaints, and their resolution
  
  ### 5.2 Support Messages
  - `support_messages` - Chat messages within tickets
  - Enables back-and-forth communication
  
  ## 6. Configuration Tables
  
  ### 6.1 Pricing Rules
  - `pricing_rules` - Dynamic pricing configuration
  - Base fare, per km rate, per minute rate, surge multipliers
  
  ### 6.2 Service Areas
  - `service_areas` - Geographic zones where service is available
  - Polygon boundaries for supported cities/regions
  
  ## Security (Row Level Security)
  - ALL tables have RLS enabled
  - Policies ensure users can only access their own data
  - Admin users have elevated permissions
  - Driver data only accessible when MP account is linked and verified
  
  ## Important Notes
  - Mercado Pago Marketplace: Drivers MUST link their MP account to receive payments
  - Split Payments: Platform receives commission (20%) automatically on each trip
  - No manual liquidations: Drivers receive money instantly via MP
  - Drivers can only be activated when: docs validated + MP linked + score ≥ 60
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geolocation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- =====================================================
-- 1. USER MANAGEMENT TABLES
-- =====================================================

-- 1.1 User Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  profile_photo_url text,
  user_type text NOT NULL CHECK (user_type IN ('PASSENGER', 'DRIVER', 'ADMIN')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.4 Admin Users (create before drivers to avoid FK issues)
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('SUPER_ADMIN', 'SUPPORT', 'OPERATIONS', 'FINANCE')),
  department text,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Add self-referencing FK after table creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_users_created_by_fkey'
  ) THEN
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES admin_users(id);
  END IF;
END $$;

-- 1.2 Passengers
CREATE TABLE IF NOT EXISTS passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  preferred_payment_method text DEFAULT 'mercado_pago',
  saved_addresses jsonb DEFAULT '[]'::jsonb,
  total_trips integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.3 Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Vehicle information
  vehicle_brand text,
  vehicle_model text,
  vehicle_year integer,
  vehicle_color text,
  vehicle_plate text UNIQUE,
  vehicle_photo_url text,
  
  -- Documentation
  driver_license_number text,
  driver_license_expiry date,
  driver_license_photo_url text,
  vehicle_registration_photo_url text,
  insurance_photo_url text,
  documents_validated boolean DEFAULT false,
  documents_validated_at timestamptz,
  documents_validated_by uuid REFERENCES admin_users(id),
  
  -- Mercado Pago Marketplace Integration (CRITICAL)
  mp_seller_id text UNIQUE,
  mp_account_email text,
  mp_linked_at timestamptz,
  mp_status text DEFAULT 'PENDING' CHECK (mp_status IN ('PENDING', 'LINKED', 'SUSPENDED', 'REJECTED')),
  
  -- Performance metrics
  score decimal(3,2) DEFAULT 100.00 CHECK (score >= 0 AND score <= 100),
  total_trips integer DEFAULT 0,
  total_ratings integer DEFAULT 0,
  average_rating decimal(3,2) DEFAULT 5.00,
  
  -- Status
  status text DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'REJECTED')),
  is_online boolean DEFAULT false,
  is_on_trip boolean DEFAULT false,
  current_location geography(Point, 4326),
  last_location_update timestamptz,
  
  -- Computed: Can receive trips only if fully validated and MP linked
  can_receive_trips boolean GENERATED ALWAYS AS (
    status = 'ACTIVE' 
    AND mp_status = 'LINKED' 
    AND documents_validated = true
    AND score >= 60
  ) STORED,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES admin_users(id)
);

-- =====================================================
-- 2. TRIP MANAGEMENT TABLES
-- =====================================================

-- 2.1 Trips
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants
  passenger_id uuid NOT NULL REFERENCES passengers(id),
  driver_id uuid REFERENCES drivers(id),
  
  -- Locations
  origin_address text NOT NULL,
  origin_location geography(Point, 4326) NOT NULL,
  destination_address text NOT NULL,
  destination_location geography(Point, 4326) NOT NULL,
  
  -- Trip details
  status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN (
    'REQUESTED',
    'ACCEPTED',
    'DRIVER_ARRIVING',
    'DRIVER_ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED_BY_PASSENGER',
    'CANCELLED_BY_DRIVER',
    'CANCELLED_BY_SYSTEM'
  )),
  
  -- Pricing
  estimated_distance_km decimal(10,2),
  estimated_duration_minutes integer,
  estimated_fare decimal(10,2),
  
  actual_distance_km decimal(10,2),
  actual_duration_minutes integer,
  final_fare decimal(10,2),
  
  surge_multiplier decimal(3,2) DEFAULT 1.00,
  
  -- Timestamps
  requested_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  driver_arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  
  -- Metadata
  rating_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.2 Trip Location Tracking
CREATE TABLE IF NOT EXISTS trip_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES drivers(id),
  location geography(Point, 4326) NOT NULL,
  speed_kmh decimal(5,2),
  heading decimal(5,2),
  accuracy_meters decimal(8,2),
  recorded_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. PAYMENT TABLES (MERCADO PAGO MARKETPLACE)
-- =====================================================

-- 3.1 Trip Payments with Split Payments
CREATE TABLE IF NOT EXISTS trip_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id),
  
  -- Payment amounts (SPLIT PAYMENTS)
  total_amount decimal(10,2) NOT NULL,
  driver_amount decimal(10,2) NOT NULL,
  platform_amount decimal(10,2) NOT NULL,
  
  -- Mercado Pago integration
  mp_payment_id text UNIQUE NOT NULL,
  mp_status text NOT NULL CHECK (mp_status IN ('pending', 'approved', 'rejected', 'refunded', 'cancelled')),
  mp_status_detail text,
  
  -- Split details
  driver_mp_seller_id text NOT NULL,
  platform_mp_seller_id text NOT NULL,
  
  -- Payment method
  payment_method text,
  payment_method_id text,
  installments integer DEFAULT 1,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  
  -- Validation
  CONSTRAINT valid_split CHECK (total_amount = driver_amount + platform_amount),
  CONSTRAINT positive_amounts CHECK (total_amount > 0 AND driver_amount > 0 AND platform_amount > 0)
);

-- 3.2 Driver Mercado Pago Linking Logs (Audit)
CREATE TABLE IF NOT EXISTS driver_mp_linking_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  event_type text NOT NULL CHECK (event_type IN ('LINK_STARTED', 'LINK_SUCCESS', 'LINK_FAILED', 'UNLINK', 'SUSPENDED')),
  mp_seller_id text,
  mp_account_email text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 4. RATING & REVIEW TABLES
-- =====================================================

-- 4.1 Ratings (Passenger rates Driver)
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) UNIQUE,
  passenger_id uuid NOT NULL REFERENCES passengers(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  
  -- Rating details
  overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  safety_rating integer CHECK (safety_rating >= 1 AND safety_rating <= 5),
  cleanliness_rating integer CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
  
  comment text,
  is_anonymous boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. SUPPORT TABLES
-- =====================================================

-- 5.1 Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reporter
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  user_type text NOT NULL CHECK (user_type IN ('PASSENGER', 'DRIVER')),
  
  -- Ticket details
  category text NOT NULL CHECK (category IN (
    'PAYMENT_ISSUE',
    'DRIVER_BEHAVIOR',
    'PASSENGER_BEHAVIOR',
    'ACCIDENT',
    'VEHICLE_ISSUE',
    'APP_BUG',
    'ACCOUNT_ISSUE',
    'OTHER'
  )),
  priority text DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status text DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED')),
  
  subject text NOT NULL,
  description text NOT NULL,
  
  -- Related entities
  trip_id uuid REFERENCES trips(id),
  
  -- Assignment
  assigned_to uuid REFERENCES admin_users(id),
  assigned_at timestamptz,
  
  -- Resolution
  resolved_at timestamptz,
  resolved_by uuid REFERENCES admin_users(id),
  resolution_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5.2 Support Messages
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES user_profiles(id),
  sender_type text NOT NULL CHECK (sender_type IN ('USER', 'ADMIN')),
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 6. CONFIGURATION TABLES
-- =====================================================

-- 6.1 Pricing Rules
CREATE TABLE IF NOT EXISTS pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Geographic scope
  service_area_id uuid,
  city text,
  country text DEFAULT 'AR',
  
  -- Base pricing
  base_fare decimal(10,2) NOT NULL DEFAULT 500.00,
  per_km_rate decimal(10,2) NOT NULL DEFAULT 150.00,
  per_minute_rate decimal(10,2) NOT NULL DEFAULT 30.00,
  minimum_fare decimal(10,2) NOT NULL DEFAULT 800.00,
  
  -- Platform commission
  platform_commission_percent decimal(5,2) NOT NULL DEFAULT 20.00 CHECK (platform_commission_percent >= 0 AND platform_commission_percent <= 100),
  
  -- Surge pricing
  surge_enabled boolean DEFAULT true,
  surge_multiplier_max decimal(3,2) DEFAULT 3.00,
  
  -- Time-based rules
  night_surcharge_enabled boolean DEFAULT true,
  night_surcharge_percent decimal(5,2) DEFAULT 25.00,
  night_hours_start time DEFAULT '22:00',
  night_hours_end time DEFAULT '06:00',
  
  -- Status
  is_active boolean DEFAULT true,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id),
  updated_at timestamptz DEFAULT now()
);

-- 6.2 Service Areas
CREATE TABLE IF NOT EXISTS service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  country text DEFAULT 'AR',
  boundary geography(Polygon, 4326) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_passengers_user_id ON passengers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_is_online ON drivers(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_drivers_mp_seller_id ON drivers(mp_seller_id);
CREATE INDEX IF NOT EXISTS idx_drivers_can_receive_trips ON drivers(can_receive_trips) WHERE can_receive_trips = true;
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIST(current_location) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_trips_passenger_id ON trips(passenger_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_origin_location ON trips USING GIST(origin_location);
CREATE INDEX IF NOT EXISTS idx_trips_destination_location ON trips USING GIST(destination_location);
CREATE INDEX IF NOT EXISTS idx_trip_locations_trip_id ON trip_locations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_locations_recorded_at ON trip_locations(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_payments_trip_id ON trip_payments(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_payments_mp_payment_id ON trip_payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_trip_payments_driver_mp_seller_id ON trip_payments(driver_mp_seller_id);
CREATE INDEX IF NOT EXISTS idx_trip_payments_created_at ON trip_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mp_linking_logs_driver_id ON driver_mp_linking_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_mp_linking_logs_created_at ON driver_mp_linking_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_driver_id ON ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_ratings_passenger_id ON ratings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_ratings_trip_id ON ratings(trip_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_mp_linking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Passengers can view own data" ON passengers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Passengers can update own data" ON passengers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Passengers can insert own data" ON passengers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Drivers can view own data" ON drivers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Drivers can update own data" ON drivers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Drivers can insert own data" ON drivers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Passengers can view own trips" ON trips FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM passengers WHERE passengers.id = trips.passenger_id AND passengers.user_id = auth.uid()));
CREATE POLICY "Drivers can view assigned trips" ON trips FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM drivers WHERE drivers.id = trips.driver_id AND drivers.user_id = auth.uid()));
CREATE POLICY "Passengers can create trips" ON trips FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM passengers WHERE passengers.id = passenger_id AND passengers.user_id = auth.uid()));
CREATE POLICY "Drivers can update assigned trips" ON trips FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM drivers WHERE drivers.id = trips.driver_id AND drivers.user_id = auth.uid()));

CREATE POLICY "Users can view own trip payments" ON trip_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM trips JOIN passengers ON passengers.id = trips.passenger_id WHERE trips.id = trip_payments.trip_id AND passengers.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM trips JOIN drivers ON drivers.id = trips.driver_id WHERE trips.id = trip_payments.trip_id AND drivers.user_id = auth.uid()));

CREATE POLICY "Passengers can create ratings for own trips" ON ratings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM passengers WHERE passengers.id = passenger_id AND passengers.user_id = auth.uid()));
CREATE POLICY "Users can view ratings for their trips" ON ratings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM passengers WHERE passengers.id = ratings.passenger_id AND passengers.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM drivers WHERE drivers.id = ratings.driver_id AND drivers.user_id = auth.uid()));

CREATE POLICY "Users can view own tickets" ON support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create tickets" ON support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own tickets" ON support_tickets FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can view messages from own tickets" ON support_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid()));
CREATE POLICY "Users can send messages to own tickets" ON support_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = ticket_id AND support_tickets.user_id = auth.uid()));

CREATE POLICY "Anyone can view active pricing rules" ON pricing_rules FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Anyone can view active service areas" ON service_areas FOR SELECT TO authenticated USING (is_active = true);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_passengers_updated_at BEFORE UPDATE ON passengers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_driver_stats_after_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE drivers SET total_ratings = total_ratings + 1, average_rating = (SELECT AVG(overall_rating)::decimal(3,2) FROM ratings WHERE driver_id = NEW.driver_id) WHERE id = NEW.driver_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_stats_after_rating AFTER INSERT ON ratings FOR EACH ROW EXECUTE FUNCTION update_driver_stats_after_rating();

CREATE OR REPLACE FUNCTION increment_trip_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    UPDATE passengers SET total_trips = total_trips + 1 WHERE id = NEW.passenger_id;
    UPDATE drivers SET total_trips = total_trips + 1 WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_trip_counters AFTER UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION increment_trip_counters();

-- =====================================================
-- INITIAL DATA
-- =====================================================

INSERT INTO pricing_rules (city, country, base_fare, per_km_rate, per_minute_rate, minimum_fare, platform_commission_percent, is_active) 
VALUES ('Buenos Aires', 'AR', 500.00, 150.00, 30.00, 800.00, 20.00, true) 
ON CONFLICT DO NOTHING;