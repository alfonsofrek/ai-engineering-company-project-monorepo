# API de proveedores TrackFlow

API FastAPI para gestionar el directorio de proveedores con TinyDB. El contrato y los datos iniciales siguen el [briefing oficial de TrackFlow](https://github.com/4GeeksAcademy/ai-engineering-syllabus/blob/main/content/contexts/supplier-directory/trackflow-BRIEFING.es.md).

## Ejecutar

Desde `services/api`:

```bash
uv sync --group dev
cp .env.example .env
uv run seed
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

El seeder inserta 15 proveedores y es idempotente. TinyDB persiste en `services/api/data/suppliers.json`; `SUPPLIERS_DB_PATH` permite usar otra ruta.

Antes de iniciar la API, sustituye `JWT_SECRET_KEY` en `.env` por el resultado de `openssl rand -hex 32`. `ACCESS_TOKEN_EXPIRE_MINUTES` controla la vigencia del token. No subas `.env` al repositorio.

En otra terminal, inicia el backoffice desde `uis/backoffice`:

```bash
npm install
npm run dev
```

Next.js reenvía `/api/suppliers/*` al API en `http://127.0.0.1:8000`, sin interceptar la página `/suppliers`. Configura `API_INTERNAL_URL` para usar otro host. Si consumes el API desde un origen distinto, configura `BACKOFFICE_ORIGIN`.

## Contrato de proveedores

El modelo acepta `USA` o `Spain`, las ocho categorías del briefing y los estados `active` o `suspended`. `rate_per_shipment` debe ser positivo; la moneda es `USD` para USA y `EUR` para Spain. `updated_at` lo genera el sistema. `service_zone`, `contact_email` y `notes` son opcionales; el email se valida cuando está presente. El directorio de proveedores usa los países del briefing específico y no modifica las reglas de países del flujo de onboarding.

## Endpoints

### Autenticación, usuarios y perfiles

- `POST /users`: registro público con email y contraseña; crea un usuario con rol `user` y su perfil vinculado. El nombre, teléfono y dirección se guardan únicamente en `Profile`.
- `POST /auth/login`: valida email y contraseña y devuelve un bearer token JWT.
- `GET /auth/me`: devuelve identidad, rol y perfil del usuario autenticado.
- `GET /users`: lista usuarios; solo admin.
- `GET /users/{id}`: consulta propia o de admin.
- `PUT /users/{id}`: cambia email/contraseña el propio usuario o un admin; solo admin puede cambiar rol o activar/desactivar cuentas.
- `DELETE /users/{id}`: elimina la cuenta propia o la de otro usuario como admin, incluyendo el perfil.
- `GET /profiles/me` y `PUT /profiles/me`: consulta y actualiza el perfil del usuario autenticado.

Todas las rutas de usuarios excepto `POST /users`, las rutas de perfil y `/auth/me` requieren `Authorization: Bearer <token>`. El login es público. Los endpoints de proveedores también requieren autenticación.

Para verificarlo en `/docs`, registra un usuario con `POST /users`, inicia sesión con `POST /auth/login` y autoriza las solicitudes con el `access_token`. Las rutas protegidas devuelven `401` sin token, con token inválido o expirado; una operación sobre la cuenta de otro usuario devuelve `403`.

### Proveedores

- `POST /suppliers`: crea un proveedor y devuelve el ID de TinyDB.
- `GET /suppliers`: lista proveedores; filtros opcionales `country` y `category`.
- `GET /suppliers/{id}`: consulta un proveedor; devuelve `404` si no existe.
- `PATCH /suppliers/{id}/rate`: actualiza `rate_per_shipment` y `updated_at`.
- `PATCH /suppliers/{id}/status`: cambia entre `active` y `suspended`.
- `GET /suppliers/{id}/status-history`: consulta las transiciones de estado persistidas.
- `DELETE /suppliers/{id}`: elimina un proveedor; devuelve `404` si no existe.

Pruebas del contrato, filtros, validaciones, persistencia y seeder:

```bash
uv run pytest tests
```

## Evidencias

- [Salida del seeder](../../docs/screenshots/supplier-seed.png)
- [Respuesta del filtro por país en Swagger UI](../../docs/screenshots/supplier-api-filter.png)
- [Directorio web filtrado por país](../../docs/screenshots/supplier-directory-filter.png)
