# Plan de Fases 10/10 para arreglar lo roto e incompleto (rideshare-vivo)

**Fecha:** 2026-03-25  
**Objetivo:** llevar el repo a un estado de calidad de ingeniería “release-ready” con gates técnicos estrictos y trazabilidad.

---

## Principios del plan

1. **No más drift de esquema/tipos** (fuente de verdad: migraciones + tipos generados).
2. **No merge sin gates** (`lint`, `typecheck`, `build`, smoke tests).
3. **Priorizar riesgo operacional** (auth, trips, pagos, soporte).
4. **Cambios pequeños, verificables y reversibles**.
5. **Métricas desde el día 1** para saber si realmente estamos mejorando.

---

## Fase 0 — Congelamiento controlado y baseline (Día 0)

### Objetivo
Congelar deuda nueva y establecer línea base medible.

### Tareas
- Activar política temporal: **solo PRs de estabilización**.
- Ejecutar baseline y guardar artefactos:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- Crear tablero de seguimiento con:
  - # errores TS
  - # errores ESLint
  - # warnings ESLint
  - tiempo de build
  - tamaño de bundles

### Criterio de salida
- Baseline publicado y compartido.
- Lista priorizada de errores agrupada por dominio (Supabase, UI, mapas, soporte, admin).

---

## Fase 1 — Alineación Supabase (crítico) (Día 1-2)

### Objetivo
Eliminar la causa raíz de los errores `never` y llamadas RPC mal tipadas.

### Tareas
- Regenerar `src/lib/database.types.ts` desde el esquema real de Supabase.
- Validar que `trips` incluya coordenadas (`origin_latitude`, `origin_longitude`, `destination_latitude`, `destination_longitude`).
- Validar que estén tipadas tablas nuevas de soporte:
  - `support_departments_new`
  - `support_categories_new`
  - `support_conversations`
  - `support_conversation_messages`
  - `support_assignments`
  - `support_agent_status`
- Tipar RPC usadas por app:
  - `mark_all_notifications_as_read`
  - `calculate_driver_score`
  - `check_driver_performance_alerts`
  - y cualquier otra invocada vía `supabase.rpc(...)`.
- Añadir script de verificación para detectar drift (fail si el tipo generado difiere del versionado).

### Criterio de salida
- 0 errores TS causados por `never` en queries Supabase.
- `database.types.ts` reflejando esquema actual.

---

## Fase 2 — Contratos de UI y errores de tipado de componentes (Día 2-3)

### Objetivo
Corregir incompatibilidades en APIs internas de componentes y props.

### Tareas
- Corregir contratos de componentes compartidos (`Input`, `Select`, etc.) según uso real.
- Estandarizar props opcionales/documentación mínima de cada componente base.
- Corregir inconsistencias de tipos en pantallas críticas (ej. `CompleteProfile`, flujos de viaje activo).
- Donde aplique, reemplazar casts inseguros por tipos explícitos.

### Criterio de salida
- 0 errores TS por props no declaradas/incompatibles.
- Librería de componentes base con contratos consistentes.

---

## Fase 3 — Limpieza de calidad estática (Día 3-5)

### Objetivo
Llegar a **lint limpio** y reducir deuda técnica inmediata.

### Tareas
- Eliminar imports/variables no usadas.
- Reducir/eliminar `any` en módulos críticos (`adminOperations`, `intelligenceSystem`, mapas, soporte).
- Resolver `react-hooks/exhaustive-deps` con estrategia clara:
  - `useCallback` / `useMemo` cuando corresponda.
  - justificar excepciones con comentario técnico mínimo.
- Revisar reglas y severidades de ESLint para evitar ruido improductivo.

### Criterio de salida
- `npm run lint` sin errores.
- Warnings reducidos a un umbral acordado (ideal: 0; máximo temporal: <10 con tickets abiertos).

---

## Fase 4 — Endurecimiento de flujos críticos (Día 5-8)

### Objetivo
Asegurar consistencia funcional donde más duele en negocio.

### Flujos críticos
1. Registro/login y creación de perfil.
2. Solicitud de viaje → aceptación → progreso → completado.
3. Pago y conciliación de estado de viaje.
4. Soporte/chat y notificaciones.

### Tareas
- Agregar smoke tests (mínimo por flujo crítico).
- Validar transiciones de estado de viaje con casos felices y casos inválidos.
- Verificar idempotencia básica en operaciones sensibles (pago/cierre de viaje).
- Revisar manejo de errores y mensajes al usuario en paths de fallo.

### Criterio de salida
- Smoke tests verdes en CI para flujos críticos.
- No regresiones evidentes en happy path.

---

## Fase 5 — Performance y arquitectura de build (Día 8-10)

### Objetivo
Bajar riesgo de UX degradada y preparar escalabilidad del front.

### Tareas
- Implementar code splitting por rutas (dashboards/admin/mapas).
- Revisar dependencias pesadas en bundle principal.
- Definir presupuesto de bundle (ej. JS inicial < 350KB gzip, a ajustar por contexto).
- Medir antes/después y documentar trade-offs.

### Criterio de salida
- Reducción medible del chunk principal.
- Build sin warnings críticos de tamaño (o justificados con plan).

---

## Fase 6 — Release gates y gobernanza continua (Día 10+)

### Objetivo
Evitar recaídas: calidad sostenida, no “one-shot cleanup”.

### Tareas
- CI obligatorio en cada PR:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - smoke tests
- Template de PR con checklist técnico obligatorio.
- Definir DoD (Definition of Done):
  - sin `any` nuevo en módulos críticos
  - sin `eslint-disable` sin justificación
  - cambios de esquema acompañados por regeneración de tipos
- Auditoría semanal de salud técnica (30 min, métricas del tablero).

### Criterio de salida
- 4 semanas seguidas sin regresión de métricas clave.

---

## Matriz de prioridad (qué atacar primero)

### P0 (bloqueante)
- Drift Supabase tipos/esquema.
- Errores TS en flujos de viaje/pago/auth.
- Gates de CI inexistentes.

### P1 (muy alto)
- `any` en módulos críticos.
- Contratos de componentes rotos.
- Hooks con dependencias incorrectas en flujos sensibles.

### P2 (alto)
- Bundle size y code splitting.
- Refactors de legibilidad y deuda residual.

---

## KPIs de éxito (10/10)

- **TypeScript errors:** 0
- **ESLint errors:** 0
- **ESLint warnings:** ≤ 5 (objetivo final 0)
- **Build:** verde en CI
- **Smoke tests críticos:** 100% verde
- **Incidentes post-release por regresión:** tendencia a 0
- **Lead time de PR de estabilización:** decreciente semana a semana

---

## Riesgos y mitigaciones

1. **Riesgo:** scope creep al intentar “arreglar todo junto”.  
   **Mitigación:** fases cortas, PRs acotados por dominio.

2. **Riesgo:** cambios de esquema sin regenerar tipos.  
   **Mitigación:** check automático de drift en CI.

3. **Riesgo:** presión de features antes de estabilizar.  
   **Mitigación:** política de freeze parcial + excepción sólo con aprobación técnica.

---

## Entregables concretos esperados

1. `database.types.ts` regenerado y validado.
2. Pipeline CI con gates obligatorios.
3. Repo con `lint/typecheck/build` en verde.
4. Smoke tests para flujos críticos.
5. Documento de readiness actualizado con evidencia real de calidad.

---

## Recomendación final

Si quieren un resultado **10/10 real** (no cosmético), ejecuten este plan **en orden**, sin saltar Fase 1 ni Fase 6. La Fase 1 quita la causa raíz técnica; la Fase 6 evita volver a caer.
