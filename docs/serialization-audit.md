# Auditoría de serialización — TrackFlow API

Rama `feature/serialization-audit`. Alcance: los **32 endpoints** de `services/api` (FastAPI). Se revisan con tres preguntas: qué **recibe** cada endpoint, qué **debería devolver** según quién lo consume, y qué **devuelve hoy**.

## Resumen

| | Antes | Después |
|---|---|---|
| ✅ Ya serializados correctamente | 10 | **32** |
| ⚠️ Parcialmente serializados (sobreexponen datos o mezclan entrada y salida) | 20 | 0 |
| ❌ Sin serializar (dict sin tipar o sin contrato) | 2 | 0 |
| Endpoints con `response_model` explícito | 28 / 32 | **32 / 32** |
| Schemas de respuesta que heredan de un schema de entrada o de almacenamiento | 3 | **0** |

Principales hallazgos:

1. **Registro (`POST /users`)**: devolvía el email (`user.email`) y la clave foránea interna `profile.user_id`. El cliente ya conoce el email porque acaba de enviarlo, y un flujo sin autenticar no debe devolverlo.
2. **Perfiles**: `ProfileResponse` heredaba del registro interno `Profile` y exponía `user_id` en `/auth/me` y `/profiles/me`.
3. **Entrada y salida mezcladas**: `SupplierResponse` heredaba de `SupplierCreate` e `IncidentResponse` heredaba de `IncidentCreate`. Así, cualquier campo nuevo que se pudiera *escribir* aparecía también en lo que se *devuelve*, y los validadores de entrada se ejecutaban sobre las respuestas.
4. **Movimientos de inventario**: cada movimiento repetía `sku_id` aunque ya incluía el objeto `sku` anidado, y ese `sku` repetía `warehouse` y `client_name`, que las tablas de movimientos no muestran.
5. **Análisis de CSV (`POST /api/incidents/analyze`)**: devolvía un `dict[str, object]` sin contrato; en OpenAPI aparecía como un objeto genérico.
6. **Listas**: `GET /users` y `GET /api/incidents` usaban el mismo schema que el detalle, aunque la pantalla no usa todos los campos.

## Criterio aplicado

- **Campos explícitos.** Todos los schemas de respuesta enumeran sus campos uno a uno y no heredan de los modelos de almacenamiento (`User`, `Profile`, `Supplier`, `IncidentRecord`) ni de los de entrada (`*Create`).
- **Entrada ≠ salida.** Los endpoints de escritura usan su propio schema `*Create` / `*Update` / `*Request` con `extra="forbid"`, así que el cliente no puede enviar campos que solo existen en la salida (`id`, `updated_at`, `created_at`, `source_ref`).
- **Listas más ligeras que el detalle** cuando la pantalla usa menos campos. Si la tabla usa todos los campos, la lista y el detalle comparten schema, y se indica el motivo.
- **Nada sensible.** Ninguna respuesta contiene `hashed_password`, tokens de reseteo, `password_changed_at` ni la clave foránea `user_id`. Los flujos sin autenticar (registro, login, forgot/reset) no devuelven el email. `GET /auth/me` sí devuelve el email del propio usuario, porque la vista de perfil lo necesita.
- **Relaciones decididas una a una** (ver la sección «Relaciones»).
- **Sin cuerpo JSON por diseño**: los dos `DELETE` (204) y la exportación CSV declaran `response_model=None` de forma explícita, y la exportación declara además `response_class=StreamingResponse` con el tipo `text/csv`.

## Auditoría por endpoint

Leyenda: ✅ ya serializado · ⚠️ parcial (sobreexpone o mezcla entrada y salida) · ❌ sin serializar.

### Autenticación — `routes/auth.py`

| Método y ruta | Propósito | Estado inicial | Problema | Cambio aplicado | Campos devueltos ahora |
|---|---|---|---|---|---|
| `POST /auth/login` | Iniciar sesión | ✅ `TokenResponse` | — | Sin cambios. No devuelve email ni datos del usuario. | `access_token`, `token_type`, `expires_in` |
| `GET /auth/me` | Datos de la sesión | ⚠️ `AuthMeResponse` | `profile` exponía `user_id` | Usa el nuevo `ProfileResponse` explícito | `email` (el propio, permitido), `role`, `profile{id, name, phone, address}` |
| `POST /auth/forgot-password` | Pedir enlace de reseteo | ✅ `MessageResponse` | — | Sin cambios. Mismo mensaje exista o no el email. | `message` |
| `POST /auth/reset-password` | Restablecer contraseña | ✅ `MessageResponse` | — | Sin cambios | `message` |
| `POST /auth/change-password` | Cambiar contraseña con sesión | ✅ `MessageResponse` | — | Sin cambios | `message` |

