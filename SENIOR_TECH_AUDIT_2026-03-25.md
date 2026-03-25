# Senior Technical Audit — rideshare-vivo

**Fecha:** 2026-03-25  
**Alcance:** Frontend React/TypeScript + integración Supabase + migraciones SQL + estado de calidad del repo.

## Resumen ejecutivo

El repo tiene una base funcional interesante, pero **no está en un estado saludable de mantenibilidad/fiabilidad** para producción. El problema dominante es una **deriva entre el esquema real de Supabase y los tipos TypeScript** (`database.types.ts`), que dispara cientos de errores de tipado y oculta riesgos reales en runtime.

---

## Hallazgos críticos

### 1) Deriva severa entre migraciones y `database.types.ts`

- El código usa un cliente fuertemente tipado (`createClient<Database>`) en `src/lib/supabase.ts`, por lo que cualquier desalineación rompe inferencia y operaciones CRUD/RPC.
- `database.types.ts` no incluye tablas y funciones que sí existen en migraciones recientes:
  - tablas de soporte (`support_categories_new`, `support_conversations`, `support_conversation_messages`, etc.).
  - funciones RPC (`mark_all_notifications_as_read`, `calculate_driver_score`, `check_driver_performance_alerts`, etc.).
- También faltan columnas nuevas en `trips` (`origin_latitude`, `origin_longitude`, `destination_latitude`, `destination_longitude`) agregadas por migración.

**Impacto:** errores masivos `never` en `.from().insert()/update()/select()` y en `rpc()`, pérdida de seguridad de tipos, alto riesgo de bugs no detectados.

**Recomendación:** regenerar tipos desde el esquema de Supabase en CI y bloquear merges si hay drift.

---

### 2) Estado de calidad: lint y typecheck fallan de forma estructural

- `npm run lint` devuelve **134 problemas** (98 errores, 36 warnings).
- `npm run typecheck` devuelve cientos de errores (salida extensa truncada por volumen).
- El proyecto **sí build-ea** con `vite build`, lo que enmascara deuda porque el build no exige typecheck limpio.

**Impacto:** degradación de calidad acumulativa, alta probabilidad de regresiones, dificultad para refactor seguro.

**Recomendación:** hacer obligatorio en CI: `lint + typecheck + build`, y no permitir merge con errores.

---

### 3) Inconsistencia documental vs realidad técnica

- `BETA_READINESS_AUDIT.md` declara “**LISTO PARA BETA FUNCIONAL**” y “**Bloqueadores críticos: 0**”.
- Ese estado no es consistente con el estado actual de compilación tipada/lint.

**Impacto:** decisiones de producto/operación basadas en una percepción de salud no alineada con evidencia técnica.

**Recomendación:** actualizar el audit de readiness con gates objetivos (lint/typecheck/tests) y fecha de evidencia verificable.

---

### 4) Contrato de componentes inconsistente (`Input`)

- El componente `Input` no define `helperText` en su interfaz.
- Varias pantallas sí le pasan `helperText` (ej. `CompleteProfile`), generando error de tipos.

**Impacto:** fricción de DX, errores en compilación tipada, APIs internas inconsistentes.

**Recomendación:** unificar contrato de UI components (Storybook o docs internas + tests de tipos).

---

## Hallazgos importantes (no bloqueantes inmediatos, pero relevantes)

1. **Uso extensivo de `any` y variables no usadas** en múltiples módulos (maps, admin, support, dashboards).  
2. **Hooks con dependencias faltantes** (`react-hooks/exhaustive-deps`) repetidos, con riesgo de stale closures o side-effects inesperados.  
3. **Warnings de performance de bundle**: chunk principal > 500 KB minificado.

---

## Plan recomendado (priorizado)

### Fase 1 (inmediata, 1-2 días)
1. Regenerar `database.types.ts` desde Supabase y commitearlo.
2. Corregir errores TS por drift (`never`, columnas faltantes, RPC signatures).
3. Añadir `npm run typecheck` al pipeline de CI como requisito de merge.

### Fase 2 (corto plazo, 2-4 días)
1. Reducir `any` en módulos críticos (auth, trips, pagos, soporte).
2. Limpiar imports/estados no usados y warnings de hooks.
3. Corregir APIs de componentes compartidos (`Input`, etc.) y tipar props de forma consistente.

### Fase 3 (siguiente sprint)
1. Introducir pruebas mínimas de humo para flujos críticos (solicitud de viaje, aceptación, finalización, pago).
2. Code splitting de rutas/páginas pesadas (dashboards/admin/maps).
3. Definir release gate técnico (lint=0 errors, typecheck=0, build ok, smoke tests ok).

---

## Riesgo global estimado

- **Riesgo técnico actual:** Alto  
- **Riesgo operacional para beta real:** Medio-Alto  
- **Confianza para cambios rápidos sin romper:** Baja

