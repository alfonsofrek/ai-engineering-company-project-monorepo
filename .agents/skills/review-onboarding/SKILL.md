# Review onboarding flow

## Objetivo
Verificar que una pantalla o servicio de alta de clientes cumple el contrato de onboarding de TrackFlow.

## Inputs
- Ruta o archivos modificados del flujo.
- Comando de validacion disponible para la aplicacion.
- `CONTEXT.md` y los datos de ejemplo usados por la pantalla.

## Procedimiento
1. Confirmar que existen `fullName`, `companyName`, `email`, `country`, `phone` y `monthlyVolume`.
2. Comprobar validacion de campos obligatorios, email, pais permitido, prefijo telefonico y entero positivo.
3. Comprobar la segmentacion Small, Mid-market y Enterprise.
4. Ejecutar lint y build de la aplicacion afectada.

## Criterios de aceptacion verificables
- No hay campos canonicos omitidos ni nombres alternativos en el payload.
- Solo se aceptan `Mexico` y `Espana`.
- Los limites son Small 1-499, Mid-market 500-4999 y Enterprise 5000+.
- `npm run lint` y `npm run build` terminan con codigo 0.
- La UI muestra al menos un estado o mensaje de validacion para entradas invalidas.