### Usuarios y perfiles — `routes/users.py`, `routes/profiles.py`

| Método y ruta | Propósito | Estado inicial | Problema | Cambio aplicado | Campos devueltos ahora |
|---|---|---|---|---|---|
| `POST /users` | Registro (sin autenticar) | ⚠️ `UserRegistrationResponse` | Devolvía `user.email`, `user.is_active`, `user.created_at` y `profile.user_id` | Nuevo `RegisteredUser{id, role}`. Los frontends solo comprueban el 201 y después hacen login. | `user{id, role}`, `profile{id, name, phone, address}` |
| `GET /users` | Lista de usuarios (admin) | ⚠️ `list[UserResponse]` | Reutilizaba el schema de detalle | Nuevo `UserListItem`: lo que necesita el admin para elegir una cuenta | `id`, `email`, `role`, `is_active` |
| `GET /users/{id}` | Detalle (propio o admin) | ✅ `UserResponse` | — | Sin cambios. Ya excluía `hashed_password`. | `id`, `email`, `is_active`, `role`, `created_at` |
| `PUT /users/{id}` | Editar cuenta | ✅ `UserResponse` | — | Sin cambios. La entrada (`UserUpdate`) ya era un schema aparte. | ídem |
| `DELETE /users/{id}` | Borrar cuenta | ⚠️ sin `response_model` | Contrato implícito | `response_model=None` + 204 explícitos | *(sin cuerpo)* |
| `GET /profiles/me` | Perfil propio | ⚠️ `ProfileResponse(Profile)` | Heredaba del registro interno y exponía `user_id` | `ProfileResponse` con campos explícitos | `id`, `name`, `phone`, `address` |
| `PUT /profiles/me` | Editar perfil | ⚠️ ídem | ídem | ídem. La entrada es `ProfileUpdate`. | ídem |

### Proveedores — `routes/suppliers.py`

| Método y ruta | Propósito | Estado inicial | Problema | Cambio aplicado | Campos devueltos ahora |
|---|---|---|---|---|---|
| `POST /suppliers` | Alta | ⚠️ `SupplierResponse(Supplier(SupplierCreate))` | La salida heredaba de la entrada | `SupplierResponse` independiente con campos explícitos | ver `SupplierResponse` ↓ |
| `GET /suppliers` | Directorio (con filtros y caché) | ⚠️ ídem | ídem | ídem. Comparte schema con el detalle porque la tabla del backoffice lee **todos** los campos: nombre, contacto, notas, zona, tarifa, estado y última actualización. | ídem |
| `GET /suppliers/{id}` | Detalle | ⚠️ ídem | ídem | ídem | ídem |
| `PATCH /suppliers/{id}/rate` | Cambiar tarifa | ⚠️ ídem | ídem | ídem. La entrada es `RateUpdate`, solo `rate_per_shipment`. | ídem |
| `PATCH /suppliers/{id}/status` | Cambiar estado | ⚠️ ídem | ídem | ídem. La entrada es `StatusUpdate`, solo `status`. | ídem |
| `GET /suppliers/{id}/status-history` | Historial de estados | ⚠️ `list[SupplierStatusEvent]` | Repetía `supplier_id` en cada evento, aunque ya va en la URL | Se elimina `supplier_id` de la respuesta | `id`, `previous_status`, `status`, `changed_at` |
| `DELETE /suppliers/{id}` | Baja | ⚠️ sin `response_model` | Contrato implícito | `response_model=None` + 204 explícitos | *(sin cuerpo)* |

`SupplierResponse` = `id`, `name`, `country`, `categories`, `rate_per_shipment`, `currency`, `status`, `service_zone`, `contact_email`, `notes`, `updated_at`.

> `contact_email` es el correo **comercial del proveedor**, no el de un usuario de la plataforma. Se mantiene porque el directorio lo muestra como enlace `mailto:`.

### Incidencias — `routes/incidents.py`

