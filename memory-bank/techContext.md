# Technical context

## Stack
- **Frontend:** tres apps Next.js 16 (App Router, React, TypeScript) bajo `uis/`: `website` (pública), `backoffice` (interna, Tailwind) y `talent-pipeline-tracker` (Tailwind). Cada una es independiente; no comparten componentes.
- **Backend:** `services/api`, FastAPI + Pydantic. Proveedores, usuarios e incidencias en TinyDB; inventario con SQLModel sobre PostgreSQL (Supabase) o SQLite en tests. Auth JWT y reset de contraseña por email.
- **Datos:** `docs/telemetry` (plan y esquemas de eventos) y `data/pipelines` (diseño del pipeline).
- **Infra:** `docker-compose.yml` (servicios `ui` y `api`) y variante `prod`.

## Reglas técnicas
- Antes de tocar un flujo, leer su briefing en `docs/briefings/`. Los enums y valores cerrados deben coincidir con él.
- Cada endpoint declara `response_model` explícito; contratos fijados en `services/api/tests/test_serialization.py`.
- Ejecutar `uv run pytest` en `services/api`, y `npm run lint`, `npm test` (si existe) y `npm run build` en cada app de `uis/` que se modifique.
- Secretos solo en `.env` (ignorado por git); documentar las variables en `.env.example`.
