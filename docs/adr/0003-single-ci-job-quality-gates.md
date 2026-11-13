# ADR 0003 — Un solo job de CI con quality gates

- **Estado:** aceptada (Incremento #07)

## Contexto

El workflow original ejecutaba las pruebas, pero no validaba tipos, no
limitaba permisos y no conservaba trazas cuando algo fallaba.

## Alternativas

1. **Varios jobs (typecheck, API, UI).** Daría checks separados, pero
   duplicaría el setup y repartiría los reportes HTML en varios
   artefactos.
2. **Un segundo workflow.** Sería redundante.
3. **Hacer evolucionar el workflow existente con un solo job `test`.**
   ← elegida

## Decisión

- Pasos en orden: `npm ci` → **Typecheck**
  (`npx --yes -p typescript@7.0.2 tsc --noEmit`) → navegadores →
  `npx playwright test` (todos los proyectos).
- `permissions: contents: read`, y `concurrency` que cancela solo los
  runs antiguos de un PR.
- Los artefactos son `playwright-report` y `playwright-results-json`
  (siempre), y `playwright-test-results` (solo si falla). **Ninguna
  subida cambia el resultado del job.**
- TypeScript se ejecuta con `npx` y versión fijada, por decisión
  humana: no se añadió como dependencia.

## Consecuencias

- **Lo positivo:**
  - El check es único y simple (`test`).
  - Falla si cualquier gate falla, o si se encuentran cero pruebas.
- **Lo negativo:**
  - Con push y PR en todas las ramas hay runs duplicados (decisión
    aceptada).
  - El lockfile no protege la versión de TypeScript.
- **Pendiente:** el check **no bloquea el merge** hasta que un admin
  configure un ruleset. Ver
  [ci-quality-gates.md](../ci-quality-gates.md).
