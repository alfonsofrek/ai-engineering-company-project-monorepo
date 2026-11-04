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
- Autenticación JWT, CRUD TinyDB de usuarios, perfiles uno-a-uno y autorización por propietario/admin implementados en la API.
- Rutas de proveedores protegidas con bearer token; `uv run pytest tests` pasa con 8 pruebas, incluyendo tokens inválidos/expirados y permisos.
- Backoffice y Talent Pipeline Tracker conectados a JWT: login, registro, perfil, logout, guard cliente y manejo global de `401`; website público sin cambios.
- `npm run lint` y `npm run build` pasan en ambas aplicaciones internas con las rutas `/login`, `/register` y `/account/profile`.
- Ramas previas integradas en `chore/integrate-previous-milestones`: auth + análisis de incidencias CSV en una sola base.
- Auditoría de manejo de errores (`docs/error-handling-audit.md`): formato de error único en la API, tres estados de UI con reintento y scripts con `exit 1`.
- Gestor centralizado de incidencias según `company-BRIEFING.md`: modelo, seed idempotente (95/5), endpoints `/api/incidents` y páginas de alta, listado y resumen.
- Monorepo dockerizado: `docker-compose.yml` (ui + api en `trackflow-net`), override de producción y `docs/docker.md`.
- Auditoría de rendimiento con Lighthouse en producción (`AUDIT.md`, `REPORT.md`, `audit/`): fuentes locales, home como Server Component, contraste AA, `useFormFields` y `useApiQuery`.

## Siguiente
- Desplegar el stack Docker en el VPS y adjuntar evidencias al PR.
- Paginación en servidor para `/incidents` y migrar proveedores a `useApiQuery`.
- Conectar formularios a un servicio bajo `services/`.
- Persistir solicitudes y calcular KPIs reales.
- Añadir pruebas de validacion para email, telefono, pais y volumen.
