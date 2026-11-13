# Matriz de trazabilidad

Requisitos → pruebas → implementación → evidencia. Los IDs de evidencia
(E-xx) se detallan en el
[registro de evidencia de capstone-review.md](capstone-review.md#3-validaciones-ejecutadas).

| requirement_id | business_risk | test_ids | implementation_path | evidence_reference | status | gap |
| --- | --- | --- | --- | --- | --- | --- |
| BR-01 | Acceso indebido o rechazo de usuarios válidos | `saucedemo.spec.ts` › *locked-out user is rejected and stays on the login page*; login válido en el `beforeEach` de *SauceDemo as a standard user* | `starter/pages/login-page.ts` (`login`, `errorMessage`) | E-03, E-04, E-05 | Implementado y validado en local; en CI tras el push de la rama | Solo cubre usuario bloqueado; contraseña inválida queda como evolución |
| BR-02 | Catálogo con datos inconsistentes | *standard user can log in and see the product inventory* (6 productos, precio del backpack `$29.99`) | `starter/pages/inventory-page.ts` (`items`, `productPrice`) | E-03, E-04, E-05 | Implementado y validado en local | Solo se verifica el precio de un producto |
| BR-03 | Carrito incorrecto | *standard user can add Sauce Labs Backpack to the cart* (contador `1`, 1 producto, nombre) | `inventory-page.ts`, `cart-page.ts` | E-03, E-05, E-09; 53/53 repeticiones en el Inc #06 | Implementado y validado (local y CI) | Quitar producto y checkout fuera de alcance |
| BR-04 | Contrato de API roto | `products.spec.ts` › *returns the requested product…* (200) y *returns 404 with an error message…* | `starter/api/products-api.ts` | E-02, E-04, E-05; 200 también en E-09 | Implementado y validado (200 en CI; 404 en local) | Solo `/products/{id}` |
| BR-05 | Regresión en `main` | Check `test`: Typecheck y todas las pruebas | `.github/workflows/playwright.yml` | E-07 (typecheck rojo), E-08 (pruebas rojas y trazas), E-09 (verde), E-12 (sin ruleset) | **Parcial:** el gate funciona en ambos sentidos, pero **no bloquea el merge** | Ruleset de admin (CAP-03) |
| BR-06 | Resultados no investigables | Reporter JSON con metadatos de CI; `npm run obs:test` (28) | `starter/playwright.config.ts`, `starter/observability/` | E-06, E-08 (`playwright-results-json` y `playwright-test-results`), E-10 | Implementado y validado en local y en CI (artefactos); **no integrado en `main`** | PR del #08 e importación de un artefacto de CI (CAP-01) |

## Restricciones de los sistemas de práctica

- **SauceDemo y DummyJSON son independientes:** no hay datos compartidos
  ni persistencia.
- **Los valores esperados pueden cambiar:** precio, textos de error y
  catálogo se verificaron contra el sistema real el 2026-11-13, y
  podrían cambiar sin aviso (riesgo R-04).
