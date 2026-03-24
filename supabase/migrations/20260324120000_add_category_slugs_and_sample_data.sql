/*
  # Agregar slugs a categorías y datos de ejemplo

  ## Cambios
  1. Agregar columna slug a support_categories_new
  2. Insertar departamentos de ejemplo
  3. Insertar categorías de ejemplo con slugs
*/

-- Agregar columna slug si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_categories_new' AND column_name = 'slug'
  ) THEN
    ALTER TABLE support_categories_new ADD COLUMN slug text UNIQUE;
  END IF;
END $$;

-- Insertar departamentos de ejemplo
INSERT INTO support_departments_new (name, description, color, icon)
VALUES 
  ('Soporte General', 'Consultas generales y asistencia básica', '#3b82f6', 'MessageCircle'),
  ('Soporte Técnico', 'Problemas técnicos de la plataforma', '#ef4444', 'AlertCircle'),
  ('Pagos', 'Consultas sobre pagos y facturación', '#10b981', 'DollarSign'),
  ('Verificación de Conductores', 'Validación de documentos y perfiles', '#f59e0b', 'Shield'),
  ('Incidentes', 'Reportes de problemas durante viajes', '#8b5cf6', 'AlertTriangle')
ON CONFLICT DO NOTHING;

-- Obtener IDs de departamentos
DO $$
DECLARE
  general_dept_id uuid;
  technical_dept_id uuid;
  payments_dept_id uuid;
  verification_dept_id uuid;
  incidents_dept_id uuid;
BEGIN
  SELECT id INTO general_dept_id FROM support_departments_new WHERE name = 'Soporte General' LIMIT 1;
  SELECT id INTO technical_dept_id FROM support_departments_new WHERE name = 'Soporte Técnico' LIMIT 1;
  SELECT id INTO payments_dept_id FROM support_departments_new WHERE name = 'Pagos' LIMIT 1;
  SELECT id INTO verification_dept_id FROM support_departments_new WHERE name = 'Verificación de Conductores' LIMIT 1;
  SELECT id INTO incidents_dept_id FROM support_departments_new WHERE name = 'Incidentes' LIMIT 1;

  -- Insertar categorías con slugs
  INSERT INTO support_categories_new (name, slug, description, department_id, requires_urgent_attention)
  VALUES
    ('Consultas Generales', 'general', 'Preguntas y consultas generales', general_dept_id, false),
    ('Viajes', 'trips', 'Consultas sobre viajes y solicitudes', general_dept_id, false),
    ('Objetos Perdidos', 'lost_items', 'Reportar objetos olvidados en el vehículo', general_dept_id, false),
    ('Problemas Técnicos', 'technical', 'Errores en la aplicación o funcionalidades', technical_dept_id, true),
    ('Pagos y Facturación', 'payments', 'Consultas sobre cobros y pagos', payments_dept_id, false),
    ('Verificación de Documentos', 'driver_verification', 'Proceso de verificación de conductores', verification_dept_id, false),
    ('Reportar Incidente', 'incidents', 'Reportar problemas de seguridad o comportamiento', incidents_dept_id, true)
  ON CONFLICT (slug) DO NOTHING;
END $$;
