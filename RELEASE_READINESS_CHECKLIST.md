# Release Readiness Checklist (Producción)

## 1) Seguridad
- [ ] Confirmar migraciones aplicadas en orden (`supabase db push` o pipeline equivalente).
- [ ] Verificar que `accept_trip` solo derive identidad de `auth.uid()`.
- [ ] Verificar webhook Mercado Pago con token válido y sin exposición de secretos en logs.
- [ ] Revisar RLS activa para `operational_events`, `trip_payments`, `mp_oauth_sessions`, `audit_logs`.
- [ ] Validar permisos de funciones `SECURITY DEFINER` (sin GRANT innecesarios a `PUBLIC`).

## 2) Datos y consistencia
- [ ] Ejecutar smoke test de aceptación de viaje concurrente (dos conductores sobre mismo `trip_id`).
- [ ] Ejecutar prueba de idempotencia de pago (`external_reference` / `idempotency_key`).
- [ ] Validar que OAuth consume `state` una sola vez y respeta expiración.
- [ ] Verificar que eventos críticos persistan en `operational_events`:
  - pagos (`PAYMENT_PREFERENCE_CREATED`, `PAYMENT_WEBHOOK_PROCESSED`)
  - oauth (`OAUTH_LINK_STARTED`, `OAUTH_LINK_COMPLETED`)
  - aceptación de viajes (`ACCEPT_TRIP`)
  - cambios admin sensibles (`DRIVER_APPROVED`, `DRIVER_REJECTED`, `DRIVER_SUSPENDED`, `DRIVER_REACTIVATED`)

## 3) Build y calidad
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test`

## 4) Entorno / configuración
- [ ] Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`.
- [ ] Edge functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] `system_settings` completos para pagos:
  - `mp_access_token`
  - `mp_app_id`
  - `mp_client_secret`
  - `mp_platform_seller_id`
  - `mp_environment`

## 5) Monitoreo y operación
- [ ] Revisar logs estructurados por `request_id` en edge functions.
- [ ] Confirmar trazabilidad de UI crítica mediante `trace` en mensajes de error.
- [ ] Definir alerta operativa si `operational_events` registra > X fallos por dominio en ventana de 15 minutos.
- [ ] Definir tablero mínimo (pagos aprobados/rechazados, fallos OAuth, rechazos de aceptación de viaje).

## 6) Go/No-Go
- [ ] No hay bloqueantes en seguridad, build o datos.
- [ ] Owner de release y plan de rollback definidos.
- [ ] Comunicación de cambios a soporte/operaciones completada.
