# TrackFlow backoffice

Vista interna para revisar solicitudes de onboarding, priorizar cuentas por volumen mensual y observar indicadores de operacion.

## Ejecutar

```bash
npm install
npm run dev
```

Los datos de la pantalla son demostrativos y estan preparados para conectarse a un servicio bajo `/services`.

## Autenticación

La aplicación requiere iniciar sesión para acceder al resumen, al directorio de proveedores y al perfil. `/login` y `/register` son públicas. El registro crea la cuenta y su perfil inicial, inicia sesión y guarda el JWT en `localStorage`; el logout elimina el token. Las llamadas protegidas envían `Authorization: Bearer` y un `401` invalida la sesión y redirige a `/login`.

Inicia primero la API autenticada con las instrucciones de [`services/api/README.md`](../../services/api/README.md), configura `API_INTERNAL_URL` en el servidor Next si la API no está en `http://127.0.0.1:8000`, y ejecuta `npm run dev`. El website público en `uis/website` no usa este guard ni requiere autenticación.

La ruta `/account/profile` carga el email y los datos de contacto desde `/auth/me` y guarda cambios en `/profiles/me`.

## Directorio de proveedores

La ruta `/suppliers` consume la API de TinyDB para listar, filtrar, registrar y actualizar proveedores. El contrato específico está definido por el [briefing oficial de TrackFlow](https://github.com/4GeeksAcademy/ai-engineering-syllabus/blob/main/content/contexts/supplier-directory/trackflow-BRIEFING.es.md). Inicia primero la API y ejecuta `uv run seed` desde `services/api`; los comandos completos están en [`services/api/README.md`](../../services/api/README.md).

Evidencias: [seeder](../../docs/screenshots/supplier-seed.png), [respuesta API filtrada](../../docs/screenshots/supplier-api-filter.png) y [pantalla filtrada](../../docs/screenshots/supplier-directory-filter.png).