| Método y ruta | Propósito | Estado inicial | Problema | Cambio aplicado | Campos devueltos ahora |
|---|---|---|---|---|---|
| `POST /api/incidents` | Alta | ⚠️ `IncidentResponse(IncidentRecord(IncidentCreate))` | La salida heredaba de la entrada | `IncidentResponse` independiente | `id`, `title`, `description`, `category`, `status`, `origin`, `branch`, `source_ref`, `created_at`, `updated_at` |
| `GET /api/incidents` | Tabla de incidencias | ⚠️ `list[IncidentResponse]` | Reutilizaba el detalle | Nuevo `IncidentListItem`, sin `updated_at` (la tabla no lo muestra) | `id`, `title`, `description`, `category`, `status`, `origin`, `branch`, `source_ref`, `created_at` |
| `GET /api/incidents/{id}` | Detalle | ⚠️ ídem | ídem | `IncidentResponse` | campos del alta |
| `PATCH /api/incidents/{id}/status` | Cambio de estado | ⚠️ ídem | ídem | `IncidentResponse`. La entrada es `IncidentStatusUpdate`, solo `status`. | campos del alta |
| `GET /api/incidents/summary` | KPIs del panel | ✅ `IncidentSummary` | — | Sin cambios. Solo contiene recuentos agregados. | `total`, `by_status`, `by_category`, `by_origin`, `by_branch` |

> `source_ref` se mantiene: es la referencia de las incidencias importadas del CSV y el backoffice la muestra como «Ref.». El cliente **no puede escribirla**, porque `IncidentCreate` tiene `extra="forbid"` y el test lo comprueba.

### Análisis de CSV de incidencias — `routes/incidents_analysis.py`

| Método y ruta | Propósito | Estado inicial | Problema | Cambio aplicado | Campos devueltos ahora |
|---|---|---|---|---|---|
| `POST /api/incidents/analyze` | Analizar un CSV subido | ❌ `dict[str, object]` | Sin contrato: en OpenAPI aparecía como objeto genérico | Nuevos `IncidentAnalysisResult`, `AnalysisMetrics` y `AnalysisErrorBucket`. Las claves siguen en camelCase porque es el contrato que ya lee `lib/incident-analysis.ts`. | `metrics{total, valid, invalid, scoredClosed, closed, averageSatisfaction}`, `errors{clave: {label, count}}`, `categories`, `statuses`, `countries`, `satisfactionScores` |
| `GET /api/incidents/results/export` | Descargar resultados | ❌ sin contrato (`{}` en OpenAPI) | No declaraba qué devuelve | `response_model=None` + `response_class=StreamingResponse` + tipo `text/csv` documentado | CSV `metrica,valor` |

> Solo salen **agregados**. Ninguna fila del CSV subido (con emails de clientes y números de seguimiento) se devuelve en la respuesta.

### Inventario — `routers/inventory.py`, `inventory/schemas.py`

| Método y ruta | Propósito | Estado inicial | Problema | Cambio aplicado | Campos devueltos ahora |
|---|---|---|---|---|---|
| `GET /inventory/products` | Stock por SKU | ✅ `list[SKURead]` | — | Sin cambios. La tabla de stock usa todos los campos. | `id`, `name`, `sku`, `client_name`, `category`, `warehouse`, `current_stock` |
| `POST /inventory/products` | Alta de SKU | ✅ `SKURead` | — | Sin cambios. La entrada es `SKUCreate`. | ídem |
| `GET /inventory/products/{id}` | Detalle de SKU | ✅ `SKURead` | — | Sin cambios | ídem |
| `POST /inventory/orders/inbound` | Entrada de stock | ⚠️ `StockEntryRead` | `sku_id` repetido junto al `sku` anidado; `sku` repetía `warehouse` y `client_name` | Se quita `sku_id`. `SKUSummary` pasa a ser `{id, name, sku}`. | `id`, `movement`, `quantity`, `reference`, `warehouse`, `created_at`, `user_uuid`, `sku{id, name, sku}` |
| `POST /inventory/orders/outbound` | Salida de stock | ⚠️ `StockExitRead` | ídem | ídem | `id`, `movement`, `quantity`, `exit_type`, `tracking_number`, `warehouse`, `created_at`, `user_uuid`, `sku{id, name, sku}` |
| `GET /inventory/orders` | Historial de movimientos | ⚠️ `list[StockEntryRead \| StockExitRead]` | ídem, multiplicado por cada fila | ídem. Además, `movement` actúa como discriminador. | ídem |

## Relaciones: qué se devuelve en cada caso

