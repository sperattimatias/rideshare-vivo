## Summary
-

## Why
-

## Quality gates (required)
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Smoke checks de flujo crítico (si aplica)

## Schema/types safety
- [ ] Si hubo cambios en schema/migraciones, se actualizaron/regeneraron tipos (`src/lib/database.types.ts`)
- [ ] No se introducen `any` nuevos en módulos críticos sin justificación
- [ ] No hay `eslint-disable` sin explicación técnica

## Risk & rollback
- Riesgos:
- Rollback plan:
