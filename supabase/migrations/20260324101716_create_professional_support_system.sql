/*
  # Sistema Profesional de Soporte con Chat en Tiempo Real

  ## Descripción
  Sistema completo de atención al cliente con chat en tiempo real y gestión de tickets
  profesional. Permite escalar conversaciones de chat a tickets departamentales.

  ## Nuevas Tablas
  
  1. `support_departments_new` - Departamentos de soporte
  2. `support_categories_new` - Categorías de tickets
  3. `support_conversations` - Conversaciones de chat/ticket
  4. `support_conversation_messages` - Mensajes de las conversaciones
  5. `support_assignments` - Historial de asignaciones
  6. `support_agent_status` - Estado en tiempo real de agentes de soporte

  ## Características
  - Chat en tiempo real con agentes
  - Escalamiento a tickets departamentales
  - Sistema de prioridades y gravedades
  - Notificaciones automáticas
  - Métricas de rendimiento
*/

-- 1. Departamentos
CREATE TABLE IF NOT EXISTS support_departments_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#3b82f6',
  icon text DEFAULT 'MessageCircle',
  is_active boolean DEFAULT true,
  avg_response_time_minutes integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Categorías
CREATE TABLE IF NOT EXISTS support_categories_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  department_id uuid REFERENCES support_departments_new(id) ON DELETE SET NULL,
  requires_urgent_attention boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Conversaciones (reemplaza tickets)
CREATE TABLE IF NOT EXISTS support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_type text NOT NULL,
  category_id uuid REFERENCES support_categories_new(id) ON DELETE SET NULL,
  department_id uuid REFERENCES support_departments_new(id) ON DELETE SET NULL,
  assigned_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  description text,
  status text DEFAULT 'OPEN' NOT NULL,
  priority text DEFAULT 'NORMAL' NOT NULL,
  channel text DEFAULT 'CHAT' NOT NULL,
  escalated_from_chat boolean DEFAULT false,
  chat_started_at timestamptz DEFAULT now(),
  escalated_at timestamptz,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  rating_comment text,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Mensajes
CREATE TABLE IF NOT EXISTS support_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES support_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL,
  message text NOT NULL,
  message_type text DEFAULT 'TEXT' NOT NULL,
  is_internal_note boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 5. Historial de Asignaciones
CREATE TABLE IF NOT EXISTS support_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES support_conversations(id) ON DELETE CASCADE NOT NULL,
  from_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_department_id uuid REFERENCES support_departments_new(id) ON DELETE SET NULL,
  to_department_id uuid REFERENCES support_departments_new(id) ON DELETE SET NULL,
  reason text,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 6. Estado de Agentes
CREATE TABLE IF NOT EXISTS support_agent_status (
  agent_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_available boolean DEFAULT false,
  status text DEFAULT 'OFFLINE' NOT NULL,
  max_concurrent_chats integer DEFAULT 5,
  current_chat_count integer DEFAULT 0,
  departments jsonb DEFAULT '[]'::jsonb,
  last_activity_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_conversations_priority ON support_conversations(priority);
CREATE INDEX IF NOT EXISTS idx_support_conversations_department_id ON support_conversations(department_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_assigned_agent_id ON support_conversations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_created_at ON support_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conversation_messages_conversation_id ON support_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_conversation_messages_created_at ON support_conversation_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_categories_new_department_id ON support_categories_new(department_id);

-- Función para generar número de conversación
CREATE OR REPLACE FUNCTION generate_conversation_number()
RETURNS text AS $$
DECLARE
  current_year text;
  next_number integer;
  conv_num text;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(conversation_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_number
  FROM support_conversations
  WHERE conversation_number LIKE 'SUP-' || current_year || '-%';
  conv_num := 'SUP-' || current_year || '-' || LPAD(next_number::text, 5, '0');
  RETURN conv_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar conversation_number
CREATE OR REPLACE FUNCTION set_conversation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.conversation_number IS NULL OR NEW.conversation_number = '' THEN
    NEW.conversation_number := generate_conversation_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_conversation_number ON support_conversations;
CREATE TRIGGER trigger_set_conversation_number
  BEFORE INSERT ON support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_conversation_number();

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_support_conversations_updated_at ON support_conversations;
CREATE TRIGGER trigger_support_conversations_updated_at
  BEFORE UPDATE ON support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

DROP TRIGGER IF EXISTS trigger_support_departments_new_updated_at ON support_departments_new;
CREATE TRIGGER trigger_support_departments_new_updated_at
  BEFORE UPDATE ON support_departments_new
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

DROP TRIGGER IF EXISTS trigger_support_categories_new_updated_at ON support_categories_new;
CREATE TRIGGER trigger_support_categories_new_updated_at
  BEFORE UPDATE ON support_categories_new
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

DROP TRIGGER IF EXISTS trigger_support_agent_status_updated_at ON support_agent_status;
CREATE TRIGGER trigger_support_agent_status_updated_at
  BEFORE UPDATE ON support_agent_status
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- RLS
ALTER TABLE support_departments_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_categories_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_agent_status ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Todos pueden ver departamentos activos" ON support_departments_new;
CREATE POLICY "Todos pueden ver departamentos activos"
  ON support_departments_new FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Solo admins pueden modificar departamentos" ON support_departments_new;
CREATE POLICY "Solo admins pueden modificar departamentos"
  ON support_departments_new FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Todos pueden ver categorías activas" ON support_categories_new;
CREATE POLICY "Todos pueden ver categorías activas"
  ON support_categories_new FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Solo admins pueden modificar categorías" ON support_categories_new;
CREATE POLICY "Solo admins pueden modificar categorías"
  ON support_categories_new FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Usuarios ven sus propias conversaciones" ON support_conversations;
CREATE POLICY "Usuarios ven sus propias conversaciones"
  ON support_conversations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'ADMIN'
    )
    OR
    assigned_agent_id = auth.uid()
  );

DROP POLICY IF EXISTS "Usuarios pueden crear conversaciones" ON support_conversations;
CREATE POLICY "Usuarios pueden crear conversaciones"
  ON support_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios pueden actualizar sus conversaciones" ON support_conversations;
CREATE POLICY "Usuarios pueden actualizar sus conversaciones"
  ON support_conversations FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'ADMIN'
    )
    OR
    assigned_agent_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'ADMIN'
    )
    OR
    assigned_agent_id = auth.uid()
  );

