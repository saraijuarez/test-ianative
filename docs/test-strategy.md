# Estrategia de pruebas

## Contexto

El sistema bajo prueba son **dos sitios públicos de práctica,
independientes entre sí**:

| Sistema | Tipo | Qué representa | Restricciones |
| --- | --- | --- | --- |
| SauceDemo (`https://www.saucedemo.com`) | UI | Tienda: login, catálogo, carrito | Demo pública. No hay datos persistentes; cada sesión es nueva. Credenciales de demostración públicas |
| DummyJSON (`https://dummyjson.com`) | API REST | Catálogo de productos | Datos simulados. Las escrituras no persisten. No requiere autenticación |

**No existe integración entre ambos.** Ninguna prueba asume que la API
afecta a la UI, ni al revés.

## Requisitos de negocio y prioridad

| ID | Requisito | Riesgo si falla | Prioridad | Cobertura |
| --- | --- | --- | --- | --- |
| BR-01 | Solo usuarios autorizados entran | Acceso indebido, o bloqueo de usuarios válidos | Alta | Login válido (positivo) y `locked_out_user` rechazado (negativo) |
| BR-02 | El catálogo muestra información consistente | Vender con datos erróneos | Media | 6 productos y precio del backpack `$29.99` |
| BR-03 | Las operaciones de carrito son correctas | Pedidos erróneos | Alta | Añadir backpack: botón `Remove`, contador exacto `1`, 1 producto en el carrito |
| BR-04 | La API cumple su contrato | Integraciones rotas | Alta | `GET /products/1` (200: identidad, contrato y negocio) y `GET /products/999999` (404 con mensaje) |
| BR-05 | Las regresiones se detectan antes del merge | Defectos en `main` | Crítica | Check `test`: typecheck y todas las pruebas. **Requiere un ruleset para bloquear el merge** |
| BR-06 | Los resultados se pueden trazar e investigar | No poder diagnosticar | Media | Reportes HTML, JSON con metadatos de CI y módulo de observabilidad |

Detalle de pruebas y evidencia: [traceability.md](traceability.md).

## Alcance

**Se automatiza:**
- Flujos críticos de UI en tres motores de navegador: Chromium, Firefox
  y WebKit.
- Contrato de API para el caso exitoso y para el error "no encontrado".
- Validación estática de TypeScript.

**Fuera de alcance, a propósito:**

| Qué | Por qué no |
| --- | --- |
| Checkout completo, ordenación y filtros del catálogo | No hay requisito asociado. Se añadirían cuando un riesgo lo justifique |
| CRUD de DummyJSON (POST/PUT/DELETE) | Las escrituras no persisten. Probarlas daría falsa confianza |
| Rendimiento y carga | Son sitios públicos de terceros. Generar carga sería inapropiado |
| Accesibilidad y regresión visual | No están en los requisitos actuales. Se proponen como evolución |
| Integración UI ↔ API | Los sistemas no están relacionados |

## Niveles y técnicas

| Nivel | Herramienta | Dónde |
| --- | --- | --- |
| Estático | `tsc --noEmit` (`strict`) | CI, paso **Typecheck** |
| API | Playwright `APIRequestContext` | Proyecto `api` |
| UI end-to-end | Playwright con Page Objects | Proyectos `chromium`, `firefox` y `webkit` |
| Unitarias del módulo de observabilidad | Playwright Test, sin navegador | `npm run obs:test`, solo en local |

**Diseño de aserciones:**
- Las aserciones viven en los tests; los Page Objects no aseveran nada.
- Los valores son exactos (contador `'1'`, precio `'$29.99'`, status
  `404`), no basta con que algo sea visible.
- **Cada aserción nueva se mutó en local para comprobar que falla.**

## Datos de prueba

- Las cuentas de demostración públicas de SauceDemo (`standard_user` y
  `locked_out_user`) son constantes `as const` en el spec. No son
  secretos.
- El id `1` de DummyJSON es un producto conocido; el id `999999` no
  existe.
- No hay datos personales ni credenciales reales.

## Criterios de entrada y salida

- **Entrada a merge:** el check `test` está en verde. Es el typecheck
  más todas las pruebas, y falla si se encuentran cero pruebas.
- **Pruebas intermitentes:** `retries: 2` en CI. Una prueba que solo
  pasa al reintentar aparece como *flaky* en el reporte, pero **no pone
  el check en rojo**. Hay que revisar el reporte.
- **Investigación de fallos:** se sigue el flujo
  señal → evidencia → hipótesis → acción → aprobación → validación.
  Ver [observability/README.md](../starter/observability/README.md).

## Clasificación de fallos

| Origen | Señal típica | Primera acción |
| --- | --- | --- |
| Producto | La aserción falla de forma reproducible en todos los navegadores | Reproducir manualmente y reportar |
| Automatización | Falla tras un cambio en el test o en un Page Object | Revisar el diff y el selector |
| Infraestructura o terceros | Timeouts o errores de red, en varios tests a la vez, en ambos sistemas | Verificar la disponibilidad del sitio; no tocar las aserciones |
| Desconocido | Sin patrón | Recoger trazas (`playwright-test-results`) antes de concluir |
