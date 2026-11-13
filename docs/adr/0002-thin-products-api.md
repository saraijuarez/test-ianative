# ADR 0002 — `ProductsApi` delgado sobre `APIRequestContext`

- **Estado:** aceptada (Incremento #05)

## Contexto

Había que añadir la primera prueba de API (DummyJSON Products) sin
convertir el proyecto en un framework de API.

## Alternativas

1. **`request.get('/products/1')` directamente en el test.** Es lo
   mínimo posible, pero la ruta del endpoint queda mezclada con la
   intención del test.
2. **Un `BaseApiClient`, `HttpClient` o `ResponseValidator` genérico.**
   Duplica lo que Playwright ya ofrece y oculta el HTTP.
3. **Un objeto por recurso que solo conoce las rutas y devuelve el
   `APIResponse` sin procesar.** ← elegida

## Decisión

- `ProductsApi.getProduct(id)` devuelve el `APIResponse`. **El test
  valida el status, la identidad, el contrato y los datos de negocio.**
- `Product` es un tipo de ayuda para el compilador; **no** valida nada
  en tiempo de ejecución.

## Consecuencias

- **Lo positivo:** el HTTP sigue visible en el test. En el Capstone, la
  prueba del 404 reutilizó `getProduct()` sin añadir nada.
- **Lo negativo:** si llegan muchos recursos, habrá un objeto por cada
  uno. Una abstracción común solo se justificaría con evidencia de
  duplicación real.
