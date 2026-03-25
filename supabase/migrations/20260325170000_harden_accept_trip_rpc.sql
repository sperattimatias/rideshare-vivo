-- Hardened atomic trip acceptance RPC.
-- Security model:
--   - Caller is authenticated (auth.uid())
--   - Driver identity is derived from auth.uid() (never trusted from frontend)
--   - Trip can only be accepted when still REQUESTED and unassigned
--   - Driver must be enabled and idle

DROP FUNCTION IF EXISTS accept_trip(uuid, uuid);
DROP FUNCTION IF EXISTS accept_trip(uuid);

CREATE OR REPLACE FUNCTION accept_trip(
  p_trip_id uuid
)
RETURNS TABLE(
  success boolean,
  code text,
  message text,
  trip_id uuid,
  driver_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_driver_id uuid;
  v_driver_status drivers%ROWTYPE;
  v_trip_status trips%ROWTYPE;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_AUTHENTICATED', 'Debés iniciar sesión para aceptar viajes', NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  SELECT *
  INTO v_driver_status
  FROM drivers d
  WHERE d.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'DRIVER_NOT_FOUND', 'No existe un perfil de conductor para este usuario', NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  v_driver_id := v_driver_status.id;

  IF v_driver_status.status <> 'ACTIVE' THEN
    RETURN QUERY SELECT false, 'DRIVER_NOT_ACTIVE', 'Tu cuenta de conductor no está activa', p_trip_id, v_driver_id;
    RETURN;
  END IF;

  IF NOT v_driver_status.can_receive_trips OR NOT v_driver_status.is_online THEN
    RETURN QUERY SELECT false, 'DRIVER_NOT_ENABLED', 'No estás habilitado para recibir viajes en este momento', p_trip_id, v_driver_id;
    RETURN;
  END IF;

  IF v_driver_status.is_on_trip THEN
    RETURN QUERY SELECT false, 'DRIVER_ALREADY_ON_TRIP', 'Ya tenés un viaje en curso', p_trip_id, v_driver_id;
    RETURN;
  END IF;

  UPDATE trips t
  SET
    driver_id = v_driver_id,
    status = 'ACCEPTED',
    accepted_at = now(),
    updated_at = now()
  WHERE
    t.id = p_trip_id
    AND t.status = 'REQUESTED'
    AND t.driver_id IS NULL
  RETURNING t.* INTO v_trip_status;

  IF NOT FOUND THEN
    SELECT * INTO v_trip_status FROM trips WHERE id = p_trip_id;

    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 'TRIP_NOT_FOUND', 'El viaje no existe', p_trip_id, v_driver_id;
      RETURN;
    END IF;

    IF v_trip_status.driver_id IS NOT NULL OR v_trip_status.status <> 'REQUESTED' THEN
      RETURN QUERY SELECT false, 'TRIP_ALREADY_TAKEN', 'El viaje ya fue tomado por otro conductor', p_trip_id, v_driver_id;
      RETURN;
    END IF;

    RETURN QUERY SELECT false, 'TRIP_STATE_INVALID', 'El viaje no está disponible para aceptación', p_trip_id, v_driver_id;
    RETURN;
  END IF;

  UPDATE drivers
  SET
    is_on_trip = true,
    updated_at = now()
  WHERE id = v_driver_id;

  RETURN QUERY SELECT true, 'ACCEPTED', 'Viaje aceptado correctamente', v_trip_status.id, v_driver_id;
END;
$$;

REVOKE ALL ON FUNCTION accept_trip(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_trip(uuid) TO authenticated;
