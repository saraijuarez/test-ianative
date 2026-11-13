# Guía para la defensa técnica

> Esta guía **no contiene respuestas tuyas**. Ofrece estructura,
> evidencia a mano y los elementos que una buena respuesta debería
> cubrir. La defensa y sus respuestas son responsabilidad de quien
> presenta.

## Guion sugerido (10–15 min)

| Min | Bloque | Qué mostrar | Evidencia a mano |
| --- | --- | --- | --- |
| 0–2 | Problema de negocio y riesgos | BR-01…BR-06 y por qué esa prioridad | [test-strategy.md](test-strategy.md), [risk-register.md](risk-register.md) |
| 2–4 | Estrategia y lo que **no** se automatiza | Tabla "fuera de alcance" y su porqué | test-strategy.md §Alcance |
| 4–6 | Arquitectura y ADRs | Diagrama; Page Objects sin BasePage; `ProductsApi` delgado | [architecture.md](architecture.md), [adr/](adr/) |
| 6–9 | Demo de UI, API y CI | `npx playwright test` en vivo (17 pruebas); un run verde y **los dos runs rojos de la prueba controlada** | Runs [43355472145](https://github.com/saraijuarez/test-ianative/actions/runs/43355472145) y [43355734301](https://github.com/saraijuarez/test-ianative/actions/runs/43355734301) |
| 9–11 | Observabilidad y trazabilidad | `npm run obs:report`; "Insufficient history for trends"; separación entre resultado lógico e intentos | [traceability.md](traceability.md), `starter/observability/README.md` |
| 11–13 | Resultados, limitaciones y riesgos residuales | Matriz AC; `main` sin ruleset; histórico no durable | [capstone-review.md](capstone-review.md) |
| 13–15 | Evolución propuesta | P2/P3 del backlog y qué evidencia haría falta para cada uno | capstone-review.md §8 |

**Consejo para la demo:** ten abierto el reporte HTML de un run en
verde, por si algún sitio público falla en vivo. Y explica por qué eso
sería un fallo de infraestructura y no del producto.

## Preguntas probables del panel y criterios de evaluación

| # | Pregunta | Una respuesta sólida cubre… |
|---|---|---|
| 1 | ¿Por qué esta arquitectura? | Las responsabilidades (tests aseveran, POs conocen la UI, `ProductsApi` conoce las rutas); las alternativas descartadas (BasePage, cliente genérico) y **por qué**; los ADRs |
| 2 | ¿Qué decidiste no automatizar y por qué? | Ejemplos concretos (CRUD de DummyJSON sin persistencia, carga sobre sitios públicos); el riesgo frente al coste; cuándo lo reconsiderarías |
| 3 | ¿Cómo sabes que CI reporta un fallo real? | Los runs controlados: typecheck rojo y pruebas rojas, con sus IDs; que la subida de artefactos no cambia el resultado; el gate de cero pruebas; la mutación local |
| 4 | ¿Cómo distingues un defecto de producto, de automatización o de infraestructura? | Patrones observables (reproducible en todos los navegadores, ligado a un diff, errores de red en varios tests); trazas antes de concluir; no tocar aserciones sin evidencia |
| 5 | ¿Qué evidencia respalda tus métricas? | El origen (reporter JSON); el hash del archivo; las fórmulas y denominadores; las pruebas con datos sintéticos **etiquetados**; los conteos que coinciden con los `stats` de Playwright |
| 6 | ¿Qué harías si un servicio público no está disponible? | Clasificarlo como infraestructura; reintentos y su coste; no deshabilitar el gate; opciones como mocks o entorno propio, con sus contras |
| 7 | ¿Qué aportó el agente de IA y qué revisaste tú? | Ejemplos concretos de aprobación y rechazo; errores que el proceso detectó; diffs revisados; decisiones que fueron tuyas (eventos de CI, typecheck con npx, mantener ejemplos) |
| 8 | ¿Qué trade-off aceptarías para reducir el tiempo de feedback? | Por ejemplo, separar jobs, ejecutar menos navegadores en el PR o hacer sharding; qué riesgo introduce cada uno; cómo lo medirías (duración del runner frente al tiempo de feedback) |
| 9 | ¿Qué riesgos quedan abiertos? | `main` sin ruleset; reintentos que ocultan la intermitencia; histórico no durable; pruebas de ejemplo en el gate; comparabilidad de métricas ante cambios en la suite |
| 10 | ¿Cómo escalarías sin sobre-ingeniería? | La regla "las capacidades futuras se ganan sus abstracciones"; las señales que justificarían una abstracción (duplicación real o un nuevo recurso); qué **no** harías |
| 11 | ¿Por qué tu pass rate del 100 % no significa que no haya riesgo? | Alcance de las aserciones; requisitos parcialmente cubiertos; población de pruebas pequeña; sistemas públicos |
| 12 | ¿Cómo evitas un falso verde? | Aserciones exactas; mutación; un filtro que no encuentra pruebas falla; estados `unknown` y `partial` que nunca cuentan como `passed` |

## Ejercicio didáctico: decisión de release

> ⚠️ **Caso ficticio con fines didácticos. Estas cifras NO son
> resultados de este repositorio.** No las mezcles con las métricas
> reales.

**Situación:**
- 291 de 300 pruebas ejecutadas pasaron (97 %).
- Hay 9 fallos: 2 de autenticación, 3 de dependencias externas y 4 sin
  causa confirmada.
- Se detectaron 14 pruebas flaky.
- **El quality gate obligatorio falló.**
- No está confirmada la cobertura de los requisitos críticos.

**Prepara:**
1. Tu recomendación razonada: liberar, no liberar o liberar con
   condiciones.
2. La evidencia que falta para decidir.
3. Las mitigaciones posibles.
4. Quién debe asumir el riesgo si se acepta.
5. Las condiciones para reconsiderar la decisión.

**Una buena respuesta considera:**
- **El gate:** un gate obligatorio en rojo no se compensa con un 97 %.
- **Autenticación:** es un área crítica (aquí sería BR-01).
- **Fallos sin causa:** son incertidumbre, no ruido.
- **Las 14 flaky:** reducen la confianza en el 97 %.
- **Cobertura:** que no esté confirmada impide afirmar que el riesgo
  está bajo control.
