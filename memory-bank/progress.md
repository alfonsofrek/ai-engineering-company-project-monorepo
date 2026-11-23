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

- Milestone 5: inventario TrackFlow con doble base de datos (TinyDB para auth, Supabase/PostgreSQL con SQLModel para `SKU`, `StockEntry`, `StockExit`), router `/inventory`, stock calculado por almacén, rechazo `400` sin stock y seed idempotente del briefing; 32 pruebas pasan en SQLite y PostgreSQL.
- Auditoría de serialización (`docs/serialization-audit.md`): los 32 endpoints con `response_model` explícito, schemas de salida independientes de los de entrada, listas más ligeras que el detalle, auth sin email ni credenciales en respuestas sin autenticar, movimientos con SKU plano; contratos fijados en `tests/test_serialization.py` (104 pruebas pasan).

- Contexto de empresa alineado con los briefings oficiales de 4Geeks: TrackFlow opera en Estados Unidos y España (antes figuraba México y España). Briefings copiados en `docs/briefings/`, `CONTEXT.md`, memory bank, regla de UI y skill de revisión del formulario actualizados.

- Gestor de incidencias con los valores oficiales del briefing: 9 categorías, 5 sedes, seed con el CSV oficial (95 válidas; 29/52/14 por estado) y filtro de impacto en SLA. Script `scripts/migrate_incident_values.py` para bases antiguas.

- Telemetría y pipeline alineados con los briefings oficiales: el plan incluye los 5 eventos obligatorios de inventario (30 eventos en total, Markdown y JSON coherentes) y `PIPELINE_DESIGN.md` diseña `reporting.weekly_warehouse_client_performance` con los 4 KPIs del briefing.

## Siguiente
- Desplegar el stack Docker en el VPS y adjuntar evidencias al PR.
- Paginación en servidor para `/incidents` y migrar proveedores a `useApiQuery`.
- Conectar formularios a un servicio bajo `services/`.
- Persistir solicitudes y calcular KPIs reales.
- Añadir pruebas de validacion para email, telefono, pais y volumen.
