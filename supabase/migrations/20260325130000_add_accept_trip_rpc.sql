-- Función atómica para aceptar un viaje
CREATE OR REPLACE FUNCTION accept_trip(
  p_trip_id UUID,
  p_driver_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE trips
  SET
    driver_id = p_driver_id,
    status = 'ACCEPTED',
    accepted_at = NOW()
  WHERE
    id = p_trip_id
    AND status = 'REQUESTED'
    AND driver_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 1 THEN
    -- Marcar conductor como ocupado
    UPDATE drivers SET is_on_trip = true WHERE id = p_driver_id;
    RETURN QUERY SELECT true, 'Viaje aceptado correctamente'::TEXT;
  ELSE
    RETURN QUERY SELECT false, 'El viaje ya fue tomado por otro conductor'::TEXT;
  END IF;
END;
$$;
