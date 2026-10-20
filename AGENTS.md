# Agent operating rules

## Inicio de cada sesion
1. Leer `CONTEXT.md` como fuente de verdad del negocio.
2. Leer `memory-bank/projectbrief.md`, `memory-bank/techContext.md` y `memory-bank/progress.md`.
3. Revisar el README del area que se va a modificar y el estado de Git.
4. Localizar la implementacion y las pruebas mas cercanas antes de editar.

## Flujo obligatorio antes de cada commit
1. Confirmar que el cambio respeta `CONTEXT.md` y actualizar la memoria si cambia una decision.
2. Ejecutar lint y build en cada aplicacion modificada.
3. Revisar el diff y comprobar que no contiene secretos, datos personales sensibles o archivos generados.
4. Probar manualmente las rutas afectadas y verificar los criterios de aceptacion de la skill correspondiente.
5. Registrar en `memory-bank/progress.md` lo completado y lo siguiente antes de crear el commit.

## No modificar sin confirmacion explicita
- `CONTEXT.md` y cualquier briefing de negocio.
- Datos personales reales, secretos, archivos `.env` y credenciales.
- La rama principal, configuracion de CI o infraestructura de despliegue.
- Las carpetas `agents/`, `skills/`, `mcps/` y `services/` cuando el cambio sea solo de UI.

## Alcance
Las reglas de este archivo aplican a todo el monorepo. Las reglas mas especificas de `.agents/rules/` se aplican cuando su patron lo indique.
