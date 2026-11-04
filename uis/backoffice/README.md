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

## Inventario (Milestone 5 — Backoffice)

Sección para el personal de almacén sobre la API `/inventory` (ver `services/api/README.md`). Todas las páginas requieren sesión; sin ella redirigen a `/login`.

| Ruta | Qué hace |
|---|---|
| `/inventory/products` | Stock por SKU con indicador de nivel: verde ≥ 20 uds., ámbar 1–19, rojo 0 (umbrales en `lib/inventory.ts`). Filtro por almacén y accesos a entrada/salida por fila |
| `/inventory/orders/inbound` | Registrar una entrada (`StockEntry`): SKU por nombre, unidades y referencia de la marca |
| `/inventory/orders/outbound` | Registrar una salida (`StockExit`): muestra el stock disponible del SKU elegido (se consulta a la API al cambiarlo), avisa si la cantidad lo supera y enseña el `400` de stock insuficiente junto al campo |
| `/inventory/orders` | Historial de solo lectura: fecha, tipo (entrada/salida), SKU, unidades, almacén, referencia o seguimiento y `user_uuid` |

Todas las llamadas pasan por `lib/inventory.ts` (ningún componente usa `fetch`), con el token `Bearer` de la sesión. Por defecto van por el proxy de Next.js `/api/inventory/*`; para apuntar a otra API, define `NEXT_PUBLIC_INVENTORY_API_URL` en `.env.local` (ignorado por git).

Capturas: [`docs/screenshots/inventory-backoffice/`](../../docs/screenshots/inventory-backoffice/).
