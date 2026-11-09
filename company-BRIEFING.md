# TrackFlow — company BRIEFING (incidencias)

> Fuente de verdad para el **Centralized Incident Manager**. Los nombres de campo, las categorías, las sucursales y los valores de seed de la implementación deben coincidir exactamente con este documento.
>
> Los valores se han tomado de los datos reales de TrackFlow que ya hay en el monorepo: el CSV histórico `scripts/incidents-trackflow.csv`, las reglas de `packages/shared/python/incident_validation.py` y las sedes operativas del directorio de proveedores (`services/api/seed.py`).

## 1. Modelo `Incident`

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | entero | Lo genera la base de datos. |
| `title` | texto | Obligatorio. De 3 a 120 caracteres. |
| `description` | texto | Obligatorio. De 5 a 2000 caracteres. |
| `category` | enum | Uno de los valores de la §2. |
| `status` | enum | `open`, `in_progress`, `resolved` o `discarded`. Por defecto `open`. |
| `origin` | enum | `customer`, `branch` o `internal`. |
| `branch` | enum | Uno de los valores de la §3. **Obligatorio para todos los orígenes.** |
| `source_ref` | texto o nulo | Identificador de origen externo, por ejemplo `TRF-000001`. Hace idempotente el seed. |
| `created_at` | datetime ISO-8601 (UTC) | Se genera automáticamente. |
| `updated_at` | datetime ISO-8601 (UTC) | Se actualiza automáticamente en cada cambio. |

## 2. Categorías válidas

| Valor | Etiqueta en la UI |
|---|---|
| `lost_parcel` | Paquete perdido |
| `delayed_delivery` | Entrega retrasada |
| `wrong_address` | Dirección incorrecta |
| `return_request` | Solicitud de devolución |
| `damage` | Paquete dañado |

## 3. Sucursales (`branch`)

| Valor | Etiqueta en la UI | País |
|---|---|---|
| `los_angeles` | Hub Los Ángeles | US |
| `zaragoza` | Almacén Zaragoza | ES |
| `central` | Central (sede) | — |

`central` se usa cuando la incidencia no corresponde a ninguna sucursal concreta.

## 4. Ciclo de vida

```
open ──► in_progress ──► resolved
  │            │
  └──────► discarded ◄─┘
```

- Desde `open` se puede pasar a `in_progress` o a `discarded`.
- Desde `in_progress` se puede pasar a `resolved` o a `discarded`.
- `resolved` y `discarded` son estados finales.

## 5. Transformaciones del CSV al modelo (seed histórico)

El CSV del analizador tiene estas columnas: `incident_id, date, country, customer_type, tracking_number, carrier, category, description, status, customer_email, satisfaction_score`.

| CSV | Modelo | Regla |
|---|---|---|
| `incident_id` | `source_ref` | Se copia tal cual. Es la clave de idempotencia. |
| `description` | `title` | Los primeros 120 caracteres de la descripción, sin espacios sobrantes. |
| `description` | `description` | Se copia tal cual. |
| `category` | `category` | `LOST_PARCEL→lost_parcel`, `DELAYED_DELIVERY→delayed_delivery`, `WRONG_ADDRESS→wrong_address`, `RETURN_REQUEST→return_request`, `DAMAGE→damage`. |
| `status` | `status` | `OPEN→open`, `CLOSED→resolved`, `DISCARDED→discarded`. |
| `date` | `created_at` | `YYYY-MM-DD` a las 00:00 UTC. |
| `country` (ubicación) | `branch` | `US→los_angeles`, `ES→zaragoza`. |
| — | `origin` | Siempre `customer`. |

Las filas que no pasan `record_errors()` (reglas compartidas en `packages/shared/python/incident_validation.py`) no se insertan y se listan en la consola al terminar.

## 6. Valores esperados del seed

Con `scripts/incidents-trackflow.csv` (100 filas):

- **95 incidencias insertadas** y **5 filas rechazadas** por validación.
- Si se ejecuta dos veces, la segunda inserta **0** (es idempotente).
- Todas las incidencias del seed tienen `origin = customer`.

