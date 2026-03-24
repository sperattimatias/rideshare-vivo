/*
  # Sistema de Notificaciones en Tiempo Real

  ## Descripción
  Sistema completo de notificaciones al estilo Facebook/Instagram con:
  - Historial de notificaciones
  - Estado leído/no leído
  - Sonido configurable
  - Tipos de notificaciones (mensaje, viaje, pago, etc.)
  - Centro de notificaciones con filtros

  ## Nuevas Tablas

  1. `notifications` - Notificaciones del sistema
  2. `notification_settings` - Configuración de notificaciones por usuario

  ## Características
  - Notificaciones en tiempo real
  - Historial completo
  - Configuración personalizada
  - Múltiples tipos de eventos
*/

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  icon text,
  color text DEFAULT '#3b82f6',
  link text,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  play_sound boolean DEFAULT true,
  priority text DEFAULT 'NORMAL',
  created_at timestamptz DEFAULT now()
);

-- Tabla de configuración de notificaciones
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enable_sound boolean DEFAULT true,
  enable_push boolean DEFAULT true,
  enable_email boolean DEFAULT false,
  trip_notifications boolean DEFAULT true,
  message_notifications boolean DEFAULT true,
  payment_notifications boolean DEFAULT true,
  system_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Función para marcar notificación como leída
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar todas las notificaciones como leídas
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE user_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear notificación
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
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message, icon, color, link, data, play_sound, priority
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_icon, p_color, p_link, p_data, p_play_sound, p_priority
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own notification settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger para crear notificaciones automáticas cuando llega un mensaje nuevo
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON support_conversation_messages
  FOR EACH ROW
  WHEN (NEW.sender_type != 'SYSTEM')
  EXECUTE FUNCTION notify_new_message();

-- Trigger para notificar cuando un viaje es aceptado
CREATE OR REPLACE FUNCTION notify_trip_accepted()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_trip_accepted
  AFTER UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION notify_trip_accepted();

-- Trigger para notificar cuando el conductor llega
CREATE OR REPLACE FUNCTION notify_driver_arrived()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_driver_arrived
  AFTER UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION notify_driver_arrived();

-- Trigger para notificar cuando el viaje se completa
CREATE OR REPLACE FUNCTION notify_trip_completed()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_trip_completed
  AFTER UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION notify_trip_completed();