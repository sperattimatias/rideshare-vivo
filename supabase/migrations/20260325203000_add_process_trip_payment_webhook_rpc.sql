/*
  # Process Mercado Pago webhook atomically
*/

CREATE OR REPLACE FUNCTION public.process_trip_payment_webhook(
  p_external_reference text,
  p_mp_payment_id text,
  p_mp_status text,
  p_mp_status_detail text,
  p_payment_method text,
  p_payment_method_id text
)
RETURNS TABLE (
  processed boolean,
  trip_id uuid,
  status text,
  status_changed boolean,
  earnings_applied boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment trip_payments%ROWTYPE;
  v_trip_driver_id uuid;
  v_effective_status text;
  v_status_changed boolean := false;
  v_earnings_applied boolean := false;
BEGIN
  IF p_mp_status NOT IN ('pending', 'approved', 'rejected', 'refunded', 'cancelled') THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, false, false;
    RETURN;
  END IF;

  SELECT *
  INTO v_payment
  FROM trip_payments
  WHERE external_reference = p_external_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, false, false;
    RETURN;
  END IF;

  -- Never downgrade approved payments due to late/out-of-order webhook notifications.
  IF v_payment.mp_status = 'approved' AND p_mp_status <> 'approved' THEN
    v_effective_status := 'approved';
  ELSE
    v_effective_status := p_mp_status;
  END IF;

  v_status_changed := v_payment.mp_status IS DISTINCT FROM v_effective_status;

  UPDATE trip_payments
  SET
    mp_payment_id = COALESCE(p_mp_payment_id, v_payment.mp_payment_id),
    mp_status = v_effective_status,
    mp_status_detail = p_mp_status_detail,
    payment_method = p_payment_method,
    payment_method_id = p_payment_method_id,
    approved_at = CASE
      WHEN v_effective_status = 'approved' AND v_payment.approved_at IS NULL THEN now()
      ELSE v_payment.approved_at
    END,
    last_webhook_at = now()
  WHERE id = v_payment.id;

  IF v_payment.mp_status <> 'approved' AND v_effective_status = 'approved' THEN
    SELECT driver_id INTO v_trip_driver_id
    FROM trips
    WHERE id = v_payment.trip_id;

    IF v_trip_driver_id IS NOT NULL THEN
      UPDATE drivers
      SET total_earnings = COALESCE(total_earnings, 0) + v_payment.driver_amount
      WHERE id = v_trip_driver_id;

      v_earnings_applied := true;
    END IF;
  END IF;

  RETURN QUERY SELECT true, v_payment.trip_id, v_effective_status, v_status_changed, v_earnings_applied;
END;
$$;

REVOKE ALL ON FUNCTION public.process_trip_payment_webhook(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_trip_payment_webhook(text, text, text, text, text, text) TO service_role;