| Relación | Decisión | Por qué |
|---|---|---|
| Usuario → perfil (`/auth/me`, registro) | **Objeto anidado** `profile` sin `user_id` | La vista de cuenta necesita nombre, teléfono y dirección. El `user_id` es una clave foránea que solo usa el servidor. |
| Movimiento → SKU (`/inventory/orders*`) | **Proyección plana** `sku{id, name, sku}`, sin `sku_id` aparte | La tabla imprime código y nombre. El `id` permite enlazar al producto. Repetir `sku_id`, `warehouse` (el movimiento ya lo tiene) o `client_name` solo añadía peso a cada fila. |
| Movimiento → usuario que lo registra | **Solo el identificador opaco** `user_uuid` | Es un requisito del Milestone 5: la columna «Registrado por». Es un UUID público, no el `id` interno de TinyDB, y nunca va acompañado de email ni de nombre. |
| Cambio de estado → proveedor | **Nada** (se elimina `supplier_id`) | El cliente ya lo tiene en la URL `/suppliers/{id}/status-history`. |
| Incidencia → origen CSV | **Solo `source_ref`** | Es la referencia que el equipo ve en la tabla. El resto de la fila CSV no se guarda en la incidencia. |

## Verificación

**Tests automáticos.** `uv run pytest tests` → **104 tests pasan**: los 95 que ya existían, uno de ellos actualizado, más 9 nuevos en `tests/test_serialization.py`. La cobertura de `services.api` es del 95 %.

`tests/test_serialization.py` fija el **conjunto exacto de claves** de cada respuesta, de modo que un campo nuevo del modelo no puede filtrarse sin que falle un test:

- `test_every_route_declares_its_response_model`: recorre el OpenAPI generado y exige un schema con nombre en las 29 operaciones con cuerpo JSON (32 operaciones − 2 DELETE − 1 CSV). Lo comprobé revirtiendo `incidents_analysis.py`: el test falla y señala `POST /api/incidents/analyze`. Se usa el OpenAPI porque esta versión de FastAPI envuelve los routers incluidos y `app.routes` no expone las rutas individuales.
- `test_no_response_schema_exposes_credentials`: ningún schema de salida tiene `password`, `hashed_password` ni `new_password`.
- Registro, login y forgot-password no contienen el email en el cuerpo. `/auth/me` sí lo contiene y su perfil no lleva `user_id`.
- La lista de usuarios es más ligera que el detalle. La lista de incidencias no lleva `updated_at` y el detalle sí.
- El historial de proveedores no repite `supplier_id`, y `POST /suppliers` rechaza `id` y `updated_at` en la entrada (422).
- Los movimientos de inventario no llevan `sku_id` y su `sku` es exactamente `{id, name, sku}`.

**Frontends.** Se actualizaron los tipos TypeScript que describían campos eliminados: `Profile.user_id` en los dos `auth-client.ts`, `sku_id` y `SkuSummary` en `lib/inventory.ts`, y `updated_at` opcional en `lib/incidents.ts`. Ninguna pantalla leía esos campos.

- Backoffice: `tsc --noEmit`, `npm run lint`, `npm test` (17 tests) y `npm run build` pasan.
- Talent Pipeline Tracker: `npm run lint` pasa. `next build` falla en este entorno solo porque no puede descargar las fuentes Geist de Google Fonts (no hay salida a internet); el fallo no tiene relación con el cambio.

**Pruebas manuales en `/docs` (Swagger UI).** API arrancada en local con bases de datos temporales y datos creados desde la propia API:

| # | Endpoint | Qué se comprueba | Captura |
|---|---|---|---|
| 1 | `POST /users` | 201 con `user{id, role}` y `profile` sin `user_id`. El email enviado no aparece en la respuesta. | [01-register-no-email.png](screenshots/serialization-audit/01-register-no-email.png) |
| 2 | `GET /auth/me` | Devuelve el email propio, `role` y `profile{id, name, phone, address}` | [02-auth-me.png](screenshots/serialization-audit/02-auth-me.png) |
| 3 | `GET /inventory/orders` | Entradas y salidas con `sku{id, name, sku}` plano, sin `sku_id` | [03-inventory-orders-flat-sku.png](screenshots/serialization-audit/03-inventory-orders-flat-sku.png) |
| 4 | `GET /suppliers` | 11 campos explícitos y cabecera `X-Cache` intacta | [04-suppliers-list.png](screenshots/serialization-audit/04-suppliers-list.png) |
