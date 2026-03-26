# Auditoría técnica ejecutable — rideshare-vivo

**Fecha:** 2026-03-25  
**Scope:** frontend (React/Vite/TS), Supabase schema+migrations, edge functions, tipado compartido, seguridad y operación.

---

## 1) Resumen ejecutivo

Estado actual: **no apto para producción**.

Bloqueantes principales detectados:
- El proyecto **no compila en typecheck** (errores reales de dominio + tipado + imports muertos).
- Hay **deriva de contrato** entre frontend y modelo de datos (campos usados en UI que no existen en esquema/tipos y viceversa).
- Hay riesgos de seguridad en edge functions (validación de identidad incompleta, `state` OAuth no verificado criptográficamente, CORS permisivo, webhook sin verificación de firma).
- Hay deuda fuerte de arquitectura (navegación sin router, lógica de dominio distribuida y acoplada a vistas, exceso de `any`, hooks con dependencias incompletas).

---

## 2) Evidencia ejecutable (comandos corridos)

### 2.1 `npm run typecheck`
- **Resultado:** FAIL.
- Errores de tipos críticos:
  - `DriverVerification` usa propiedades inexistentes en tipos DB (`rejection_reason`, `dni`, `birth_date`, `vehicle_capacity`, `license_photo_url`, `vehicle_registration_url`, `insurance_url`, `user_profile.email`).
  - `TripRequests` usa `scheduled_for` no presente en `TripWithDetails`.
  - `RateTrip` usa `passenger_rating` no presente.
  - `SystemConfiguration` usa `surge_multiplier` no presente en tipo de `pricing_rules` (existe `surge_multiplier_max`).
  - `DemandRadar` con errores de tipado/uso API (`LiveMap` no importado, `unknown`, `new Map` mal tipado).

### 2.2 `npm run lint`
- **Resultado:** FAIL (81 errores, 37 warnings).
- Hallazgos:
  - `no-explicit-any` extendido en componentes y libs críticas (map providers, operaciones admin, inteligencia).
  - Múltiples `unused vars/imports`.
  - Múltiples `react-hooks/exhaustive-deps` (riesgo de datos stale y side effects inconsistentes).

### 2.3 `npm run build`
- **Resultado:** PASS.
- Build productivo genera bundles, pero este estado es engañoso porque typecheck/lint fallan fuerte.

---

## 3) Diagnóstico técnico por capas

## 3.1 Inconsistencias frontend ↔ tipos ↔ schema (raíz)

### Hallazgo A — Driver verification desacoplado del schema real
- La UI de validación de conductores depende de campos que **no están en `drivers`** según `database.types.ts` ni en migraciones actuales.
- Impacto: no compila, y aunque compile por bypass, rompe operación de backoffice.
- Acción raíz:
  1. Definir contrato canónico para onboarding/verificación de conductor.
  2. Migrar SQL para columnas faltantes **o** adaptar UI al modelo vigente (decisión de producto + datos).
  3. Regenerar tipos de Supabase y eliminar casts manuales.

### Hallazgo B — Divergencias en `trips` y rating
- Frontend usa `scheduled_for` y `passenger_rating` que no figuran en tipos DB.
- Impacto: fallos de compilación y de flujo de negocio (solicitudes programadas / reputación).
- Acción raíz:
  - Si esos campos son requeridos de dominio, agregar migraciones + defaults + backfill.
  - Si no son requeridos, eliminar su uso y ajustar UX/estado derivado.

### Hallazgo C — Supabase client des-tipado explícitamente
- `src/lib/supabase.ts` remueve `<Database>` y documenta workaround temporal.
- Impacto: se pierde protección estática entre queries y schema, favoreciendo deriva silenciosa.
- Acción raíz:
  - Restaurar `createClient<Database>()`.
  - Bloquear CI con chequeo de drift de tipos (generación automática + diff).

---

## 3.2 Seguridad (pagos, OAuth, RLS)

### Hallazgo D — OAuth state no protegido de forma robusta
- `mp-oauth-start` genera `state = driverId|timestamp`.
- `mp-oauth-callback` solo parsea `state` y confía en `driverId`, sin firma/HMAC ni almacenamiento previo para nonce one-time.
- Riesgo: manipulación de state/callback, account-linking indebido.
- Acción raíz:
  - Persistir `oauth_state` firmado + expiración + one-time use.
  - Validar callback contra registro previo y user intent.

