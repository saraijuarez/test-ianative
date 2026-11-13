# Enterprise Capstone — Final Engineering Review

> **Fecha:** 2026-11-13.
> **Rama:** `capstone/enterprise-review`, construida sobre
> `obs/test-metrics`.
> Cada afirmación remite a evidencia real (E-xx). Lo que no tiene
> evidencia se marca como **pendiente**.

## 1. Executive summary

**Estado real:**
- **El framework funciona:** pruebas de UI en SauceDemo en 3 navegadores
  y pruebas de API en DummyJSON.
- **El gate de CI se pone rojo de verdad:** lo demuestran dos runs
  controlados, uno por error de tipos y otro por una aserción fallida.
- **La observabilidad funciona,** pero está en una rama: todavía no se
  integró en `main`.

**Riesgos críticos:**
- `main` **no tiene ruleset**, así que el check informa pero no bloquea
  el merge (E-12).
- El histórico de métricas es local y escaso; no hay datos para
  tendencias.

**Alcance aprobado:**
- Aprobados: CAP-02, CAP-04, CAP-05, CAP-06, CAP-07, CAP-09, CAP-10.
- CAP-08: se mantienen los ejemplos de Playwright.
- CAP-01 y CAP-03 requieren acciones humanas y quedan fuera de este
  trabajo.

## 2. Implemented changes

| Change | Files | Reason | Approval | Result |
| --- | --- | --- | --- | --- |
| CAP-06 Login rechazado | `starter/pages/login-page.ts`, `starter/tests/saucedemo.spec.ts` | BR-01 solo tenía el caso positivo | Aprobado | ✅ E-03, E-04 |
| CAP-10 Precio en el catálogo | `starter/pages/inventory-page.ts`, `starter/tests/saucedemo.spec.ts` | BR-02 solo comprobaba el conteo | Aprobado | ✅ E-03, E-04 |
| CAP-07 Contrato 404 | `starter/tests/api/products.spec.ts` | BR-04 sin contrato de error | Aprobado | ✅ E-02, E-04 |
| CAP-09 Mínimo privilegio | `.github/workflows/validate-kit.yml` | No tenía bloque `permissions` | Aprobado | ✅ E-11 (Validate Kit en verde) |
| CAP-02 Prueba controlada de fallo en CI | Rama desechable `capstone/gate-failure-probe`, **borrada** | AC-06 sin evidencia remota | Aprobado | ✅ E-07, E-08 |
| CAP-04 READMEs corregidos | `README.md`, `starter/README.md` | Decían "no Page Objects" y "6 tests" | Aprobado | ✅ Revisión del diff |
| CAP-05 Paquete documental | `docs/test-strategy.md`, `architecture.md`, `traceability.md`, `risk-register.md`, `adr/0001–0005`, `capstone-review.md`, `capstone-defense.md` | AC-01, AC-02, AC-09 | Aprobado | ✅ |

## 3. Validaciones ejecutadas

