-- Harden notification RLS and SECURITY DEFINER helpers.

-- Remove overly permissive insert policy.
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Explicitly keep user-scoped read/update only.
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Harden mark_notification_as_read to only allow current user rows.
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_updated int;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  UPDATE notifications
  SET is_read = true,
      read_at = now()
  WHERE id = notification_id
    AND user_id = v_user_id
    AND is_read = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'NOTIFICATION_NOT_FOUND_OR_FORBIDDEN';
  END IF;
END;
$$;

-- Harden mark_all_notifications_as_read by deriving user from auth context.
DROP FUNCTION IF EXISTS mark_all_notifications_as_read(uuid);

CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_updated int;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  UPDATE notifications
  SET is_read = true,
      read_at = now()
  WHERE user_id = v_user_id
    AND is_read = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- Harden create_notification for controlled system usage.
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_icon text DEFAULT NULL,
  p_color text DEFAULT '#3b82f6',
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_play_sound boolean DEFAULT true,
  p_priority text DEFAULT 'NORMAL'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  notification_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_USER_ID';
  END IF;

  IF COALESCE(trim(p_type), '') = '' OR COALESCE(trim(p_title), '') = '' OR COALESCE(trim(p_message), '') = '' THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_PAYLOAD';
  END IF;

  INSERT INTO notifications (
    user_id, type, title, message, icon, color, link, data, play_sound, priority
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_icon, p_color, p_link, COALESCE(p_data, '{}'::jsonb), p_play_sound, p_priority
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Harden trigger helper functions with explicit search_path.
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  conversation_record RECORD;
  recipient_id uuid;
  sender_name text;
BEGIN
  SELECT user_id INTO conversation_record FROM support_conversations WHERE id = NEW.conversation_id;

  IF NEW.sender_id != conversation_record.user_id THEN
    recipient_id := conversation_record.user_id;
  ELSE
    SELECT assigned_agent_id INTO recipient_id FROM support_conversations WHERE id = NEW.conversation_id;
  END IF;

  IF recipient_id IS NOT NULL THEN
    SELECT full_name INTO sender_name FROM user_profiles WHERE id = NEW.sender_id;

    PERFORM create_notification(
      recipient_id,
      'NEW_MESSAGE',
      'Nuevo mensaje',
      COALESCE(sender_name, 'Alguien') || ' te envió un mensaje',
      'MessageCircle',
      '#10b981',
      '/support',
      jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id),
      true,
      'HIGH'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_trip_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  passenger_user_id uuid;
  driver_name text;
BEGIN
  IF NEW.status = 'ACCEPTED' AND OLD.status = 'REQUESTED' THEN
    SELECT p.user_id INTO passenger_user_id FROM passengers p WHERE p.id = NEW.passenger_id;
    SELECT up.full_name INTO driver_name FROM drivers d JOIN user_profiles up ON d.user_id = up.id WHERE d.id = NEW.driver_id;

    PERFORM create_notification(
      passenger_user_id,
      'TRIP_ACCEPTED',
      'Viaje aceptado',
      COALESCE(driver_name, 'Un conductor') || ' aceptó tu viaje',
      'CheckCircle',
      '#10b981',
      '/passenger/active-ride',
      jsonb_build_object('trip_id', NEW.id),
      true,
      'HIGH'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_driver_arrived()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  passenger_user_id uuid;
BEGIN
  IF NEW.status = 'DRIVER_ARRIVED' AND OLD.status = 'DRIVER_ARRIVING' THEN
    SELECT p.user_id INTO passenger_user_id FROM passengers p WHERE p.id = NEW.passenger_id;

    PERFORM create_notification(
      passenger_user_id,
      'DRIVER_ARRIVED',
      'Tu conductor llegó',
      'El conductor ha llegado a tu ubicación',
      'MapPin',
      '#f59e0b',
      '/passenger/active-ride',
      jsonb_build_object('trip_id', NEW.id),
      true,
      'URGENT'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_trip_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  passenger_user_id uuid;
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status = 'IN_PROGRESS' THEN
    SELECT p.user_id INTO passenger_user_id FROM passengers p WHERE p.id = NEW.passenger_id;

    PERFORM create_notification(
      passenger_user_id,
      'TRIP_COMPLETED',
      'Viaje completado',
      'Tu viaje ha finalizado. Por favor califica tu experiencia',
      'Star',
      '#3b82f6',
      '/passenger/rate-trip?trip_id=' || NEW.id::text,
      jsonb_build_object('trip_id', NEW.id),
      true,
      'NORMAL'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function execution permissions: authenticated users can only mark their own notifications.
REVOKE ALL ON FUNCTION mark_notification_as_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_notification_as_read(uuid) TO authenticated;

REVOKE ALL ON FUNCTION mark_all_notifications_as_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read() TO authenticated;

-- create_notification is internal: service role and triggers only.
REVOKE ALL ON FUNCTION create_notification(uuid, text, text, text, text, text, text, jsonb, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_notification(uuid, text, text, text, text, text, text, jsonb, boolean, text) TO service_role;
