-- Security + concurrency fixes for beta readiness

-- 1) Prevent public admin self-registration at DB policy level
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own non-admin profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND (
      user_type IN ('PASSENGER', 'DRIVER')
      OR EXISTS (
        SELECT 1
        FROM admin_users
        WHERE admin_users.user_id = auth.uid()
      )
    )
  );

-- 2) Atomic trip acceptance to avoid double-assignment race conditions
CREATE OR REPLACE FUNCTION public.accept_trip_atomic(
  p_trip_id uuid,
  p_driver_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_rows integer;
BEGIN
  UPDATE trips
  SET driver_id = p_driver_id,
      status = 'ACCEPTED',
      accepted_at = now(),
      updated_at = now()
  WHERE id = p_trip_id
    AND status = 'REQUESTED'
    AND driver_id IS NULL;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE drivers
  SET is_on_trip = TRUE,
      updated_at = now()
  WHERE id = p_driver_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_trip_atomic(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_trip_atomic(uuid, uuid) TO authenticated;

-- 3) Atomic counters on trip completion (no read-modify-write race)
CREATE OR REPLACE FUNCTION public.complete_trip_counters_atomic(
  p_trip_id uuid,
  p_driver_id uuid,
  p_passenger_id uuid,
  p_actual_distance_km numeric,
  p_actual_duration_minutes integer,
  p_final_fare numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_rows integer;
BEGIN
  UPDATE trips
  SET status = 'COMPLETED',
      completed_at = COALESCE(completed_at, now()),
      actual_distance_km = p_actual_distance_km,
      actual_duration_minutes = p_actual_duration_minutes,
      final_fare = p_final_fare,
      updated_at = now()
  WHERE id = p_trip_id
    AND status = 'IN_PROGRESS';

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  IF v_updated_rows = 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE drivers
  SET is_on_trip = FALSE,
      total_trips = COALESCE(total_trips, 0) + 1,
      updated_at = now()
  WHERE id = p_driver_id;

  UPDATE passengers
  SET total_trips = COALESCE(total_trips, 0) + 1,
      updated_at = now()
  WHERE id = p_passenger_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_trip_counters_atomic(uuid, uuid, uuid, numeric, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_trip_counters_atomic(uuid, uuid, uuid, numeric, integer, numeric) TO authenticated;
