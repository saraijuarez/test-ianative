# ADR 0001 — Page Objects sin BasePage

- **Estado:** aceptada (Incremento #04)
- **Fecha:** 2026-11 (consolidada en el Capstone, Incremento #09)

## Contexto

Las pruebas de SauceDemo repetían selectores (`.inventory_item`,
`.shopping_cart_badge`) y pasos de login. Un cambio en la UI obligaba a
editar varias pruebas.

## Alternativas

1. **Mantener los selectores en los tests.** Es simple, pero duplica
   código y hace frágil el mantenimiento.
2. **Page Objects con una `BasePage` genérica**, que añadiera `goto`,
   esperas y aserciones comunes. Es una abstracción especulativa y tiende
   a esconder las aserciones.
3. **Page Objects simples, uno por página, sin clase base.** ← elegida

## Decisión

- `LoginPage`, `InventoryPage` y `CartPage` conocen solo los selectores
  y las acciones de su página.
- **Las aserciones se quedan en los tests**, así que la intención del
  escenario sigue visible.
- La URL viene de `baseURL`.

## Consecuencias

- **Lo positivo:**
  - Los cambios de selector se hacen en un solo lugar.
  - Los tests se leen como escenarios de negocio.
- **Lo negativo:** hay algo de repetición de `constructor(page)` entre
  las clases. Se acepta, porque no justifica una clase base.
- **Ejemplo de evolución en el Capstone:** `LoginPage.errorMessage` y
  `InventoryPage.productPrice()` se añadieron sin cambiar la estructura.
- **Cuándo revisar esta decisión:** si aparecen más de unas 5 páginas
  con comportamiento realmente común.
