# TrackFlow — company BRIEFING

TrackFlow es la empresa asignada para el proyecto del curso. Los textos oficiales de 4Geeks Academy se copian **sin modificar** en [`docs/briefings/`](docs/briefings/), y son la fuente de verdad de cada milestone. Este archivo es solo el índice. Si algo del código o de la documentación contradice un briefing oficial, manda el briefing.

## La empresa en una línea

Última milla y gestión de almacenes, fundada en 2009 en Los Ángeles. Opera en **Estados Unidos y España**, con almacenes en **Los Ángeles y Zaragoza**, unos 130 empleados y unos 9 M€ de facturación anual. Detalle completo en [`00-general.es.md`](docs/briefings/00-general.es.md).

## Briefing oficial por proyecto

| Proyecto / milestone | Briefing oficial | Dónde vive en el monorepo |
| --- | --- | --- |
| Empresa (todos los milestones) | [00-general.es.md](docs/briefings/00-general.es.md) + [políticas](docs/briefings/00-general-policies/) | `CONTEXT.md`, `memory-bank/` |
| Milestone 1 — Web pública | [01-web-fundamentals.es.md](docs/briefings/01-web-fundamentals.es.md) | `index.html`, `application.html`, `uis/website` |
| Milestone 2 — Fundamentos de programación | [02-coding-fundamentals.es.md](docs/briefings/02-coding-fundamentals.es.md) | rama `feature/domain-models` |
| Milestone 3 — Talent Pipeline Tracker | [03-frontend-development.es.md](docs/briefings/03-frontend-development.es.md) | `uis/talent-pipeline-tracker` |
| Supplier Directory | [supplier-directory.es.md](docs/briefings/supplier-directory.es.md) | `services/api/routes/suppliers.py`, `uis/backoffice/app/suppliers` |
| Incident File Analyzer | [incidents-file-analysis.es.md](docs/briefings/incidents-file-analysis.es.md) | `scripts/analyze.py`, `services/api/routes/incidents_analysis.py` |
| Centralized Incident Manager | [centralized-incident-manager.es.md](docs/briefings/centralized-incident-manager.es.md) | `services/api/routes/incidents.py`, `uis/backoffice/app/incidents` |
| Milestone 5 — Inventario (backend y backoffice) | [05-backend-inventory.es.md](docs/briefings/05-backend-inventory.es.md) | `services/api/inventory`, `uis/backoffice/app/inventory` |
| Telemetría (plan, captura, almacenamiento, informe) | [06-telemetry.es.md](docs/briefings/06-telemetry.es.md) | `docs/telemetry/` |
| Milestone 6 — Pipeline de datos | [06-data-pipelines.es.md](docs/briefings/06-data-pipelines.es.md) | `data/pipelines/` |

## Reglas para trabajar con los briefings

- No se editan los archivos de `docs/briefings/`. Si 4Geeks publica una versión nueva, se sustituye el archivo entero.
- Los valores cerrados (países, almacenes, categorías, sedes, `event_type`, KPIs) se copian **literalmente** del briefing que corresponda. No se inventan valores nuevos.
- `CONTEXT.md` resume lo que comparten todos los briefings. Lo propio de un proyecto se consulta en su briefing.