### Hallazgo E — Webhook Mercado Pago sin validación fuerte de origen
- `mercadopago-webhook` procesa `req.json()` y consulta pago, pero no valida firma/hmac de webhook ni anti-replay.
- Riesgo: procesamiento de eventos falsos o repetidos, alteración de estados de pago.
- Acción raíz:
  - Verificar firma oficial de Mercado Pago (si aplica), `topic/type`, idempotency key y registro de eventos procesados.

### Hallazgo F — CORS `*` en edge functions
- Todas las edge functions exponen `Access-Control-Allow-Origin: *`.
- Riesgo: superficie abierta innecesaria para endpoints sensibles.
- Acción raíz:
  - Lista blanca por entorno (`app domains`) y bloqueo de métodos/headers mínimos.

### Hallazgo G — `accept_trip` SECURITY DEFINER sin hardening completo
- Existe función atómica (bien), pero falta endurecimiento:
  - no se ve `SET search_path` explícito;
  - no se ve `GRANT EXECUTE` explícito ni revocaciones.
- Riesgo: seguridad/predictibilidad insuficiente según buenas prácticas PostgreSQL.
- Acción raíz:
  - Añadir `SET search_path = public` dentro de función.
  - `REVOKE ALL ON FUNCTION ... FROM PUBLIC;` + grants mínimos.

---

## 3.3 Arquitectura y mantenibilidad

### Hallazgo H — Navegación principal sin router
- `App.tsx` resuelve navegación por estado/perfil sin `react-router`.
- Impacto: rutas no deep-linkables, guardas dispersas, testing e instrumentación más difíciles.
- Acción raíz:
  - Introducir routing declarativo por dominios (`/passenger/*`, `/driver/*`, `/admin/*`) con guards centralizados.

### Hallazgo I — Módulos monolíticos con mezcla UI + acceso datos + reglas
- Páginas admin/driver concentran fetch, transformación y render en un mismo archivo.
- Impacto: baja cohesión, alta complejidad ciclomática, difícil test unitario.
- Acción raíz:
  - Extraer repositorios/servicios tipados y hooks de dominio.
  - Mantener componentes presentacionales puros.

### Hallazgo J — Deuda de hooks y side effects
- Numerosos `useEffect` con deps incompletas.
- Impacto: data races, re-fetch inesperado, stale closures.
- Acción raíz:
  - Estabilizar funciones con `useCallback` o mover a hooks dedicados.
  - Activar enforcement estricto en CI para no introducir nuevos warnings.

---

## 3.4 Geolocalización y mapas

### Hallazgo K — `any` extensivo en providers de mapas
- `mapbox.ts` y `nominatim.ts` modelan respuestas con `any`.
- Impacto: errores de runtime ante cambios de API y normalización inconsistente.
- Acción raíz:
  - Tipar DTOs de APIs externas y parsear con validación runtime.

### Hallazgo L — Restricción geográfica hardcodeada a Rosario
- Bounded-box fijo en provider.
- Impacto: acople geográfico fuerte; riesgo de inconsistencias con `service_zones` del backend.
- Acción raíz:
  - Mover límites a configuración server-side versionada o `service_zones` activas.

---

## 3.5 Testing y observabilidad

### Hallazgo M — Sin suite de tests automatizados visible
- No hay scripts de test en `package.json`.
- Impacto: regresiones funcionales y de seguridad detectadas tarde.
- Acción raíz:
  - Base mínima: unit tests para libs de dominio + tests de integración de flows críticos (solicitud viaje, aceptar viaje, pago, OAuth callback).

### Hallazgo N — Logging sin estructura ni correlación
- Uso de `console.error/log` directo en frontend y edge functions.
- Impacto: trazabilidad limitada en incidentes reales.
- Acción raíz:
  - Logger estructurado con `request_id`, `trip_id`, `driver_id`, nivel y contexto.

---

## 4) Plan priorizado (ejecutable)

