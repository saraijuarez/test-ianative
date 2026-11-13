# ADR 0005 — Mantener por ahora las pruebas de ejemplo de Playwright

- **Estado:** aceptada provisionalmente (Capstone, Incremento #09)

## Contexto

`starter/tests/example.spec.ts` viene del inicializador de Playwright y
prueba `playwright.dev`. No cubre ningún requisito de negocio (BR-01 a
BR-06).

En cada run aporta 6 de las 17 ejecuciones (2 pruebas × 3 navegadores):
- infla los conteos y el pass rate;
- añade una dependencia externa que puede poner el check en rojo sin
  que el producto haya cambiado.

## Alternativas

1. **Retirarlas.** La señal queda más limpia, pero rompe la
   comparabilidad de las métricas y elimina pruebas ya validadas.
2. **Mantenerlas** y documentar su efecto. ← elegida por defecto
3. **Moverlas a un proyecto que no forme parte del gate.** Añade
   configuración sin una necesidad clara.

## Decisión

En la revisión del Capstone no se tomó una decisión explícita sobre
este cambio (CAP-08), así que se aplica la **opción conservadora**:
mantenerlas sin cambios.

## Consecuencias

- Las métricas incluyen estas pruebas. Al analizarlas, conviene filtrar
  por archivo o descontarlas.
- Si `playwright.dev` no está disponible, el check falla por una causa
  de **infraestructura o terceros**, no del producto.
- **Para revisar:** si se retiran, hay que actualizar
  `starter/README.md` (cambia el conteo esperado) y anotar el cambio de
  población en el análisis de métricas.
