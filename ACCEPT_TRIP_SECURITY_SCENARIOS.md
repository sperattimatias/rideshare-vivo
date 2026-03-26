# accept_trip RPC — escenarios cubiertos

## Objetivo
Garantizar que la aceptación de viajes sea atómica, segura y no manipulable desde frontend.

## Controles implementados

1. **Autenticación obligatoria**
   - Se valida `auth.uid()`.
   - Si no hay sesión: `NOT_AUTHENTICATED`.

2. **Ownership del conductor**
   - El `driver_id` se deriva en backend por `drivers.user_id = auth.uid()`.
   - El frontend no envía `driver_id`.
   - Si no existe conductor asociado: `DRIVER_NOT_FOUND`.

3. **Elegibilidad del conductor**
   - Debe estar `status = 'ACTIVE'`.
   - Debe estar `can_receive_trips = true` e `is_online = true`.
   - Debe estar libre (`is_on_trip = false`).
   - Códigos de salida:
     - `DRIVER_NOT_ACTIVE`
     - `DRIVER_NOT_ENABLED`
     - `DRIVER_ALREADY_ON_TRIP`

4. **Disponibilidad del viaje y carrera entre conductores**
   - `UPDATE ... WHERE id = p_trip_id AND status = 'REQUESTED' AND driver_id IS NULL`.
   - Esto hace que solo un conductor pueda ganar la carrera de aceptación.
   - Si otro la ganó primero: `TRIP_ALREADY_TAKEN`.

5. **Atomicidad e integridad de estado**
   - La función se ejecuta en una sola transacción DB (semántica por llamada SQL).
   - Al aceptar viaje, en la misma operación lógica se marca `drivers.is_on_trip = true`.

6. **Hardening de seguridad SQL**
   - `SECURITY DEFINER` con `SET search_path = public, pg_temp`.
   - `REVOKE ALL ... FROM PUBLIC` y `GRANT EXECUTE ... TO authenticated`.

## Contrato de respuesta

`RETURNS TABLE(success, code, message, trip_id, driver_id)`

- `success = true` y `code = 'ACCEPTED'` para éxito.
- `success = false` + `code` semántico para errores de negocio/seguridad.