## Prioridad 0: bloqueantes de producción
1. Corregir **todos** los errores de `typecheck` y `lint error` (no warnings todavía), priorizando inconsistencias de dominio.  
2. Resolver contrato de `drivers`, `trips`, `ratings` (migraciones o refactor UI) y regenerar tipos Supabase.  
3. Rehabilitar tipado fuerte en cliente Supabase (`createClient<Database>`).  
4. Estabilizar `DemandRadar` (tipos, imports, `unknown` → tipos concretos) para recuperar compilación limpia.

**DoD P0:** `npm run typecheck`, `npm run lint`, `npm run build` en verde en CI.

## Prioridad 1: seguridad y datos
1. Harden OAuth state (nonce persistido + firma + expiración + one-time-use).  
2. Validar autenticidad/idempotencia de webhook MP y endurecer update de pagos.  
3. Restringir CORS por entorno y endpoint.  
4. Endurecer funciones `SECURITY DEFINER` (search_path + GRANT/REVOKE explícitos).  
5. Revisar cobertura RLS tabla por tabla y políticas de actualización cruzada.

**DoD P1:** threat model mínimo documentado + tests de seguridad básicos (callback forged/webhook replay).

## Prioridad 2: arquitectura y mantenibilidad
1. Introducir router con guards por rol y layout por dominio.  
2. Extraer capa de acceso a datos tipada (`repositories`) + hooks de dominio.  
3. Eliminar `any` en proveedores de mapas, admin ops e inteligencia.  
4. Normalizar side effects/hook dependencies.

**DoD P2:** reducción medible de complejidad por módulo y cobertura de tests unitarios en dominio core.

## Prioridad 3: UX y observabilidad
1. Estados de error/empty/retry homogéneos en flujos críticos.  
2. Logger estructurado + tracking de eventos clave (trip lifecycle, payment lifecycle, oauth lifecycle).  
3. Dashboards de salud operacional (errores edge functions, latencia, tasa de éxito de pagos).

**DoD P3:** métricas y alertas mínimas en producción.

---

## 5) Backlog accionable (issues)

1. **[P0]** Alinear `DriverVerification` con schema real de `drivers` y `user_profiles`.  
2. **[P0]** Alinear `TripRequests` y `RateTrip` con `trips/ratings` reales (o migrar schema).  
3. **[P0]** Reinstaurar cliente Supabase tipado y remover castings masivos.  
4. **[P0]** Resolver errores de tipado en `DemandRadar` y dependencias de mapa.  
5. **[P1]** Implementar almacén/validación de OAuth state seguro.  
6. **[P1]** Verificación de firma + idempotencia para webhook MP.  
7. **[P1]** Hardening SQL para `accept_trip` (search_path, grants).  
8. **[P1]** CORS whitelist por entorno en todas las edge functions.  
9. **[P2]** Migrar navegación a router y centralizar guards.  
10. **[P2]** Extraer servicios de dominio y reducir componentes monolíticos.  
11. **[P2]** Eliminar `any` y agregar validación runtime de payloads externos.  
12. **[P3]** Instrumentación y observabilidad de flows críticos.

---

## 6) Checklist de remediación

- [ ] `npm run typecheck` en verde.
- [ ] `npm run lint` sin errores.
- [ ] `npm run build` en verde.
- [ ] Contratos frontend↔DB alineados (`drivers`, `trips`, `ratings`, `pricing_rules`).
- [ ] Tipos Supabase regenerados y aplicados en todo el cliente.
- [ ] OAuth state seguro (nonce+firma+TTL+one-time).
- [ ] Webhook MP con autenticidad + idempotencia.
- [ ] CORS restringido por entorno.
- [ ] SECURITY DEFINER hardening aplicado.
- [ ] Router por dominio con guards.
- [ ] Test suite mínima (unit + integración de flujos críticos).
- [ ] Logging estructurado y métricas de operación.

---

## 7) Secuencia propuesta de trabajo (sprints)

### Sprint 1 (P0)
- Congelar features nuevas.
- Cerrar drift de schema/tipos/frontend.
- Recuperar verde en typecheck/lint/build.

### Sprint 2 (P1)
- Seguridad de OAuth/webhook/CORS.
- Hardening SQL/RLS y pruebas de abuso básicas.

### Sprint 3 (P2)
- Router + separación por capas + reducción de `any`.
- Inicio de test suite de dominio.

### Sprint 4 (P3)
- Observabilidad end-to-end y mejoras UX resiliente.