## 7. Telemetría — métricas obligatorias

> Sección añadida para el plan de telemetría (`docs/telemetry/telemetry-plan.md`). MM-1 a MM-4 son los KPI de `CONTEXT.md` §7; MM-5 a MM-7 se refieren al gestor de incidencias (§1–§4 de este documento). Estas métricas son el **mínimo**: se miden desde el primer día, pase lo que pase.

| ID | Métrica | Fórmula | Eventos de origen |
|---|---|---|---|
| MM-1 | **Onboarding conversion rate** | solicitudes válidas / solicitudes enviadas | `lead_form_submitted` (`is_valid`) |
| MM-2 | **Lead validation error rate** | envíos con al menos un campo inválido / envíos | `lead_form_submitted` (`invalid_fields`) |
| MM-3 | **Average onboarding time** | media de (`timestamp` de `to_status=activado` − `lead_created_at`) | `lead_status_changed` |
| MM-4 | **Monthly volume forecast** | Σ `monthly_volume` de las solicitudes válidas, por `country` | `lead_form_submitted` |
| MM-5 | **Incidencias abiertas por día** | recuento por día × `branch` × `origin` × `category` | `incident_created` |
| MM-6 | **Tiempo medio de resolución** | media de (`timestamp` de `to_status=resolved` − `incident_created_at`), por `category` y `branch` | `incident_status_changed` |
| MM-7 | **Cambios de estado rechazados** | recuento por día de intentos fuera del ciclo de vida (§4) | `incident_status_change_rejected` |

Identificadores de entidad que se usan en telemetría: `lead_id`, `incident_id` y `supplier_id` (IDs internos) y `userId` (el ID del usuario, nunca su email). Los valores de `branch`, `category`, `status` y `origin` son los de las secciones §2–§4.

**Cómo se conectan con el futuro.** MM-1 a MM-6 alimentarán el informe de negocio que producirá el pipeline de datos (`data/pipelines/`). La telemetría que se captura ahora es la materia prima de ese informe.

## 8. Pipelines de datos — entregable de negocio

> Sección añadida para el diseño del pipeline (`data/pipelines/PIPELINE_DESIGN.md`). Es la continuación de la §7, «Cómo se conectan con el futuro».

- **Entregable:** el *Informe semanal de operaciones y onboarding* de TrackFlow.
- **Audiencia:** Dirección de Operaciones (COO). La Dirección Comercial lo recibe en copia para la parte de onboarding.
- **Cadencia:** se publica cada lunes a las 08:00 (Europe/Madrid) con los datos de la semana ISO anterior. Durante la semana, los datos se actualizan cada día a las 06:00 para poder consultarlos sobre la marcha.
- **Agregación requerida:** una fila por día y por dimensión: `country` (Mexico, Espana), `segment` (small, mid_market, enterprise), `branch` (los_angeles, zaragoza, central), `category` (las de la §2) o `all` (total). El informe semanal se calcula a partir de esas filas diarias.
- **Tabla de destino:** `reporting.ops_daily_kpis`.

### KPIs to Measure

| KPI (`kpi_name`) | Definición | Métrica obligatoria | Dimensiones |
|---|---|---|---|
| `onboarding_conversion_rate` | solicitudes válidas / solicitudes enviadas (0–1) | MM-1 | all, country |
| `lead_validation_error_rate` | envíos con algún campo inválido / envíos (0–1) | MM-2 | all, country |
| `avg_onboarding_time_hours` | horas medias desde el registro hasta `activado`, de las solicitudes activadas ese día | MM-3 | all, country, segment |
| `monthly_volume_forecast` | Σ `monthly_volume` de las solicitudes válidas recibidas ese día | MM-4 | all, country, segment |
| `incidents_opened` | incidencias creadas ese día | MM-5 | all, branch, category |
| `mean_time_to_resolve_hours` | horas medias desde la creación hasta `resolved`, de las resueltas ese día | MM-6 | all, branch, category |
| `resolved_within_72h_rate` | resueltas en 72 h o menos / resueltas ese día (0–1); es el objetivo de servicio de operaciones | MM-6 | all, branch |
