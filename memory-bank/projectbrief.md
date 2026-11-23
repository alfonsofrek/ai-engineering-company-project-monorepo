# Project brief

## Empresa
TrackFlow hace última milla y gestión de almacenes para marcas de e-commerce en **Estados Unidos y España**, con almacenes en Los Ángeles y Zaragoza. Fuente de verdad: `CONTEXT.md` y los briefings oficiales de `docs/briefings/` (índice en `company-BRIEFING.md`).

## Problema y objetivo
TrackFlow Tech, la unidad interna en la que trabajamos, construye los sistemas que unifican los dos países: inventario en tiempo real por SKU y almacén, directorio de proveedores, gestión de incidencias, telemetría y pipeline de datos para los informes de dirección.

## Alcance del monorepo
- `uis/website`: web pública y formulario de alta de marcas (Milestone 1).
- `uis/backoffice`: herramienta interna (proveedores, incidencias, análisis de CSV e inventario).
- `uis/talent-pipeline-tracker`: herramienta de People & Talent (Milestone 3).
- `services/api`: API FastAPI (auth, proveedores, incidencias, inventario).
- `data/pipelines` y `docs/telemetry`: telemetría y pipeline de datos (Milestone 6).

## Restricciones de negocio
- Solo Estados Unidos y España; almacenes `LA` y `ZGZ`.
- Los valores cerrados (categorías, sedes, eventos, KPIs) se copian literalmente del briefing de cada proyecto.
- Sin datos personales del consumidor final en telemetría ni en informes de inventario.