DROP POLICY IF EXISTS "Usuarios ven mensajes de sus conversaciones" ON support_conversation_messages;
CREATE POLICY "Usuarios ven mensajes de sus conversaciones"
  ON support_conversation_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = conversation_id
      AND (
        support_conversations.user_id = auth.uid()
        OR support_conversations.assigned_agent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.user_type = 'ADMIN'
        )
      )
    )
    AND (
      NOT is_internal_note
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.user_type = 'ADMIN'
      )
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden enviar mensajes en sus conversaciones" ON support_conversation_messages;
CREATE POLICY "Usuarios pueden enviar mensajes en sus conversaciones"
  ON support_conversation_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = conversation_id
      AND (
        support_conversations.user_id = auth.uid()
        OR support_conversations.assigned_agent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.user_type = 'ADMIN'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden marcar mensajes como leídos" ON support_conversation_messages;
CREATE POLICY "Usuarios pueden marcar mensajes como leídos"
  ON support_conversation_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = conversation_id
      AND (
        support_conversations.user_id = auth.uid()
        OR support_conversations.assigned_agent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.user_type = 'ADMIN'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Admins ven historial de asignaciones" ON support_assignments;
CREATE POLICY "Admins ven historial de asignaciones"
  ON support_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Solo admins pueden crear asignaciones" ON support_assignments;
CREATE POLICY "Solo admins pueden crear asignaciones"
  ON support_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins ven estado de agentes" ON support_agent_status;
CREATE POLICY "Admins ven estado de agentes"
  ON support_agent_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins pueden actualizar su propio estado" ON support_agent_status;
CREATE POLICY "Admins pueden actualizar su propio estado"
  ON support_agent_status FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Datos iniciales
INSERT INTO support_departments_new (name, description, color, icon, avg_response_time_minutes) VALUES
  ('Soporte Técnico', 'Problemas técnicos, errores de la app', '#3b82f6', 'Wrench', 15),
  ('Facturación', 'Pagos, cobros, facturas, reembolsos', '#10b981', 'DollarSign', 30),
  ('Seguridad', 'Reportes de seguridad, incidentes', '#ef4444', 'Shield', 5),
  ('Atención General', 'Consultas generales, información', '#8b5cf6', 'MessageCircle', 20),
  ('Quejas y Reclamos', 'Quejas sobre servicio', '#f59e0b', 'AlertTriangle', 45)
ON CONFLICT DO NOTHING;

-- Insertar categorías
DO $$
DECLARE
  dept_tech_id uuid;
  dept_billing_id uuid;
  dept_security_id uuid;
  dept_general_id uuid;
  dept_complaints_id uuid;
BEGIN
  SELECT id INTO dept_tech_id FROM support_departments_new WHERE name = 'Soporte Técnico' LIMIT 1;
  SELECT id INTO dept_billing_id FROM support_departments_new WHERE name = 'Facturación' LIMIT 1;
  SELECT id INTO dept_security_id FROM support_departments_new WHERE name = 'Seguridad' LIMIT 1;
  SELECT id INTO dept_general_id FROM support_departments_new WHERE name = 'Atención General' LIMIT 1;
  SELECT id INTO dept_complaints_id FROM support_departments_new WHERE name = 'Quejas y Reclamos' LIMIT 1;

  IF dept_tech_id IS NOT NULL THEN
    INSERT INTO support_categories_new (name, description, department_id, requires_urgent_attention) VALUES
      ('No puedo iniciar sesión', 'Problemas para acceder a la cuenta', dept_tech_id, false),
      ('Error en la aplicación', 'La app se cierra o tiene errores', dept_tech_id, false)
    ON CONFLICT DO NOTHING;
  END IF;

  IF dept_billing_id IS NOT NULL THEN
    INSERT INTO support_categories_new (name, description, department_id, requires_urgent_attention) VALUES
      ('Problema con un pago', 'No se procesó el pago correctamente', dept_billing_id, true),
      ('Solicitar reembolso', 'Quiero que me devuelvan el dinero', dept_billing_id, false)
    ON CONFLICT DO NOTHING;
  END IF;

  IF dept_security_id IS NOT NULL THEN
    INSERT INTO support_categories_new (name, description, department_id, requires_urgent_attention) VALUES
      ('Emergencia de seguridad', 'Situación de riesgo o peligro', dept_security_id, true),
      ('Reportar conductor/pasajero', 'Comportamiento inapropiado', dept_security_id, true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF dept_general_id IS NOT NULL THEN
    INSERT INTO support_categories_new (name, description, department_id, requires_urgent_attention) VALUES
      ('Cómo funciona la app', 'Dudas sobre el uso de la aplicación', dept_general_id, false)
    ON CONFLICT DO NOTHING;
  END IF;

  IF dept_complaints_id IS NOT NULL THEN
    INSERT INTO support_categories_new (name, description, department_id, requires_urgent_attention) VALUES
      ('Queja sobre el servicio', 'Insatisfacción con el servicio', dept_complaints_id, false)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
