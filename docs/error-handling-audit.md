# Auditoría de manejo de errores

Rama: `feature/error-handling-audit`. Alcance: solo resiliencia y comunicación de errores del código existente. No añade funcionalidades nuevas.

## Hallazgos

| Severidad | Capa | Archivo(s) | Categoría | Problema |
|---|---|---|---|---|
| CRITICAL | Backend | `services/api/main.py` | Exposición de errores | No había manejador global. Una excepción no controlada devolvía `Internal Server Error` en texto plano en lugar de JSON. |
| CRITICAL | Backend | validación de FastAPI (todas las rutas) | Fuga de datos sensibles | Las respuestas 422 devolvían el campo `input`, así que una contraseña rechazada volvía al cliente. |
| HIGH | Backend | `routes/incidents_analysis.py` | Exposición de errores / catch demasiado amplio | Un único `try` cubría la subida y el análisis, y devolvía `str(error)`. Un `OSError` podía mostrar rutas internas de `/tmp`. |
| HIGH | Frontend | `backoffice` y `talent-pipeline-tracker`: login, registro, perfil, proveedores, análisis | Exposición de errores | Se llamaba a `response.json()` sin protección. Si el proxy devolvía una página HTML, el usuario veía `Unexpected token <`. Un fallo de red mostraba `Failed to fetch`. |
| HIGH | Frontend | `AuthProvider` (ambas apps) | Fallo silencioso | Cualquier error al comprobar la sesión (también una caída de red o un 500) cerraba la sesión del usuario sin explicación. |
| HIGH | Frontend | `talent-pipeline-tracker/lib/services/candidates.ts` | Exposición de errores | Mostraba `Error 500 al comunicarse con la API.` o hacía `JSON.stringify(detail)` del error de Pydantic. |
| MEDIUM | Frontend | `backoffice/app/suppliers/page.tsx` | Sin estado de carga ni de error | El estado de carga no volvía a activarse al cambiar filtros. Los errores de carga no tenían botón de reintento. Las acciones por fila no tenían estado ocupado. |
| MEDIUM | Frontend | `ErrorState` (ambas apps) y páginas de detalle, edición y notas | Sin llamada a la acción | Los errores mostraban un mensaje sin forma de avanzar. |
| MEDIUM | Frontend | análisis de incidencias, proveedores, notas | Renderizado de `undefined` | El código accedía a propiedades anidadas (`result.metrics.*`, `supplier.categories`, `note.created_at`) sin valor por defecto. |
| MEDIUM | Scripts | `scripts/analyze.py` | Mensajes poco útiles | Agrupaba todos los errores en uno genérico y no comprobaba la ruta antes de abrirla. |
| MEDIUM | Scripts | `services/api/seed.py` | Falta `sys.exit` | Una fila inválida abortaba con traceback y no había código de salida explícito. |
| LOW | Scripts | `skills/data-analysis/scripts/pandas_clean.py` | Sin gestión de E/S | `read_csv` sin `try` ni código de salida. |
| LOW | Backend | rutas (`auth`, `users`, `profiles`, `suppliers`) | Mensajes no legibles para el usuario | Los mensajes de error estaban en inglés en una interfaz en español. |

## Cambios

### Backend (`services/api`)
- `errors.py` define un formato de error único: `{detail, message, field?}`.
  - El 500 es genérico; el traceback solo va al log del servidor.
  - El 422 se limpia: se eliminan `input`, `ctx` y `url`.
  - Un `OSError` de almacenamiento devuelve 503 con un mensaje claro.
- Análisis de CSV: el `try` se divide en dos pasos, cada uno con sus excepciones concretas.
  - **Guardar la subida**: un error aquí es del servidor y devuelve 503 sin detalles.
  - **Leer el CSV**: devuelve 400 con un motivo comprensible (codificación, formato, columnas que faltan).
- Mensajes de `HTTPException` traducidos al español.
- Tests nuevos en `tests/test_errors.py`. Comprueban que:
  - no se devuelve la entrada del usuario;
  - el 500 no expone secretos ni el traceback;
  - el 404 tiene un formato limpio;
  - el CSV mal formado se explica en lenguaje claro.

### Frontend (Next.js)
- `lib/http.ts` en cada app:
  - `parseResponse` lee el cuerpo de forma segura y convierte el código HTTP en un mensaje legible;
  - `toUserMessage` distingue los fallos de red;
  - los mensajes de validación se reparten por campo.
- `ErrorState` siempre ofrece una salida: botón **Reintentar** cuando aplica, **Volver al inicio/listado** y **Contactar con soporte**.
- Patrón de tres estados (cargando / datos / error con reintento):
  - listado de proveedores, listado de candidatos, detalle, edición y notas;
  - análisis de CSV (con reintento del análisis y de la descarga);
  - comprobación de sesión.
- `finally` limpia el estado de carga en todas las operaciones asíncronas. Se añade estado ocupado a las acciones por fila de proveedores.
- Encadenamiento opcional y valores por defecto en los datos que pueden faltar.

### Scripts
- `analyze.py`:
  - comprueba antes de procesar que el archivo existe y es un archivo;
  - da un mensaje por tipo de error (permisos, E/S, codificación, CSV, estructura) en `stderr`;
  - sale con `exit 1`.
- `seed.py`: informa de las filas inválidas sin abortar, trata como críticos los errores de almacenamiento y devuelve un código de salida distinto de 0.
- `pandas_clean.py`: valida la entrada, captura los errores de E/S y de parseo, y usa `sys.exit(1)`.

## Verificación
- `pytest services/api/tests`: 13 de 13 en verde.
- `tsc --noEmit` y `eslint` limpios en `uis/backoffice` y `uis/talent-pipeline-tracker`.
- `python scripts/analyze.py inexistente.csv` → mensaje en `stderr` y código de salida 1.
