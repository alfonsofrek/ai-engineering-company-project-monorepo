# Review brand signup flow

## Objetivo
Verificar que un formulario o servicio de alta de marcas cliente cumple el formulario oficial de TrackFlow (Milestone 1).

## Inputs
- Ruta o archivos modificados del flujo.
- Comando de validación disponible para la aplicación.
- [`docs/briefings/01-web-fundamentals.es.md`](../../../docs/briefings/01-web-fundamentals.es.md): secciones «Campos del formulario», «Validaciones específicas» y «Mensajes de error esperados».

## Procedimiento
1. Comprobar que el formulario tiene los 12 campos del briefing, con su tipo (`text`, `email`, `tel`, `url`, `select`, `checkbox`, `radio`, `textarea`) y sus opciones exactas.
2. Comprobar las 8 validaciones del briefing: nombre y apellido, `+` y código de país en el teléfono, URL `http(s)://` opcional, al menos un servicio, contador de 500 caracteres y privacidad marcada.
3. Comprobar que cada error muestra el mensaje literal del briefing.
4. Ejecutar lint y build de la aplicación afectada.

## Criterios de aceptación verificables
- Están los 12 campos y no sobra ninguno.
- País de operación: solo «Estados Unidos / España / Ambos / Otro».
- Volumen mensual: solo «0-100 / 101-500 / 501-2000 / 2000+ / No estoy seguro».
- No se puede enviar sin al menos un servicio ni sin aceptar la privacidad.
- Los mensajes de error coinciden palabra por palabra con el briefing.
- `npm run lint` y `npm run build` terminan con código 0.
