# Progress

## Completado
- Briefing de TrackFlow trasladado a la memoria operativa.
- Website publico creado en `uis/website` con formulario canonico y validaciones de navegador.
- Backoffice creado en `uis/backoffice` con cola de solicitudes, KPIs y segmentacion por volumen.
- Reglas de agentes y skill `review-onboarding` documentadas.
- `npm run lint` y `npm run build` pasan en ambas aplicaciones.
- Directorio de proveedores TrackFlow implementado según el briefing oficial: API TinyDB, validación de moneda por país, 15 registros idempotentes, filtros, CRUD e historial de cambios de estado.
- Backoffice de proveedores conectado a la API; pruebas `pytest` pasan y `npm run lint` / `npm run build` pasan.
- Evidencias del seeder, filtro API y directorio filtrado guardadas en `docs/screenshots/` y enlazadas desde los README.

## Siguiente
- Conectar formularios a un servicio bajo `services/`.
- Persistir solicitudes y calcular KPIs reales.
- Incorporar autenticacion y permisos para el backoffice.
- Añadir pruebas de validacion para email, telefono, pais y volumen.