| ID | Command/execution | Environment | Commit/configuration | Result | Evidence | Limitations |
| --- | --- | --- | --- | --- | --- | --- |
| E-01 | `npx --yes -p typescript@7.0.2 tsc --noEmit` | Local, Windows, Node 26.13.0 | Árbol de `54b2812` | exit 0 | Salida de consola | — |
| E-02 | `npx playwright test --project=api` | Local | `54b2812` | 2/2 passed | Salida de consola | Depende de DummyJSON |
| E-03 | `npx playwright test tests/saucedemo.spec.ts --project=chromium --project=firefox --project=webkit --repeat-each=5` | Local | `54b2812` | 45/45 passed | Salida de consola | 5 repeticiones no prueban que la intermitencia sea cero |
| E-04 | Mutación controlada: texto de error, precio y status 404 → valores incorrectos | Local | Archivos restaurados desde una copia | **3 failed** (las 3 mutadas), 2 passed, exit 1 | Salida de consola | Mutación manual, no una herramienta de mutation testing |
| E-05 | `npx playwright test` (suite completa) | Local | `54b2812` | 17/17 passed, 21.9 s | `results/playwright-results.json`, sha256 `5f46c4c5…` | retries = 0 en local |
| E-06 | `npm run obs:test`; `obs:import` de E-05 | Local | `54b2812` | 28/28 passed; importado `complete`, 17 passed | `observability/history/` (local) | Las pruebas unitarias usan datos **sintéticos** etiquetados |
| E-07 | Prueba A: error de tipos en una rama desechable | GitHub Actions, `ubuntu-latest` | `6efd276` | **failure** en el paso *Typecheck*; pruebas `skipped` | [Run 43355472145](https://github.com/saraijuarez/test-ianative/actions/runs/43355472145) | La rama ya se borró; el run sigue visible |
| E-08 | Prueba B: aserción fallida en una rama desechable | GitHub Actions | `b328fc7` | **failure** en *Run API + UI tests*; artefactos `playwright-report`, `playwright-results-json` y `playwright-test-results` | [Run 43355734301](https://github.com/saraijuarez/test-ianative/actions/runs/43355734301) | Igual que E-07 |
| E-09 | Push a `main` | GitHub Actions | `0e05766` | success | [Run 43347490538](https://github.com/saraijuarez/test-ianative/actions/runs/43347490538) | Antes de CAP-06/07/10 |
| E-10 | Push de `obs/test-metrics` | GitHub Actions | `624f8a2` | success; `playwright-results-json` subido | [Run 43351761252](https://github.com/saraijuarez/test-ianative/actions/runs/43351761252) | El artefacto no se ha importado (requiere autenticación) |
| E-11 | Push de `capstone/enterprise-review` (incluye CAP-06/07/09/10) | GitHub Actions | `039f7c9` | *Playwright Tests* **success** (Typecheck ✅, API + UI ✅; `playwright-report` y `playwright-results-json` subidos); *Validate Kit* **success** con `permissions: contents: read` | [Run 43356207776](https://github.com/saraijuarez/test-ianative/actions/runs/43356207776), [Run 43356207733](https://github.com/saraijuarez/test-ianative/actions/runs/43356207733) | El conteo por prueba está en el artefacto (requiere autenticación); en local, el mismo código dio 17/17 (E-05) |
| E-12 | `GET /repos/…/rules/branches/main` y `GET /repos/…/branches/main` | API pública de GitHub | — | `[]` y `protected: false` | Respuesta de la API | La protección clásica requiere admin para verla (401) |

## 4. Acceptance matrix

| AC | Status | Evidence | Gap |
| --- | --- | --- | --- |
| AC-01 Requisitos y riesgos | **Cumple** | [test-strategy.md](test-strategy.md), [risk-register.md](risk-register.md) | — |
| AC-02 Arquitectura justificada | **Cumple** | [architecture.md](architecture.md), [adr/](adr/) | — |
| AC-03 UI validada | **Cumple** | E-03, E-04, E-05 (local); E-11 (CI) | La cobertura se limita a lo descrito en traceability.md |
| AC-04 API validada | **Cumple** | E-02, E-04 (local); E-11 (CI) | Solo el recurso `/products/{id}` |
| AC-05 CI funcional | **Cumple** | E-07, E-08, E-09, E-10, con commit asociado | — |
| AC-06 Gates fiables | **Cumple** en el workflow / **Parcial** como política | E-07 y E-08 (rojo), E-09 (verde) | Sin ruleset (E-12): no bloquea el merge |
| AC-07 Resultados trazables | **Parcial** | E-08 y E-10 (artefactos), E-05 y E-06 (hash) | La observabilidad no está en `main`; no se ha importado un artefacto de CI |
| AC-08 Métricas verificables | **Parcial** | `observability/README.md`, E-06; conteos iguales a `stats` | Histórico insuficiente; limitación de comparabilidad (§6) |
| AC-09 IA responsable | **Cumple** | §9 de este documento; puertas de aprobación en cada incremento | — |
| AC-10 Defensa técnica | **No verificado** | — | Lo evalúa una persona en la defensa |

## 5. Preliminary rubric

Sin puntuación numérica: la puntuación corresponde al panel.

| Dimension | Maximum | Evidence | Evaluation/pending |
| --- | ---: | --- | --- |
| Arquitectura y decisiones | 20 | architecture.md, 5 ADRs | Pendiente de evaluación |
| Automatización UI/API | 25 | 7 escenarios lógicos (17 ejecuciones); E-03, E-04, E-05, E-11 | Pendiente de evaluación |
| CI/CD y quality gates | 20 | E-07, E-08, E-09 | Pendiente; falta el ruleset |
| Observabilidad y evidencia | 15 | E-06, E-10; 28 pruebas unitarias | Pendiente; no está en `main` |
| Ingeniería asistida por IA | 10 | §9 | Pendiente de evaluación |
| Defensa técnica | 10 | — | **No evaluable** hasta la defensa |

**Bloqueantes críticos:** ninguno detectado.
- No hay evidencia fabricada.
- No hay secretos reales.
- No hay gates deshabilitados.

## 6. Residual risks and limitations

Ver [risk-register.md](risk-register.md). Los más relevantes:

- **R-01:** sin ruleset, una regresión puede mergearse.
- **R-03:** `retries: 2` mantiene el check verde con pruebas flaky.
- **Comparabilidad de métricas:** la firma de comparabilidad solo usa
  los proyectos, los retries y `repeatEach`, **no el conjunto de
  pruebas**. Por eso los runs de 13 y de 17 pruebas se agruparían
  juntos.
  - Hoy no tiene efecto: hay menos de 5 runs y no se calculan
    tendencias.
  - Hay que corregirlo antes de confiar en las tendencias (P2).
- **Avisos de GitHub:** `actions/checkout@v4` y `setup-node@v4` se
  ejecutan sobre Node 20, que está obsoleto (anotación en E-07). Se
  recomienda actualizarlas a su siguiente versión mayor.
- **Sitios públicos:** los valores esperados (precio, textos, contrato
  404) pueden cambiar sin aviso.

## 7. Architecture and ADRs

Ver [architecture.md](architecture.md):
- [ADR 0001](adr/0001-page-objects-without-base-page.md): Page Objects
  sin BasePage.
- [ADR 0002](adr/0002-thin-products-api.md): `ProductsApi` delgado.
- [ADR 0003](adr/0003-single-ci-job-quality-gates.md): un solo job de
  CI.
- [ADR 0004](adr/0004-local-static-observability.md): observabilidad
  local y estática.
- [ADR 0005](adr/0005-keep-example-tests.md): mantener los ejemplos.

## 8. Prioritized recommendations

| Prioridad | Recomendación | Quién |
| --- | --- | --- |
| P0 | Ruleset en `main` que exija el check `test` (CAP-03) | Admin del repo |
| P0 | PR y merge del #08; importar un artefacto `playwright-results-json` antes de que caduque (CAP-01) | Responsable del repo |
| P1 | PR y merge de `capstone/enterprise-review` tras revisar este documento | Responsable del repo |
| P2 | Incluir el conjunto de `testKey` en la firma de comparabilidad | Equipo |
| P2 | Actualizar `actions/checkout` y `actions/setup-node` a una versión con Node 24 | Equipo |
| P2 | Decidir CAP-08: retirar o no los ejemplos de playwright.dev | Responsable del repo |
| P3 | Lint, fijar la versión de Node, fijar actions por SHA, `--fail-on-flaky-tests` | Equipo |

## 9. AI-assisted engineering — registro

Agente: Claude Code, en VS Code. Cada incremento siguió el mismo ciclo:
**propuesta → STOP → aprobación humana explícita → implementación →
validación con evidencia → revisión del diff**.

| Incremento | Decisiones humanas registradas | Errores o limitaciones detectados por el proceso |
| --- | --- | --- |
| #05 API | Aprobó `ProductsApi` y la ejecución de `tsc` vía `npx` | — |
| #06 Diagnóstico | Cerró el incremento como "sin defecto" (53/53 en verde); el agente no inventó un fallo | — |
| #07 CI | Eligió el typecheck vía `npx`, mantener todos los eventos y probar actionlint | `actionlint` vía npm no funcionó → se reportó como NOT RUN, sin instalar alternativas |
| #08 Observabilidad | Aprobó el plan y las 4 decisiones | Una prueba sin intentos se contaba como `passed` → corregido a `unknown`; `--reporter` en la CLI anulaba el JSON → documentado |
| #09 Capstone | Aprobó "las acciones que el agente puede realizar"; el agente aplicó lo conservador en CAP-08 | Los valores esperados se tomaron del DOM y la API reales; cada aserción nueva se mutó para comprobar que falla; se detectó la limitación de comparabilidad (§6) |

**Lo que no hizo el agente:**
- No hizo merges ni abrió PRs.
- No cambió reglas ni permisos del repositorio.
- No usó secretos.
- No relajó ninguna aserción.
- No usó `skip`.

**Acciones remotas:** solo los pushes y el borrado de la rama
desechable, todos autorizados.

## 10. Actions requiring new approval

| Acción | Quién |
| --- | --- |
| Crear el ruleset de `main` (CAP-03) | Admin |
| Abrir y mergear los PRs del #08 y del Capstone | Responsable del repo |
| Descargar el artefacto `playwright-results-json` para importarlo | Responsable del repo |
| Implementar las recomendaciones P2 y P3 | Requiere una nueva propuesta y aprobación |
| Defensa técnica (AC-10) | Estudiante, ante el panel |
