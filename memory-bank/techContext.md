# Technical context

## Stack
Las interfaces viven bajo `uis/`, cada una como una aplicacion Next.js independiente con React, TypeScript y CSS global. `website` es publico y `backoffice` es interno; cualquier backend futuro debe vivir bajo `services/`.

## Arquitectura actual
Ambas apps usan App Router y componentes pequenos en `app/`. La primera entrega es una interfaz funcional con datos de ejemplo tipados y sin dependencia de un backend para poder validar el flujo visual desde el primer dia.

## Reglas tecnicas
- Mantener los nombres canonicos del onboarding definidos en `CONTEXT.md`.
- Validar `country` como `Mexico | Espana` y `monthlyVolume` como entero positivo.
- Clasificar volumen como Small (1-499), Mid-market (500-4999) o Enterprise (5000+).
- Ejecutar `npm run lint` y `npm run build` dentro de cada app modificada.
- No introducir nuevos campos de onboarding sin actualizar el contexto de negocio.
