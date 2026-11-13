# ADR 0004 — Observabilidad local y estática

- **Estado:** aceptada (Incremento #08)

## Contexto

Hacían falta métricas trazables (pass rate, flaky, duración) sin añadir
infraestructura. Antes del #08, CI solo producía un reporte HTML, que no
sirve como fuente de datos.

## Alternativas

1. **Plataforma externa o base de datos.** Añade coste, credenciales y
   una dependencia innecesaria para el volumen actual.
2. **Hacer commit del histórico en el repositorio.** Crece sin límite,
   genera conflictos y exige permisos de escritura en CI.
3. **El reporter JSON nativo, un contrato propio versionado, un
   histórico local ignorado por Git y un reporte Markdown.** ← elegida

## Decisión

- El reporter `json` de Playwright se acompaña de
  `config.metadata` con las variables `GITHUB_*` que existan.
- El parser valida el formato real. El normalizador (contrato `1.0.0`)
  separa el resultado lógico de los intentos.
- Las métricas son funciones puras con denominadores explícitos.
- Si faltan datos se muestra "Insufficient data"; las tendencias
  requieren 5 o más runs comparables.
- **No corre en CI**, así que no puede alterar el resultado de los
  gates.

## Consecuencias

- **Lo positivo:** cero dependencias, todo es auditable y está cubierto
  por 28 pruebas unitarias con datos sintéticos etiquetados.
- **Lo negativo:**
  - El histórico no es durable.
  - Importar desde CI requiere descargar a mano el artefacto (que exige
    autenticación).
  - El artefacto caduca a los 30 días.
- **Cuándo revisar esta decisión:** cuando haga falta un histórico
  compartido entre personas o máquinas.
