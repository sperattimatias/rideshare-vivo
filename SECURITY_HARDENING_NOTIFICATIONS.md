# Security hardening: notifications + SECURITY DEFINER

## Qué se endureció

### 1) Policies RLS de `notifications`
- Se eliminó la policy de INSERT permisiva (`WITH CHECK (true)`).
- Se mantuvo acceso de usuario final solo para:
  - `SELECT` de sus propias notificaciones (`auth.uid() = user_id`)
  - `UPDATE` de sus propias notificaciones (`USING` + `WITH CHECK` por `auth.uid()`).

### 2) RPC `mark_notification_as_read`
- Ahora valida sesión (`auth.uid()`).
- Solo actualiza si `notification.user_id = auth.uid()`.
- Devuelve excepción controlada si no existe o no pertenece al usuario.
- Se endureció `search_path` en función `SECURITY DEFINER`.

### 3) RPC `mark_all_notifications_as_read`
- Ya no recibe `p_user_id` (evita spoofing horizontal).
- Deriva el usuario desde `auth.uid()`.
- Marca solo notificaciones propias.
- Retorna cantidad de filas afectadas.
- Se endureció `search_path` en función `SECURITY DEFINER`.

### 4) Función interna `create_notification`
- Se agregó validación mínima de payload y `p_user_id`.
- Se endureció `search_path`.
- Se restringió ejecución:
  - `REVOKE ALL ... FROM PUBLIC`
  - `GRANT EXECUTE ... TO service_role`
- Triggers siguen funcionando (invocación interna SQL).

### 5) Triggers de notificación automáticos
- `notify_new_message`, `notify_trip_accepted`, `notify_driver_arrived`, `notify_trip_completed`
- Todas quedaron con `SECURITY DEFINER` + `SET search_path = public, pg_temp`.

## Resultado funcional esperado
- Un usuario autenticado no puede marcar notificaciones ajenas.
- Un usuario autenticado no puede crear notificaciones arbitrarias por RPC/SQL cliente.
- Los eventos de sistema por triggers continúan creando notificaciones.
