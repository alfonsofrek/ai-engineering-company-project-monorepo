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
