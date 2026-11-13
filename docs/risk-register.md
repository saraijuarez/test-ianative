# Registro de riesgos

Escala: **Alta / Media / Baja**. El riesgo residual se calcula después
de las mitigaciones existentes.

| ID | Riesgo | Probabilidad | Impacto | Mitigación existente | Riesgo residual | Responsable / siguiente acción |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Una regresión llega a `main` porque el check no bloquea el merge | Media | Alto | Check `test` en cada push y PR | **Alto** | Admin: crear un ruleset que exija `test` (CAP-03) |
| R-02 | SauceDemo, DummyJSON o playwright.dev no están disponibles | Media | Medio | `retries: 2` en CI; clasificación de fallos en la estrategia | Medio | Revisar las trazas antes de tocar pruebas |
| R-03 | La intermitencia queda oculta porque los reintentos dejan el check en verde | Media | Medio | El reporte marca *flaky*; hay métrica de flaky rate | Medio | Evaluar `--fail-on-flaky-tests` (P3) |
| R-04 | Los datos de los sitios públicos cambian (precio, textos, catálogo) | Baja | Medio | Los valores esperados se verificaron contra el DOM y la API reales | Bajo | Si una aserción falla por datos, actualizarla con evidencia, sin debilitarla |
| R-05 | Una prueba pasa sin comprobar nada (falso verde) | Baja | Alto | Mutación controlada de cada aserción nueva; los gates fallan con cero pruebas | Bajo | Repetirlo en cada aserción nueva |
| R-06 | Se exponen secretos en el código o en los artefactos | Baja | Alto | Solo hay credenciales públicas de demo; `contents: read`; el normalizador redacta stdout y errores | Bajo | — |
| R-07 | Sin histórico real, las métricas llevan a conclusiones equivocadas | Media | Medio | "Insufficient data" y 5 o más runs comparables para tendencias | Medio | Importar los artefactos de CI con regularidad (caducan a los 30 días) |
| R-08 | La versión de Node (`lts/*`) o de las actions cambia y rompe CI | Baja | Medio | `npm ci` con lockfile; Playwright fijado | Medio | Fijar la versión de Node y fijar las actions por SHA (P3) |
| R-09 | Se acepta un cambio propuesto por la IA sin revisión | Baja | Alto | Puertas de aprobación humana en cada incremento; diffs revisados | Bajo | Mantener el proceso (ver capstone-review §registro de IA) |
| R-10 | Las pruebas de ejemplo distorsionan las métricas y el gate | Media | Bajo | ADR 0005 documentado | Bajo | Decidir sobre CAP-08 |
