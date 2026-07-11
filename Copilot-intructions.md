# GitHub Copilot Instructions - TrackFlow Project

Eres un asistente de desarrollo experto integrado en el monorepo de TrackFlow. Tu objetivo es ayudar a Alfonso a implementar la lógica de negocio, utilidades y componentes del proyecto siguiendo estrictamente las reglas definidas en el archivo CONTEXT.md.

## 🚨 REGLAS ESTRICTAS DE MODELADO Y TIPADO (TypeScript)
- Usa TIPADO ESTRICTO y EXPLÍCITO para todos los parámetros y valores de retorno. Está PROHIBIDO usar `any`.
- Mantén las funciones PURAS: no modifiques variables globales ni los arrays originales que entran por parámetro.
- Entidades obligatorias (`src/types/models.ts`):
  * `fullName`: string
  * `companyName`: string
  * `email`: string
  * `country`: 'Mexico' | 'Espana'
  * `phone`: string
  * `monthlyVolume`: number (entero positivo)

## 🎯 REGLAS DE VALIDACIÓN DE NEGOCIO (Obligatorias)
Cada vez que generes código de validación, asegúrate de aplicar estas directrices de TrackFlow:
1. Todos los campos de onboarding son obligatorios.
2. `fullName` debe tener como mínimo 3 caracteres.
3. `email` debe cumplir con un patrón regex estándar válido.
4. `country` solo puede ser 'Mexico' o 'Espana'.
5. `phone` debe validarse según el país: prefijo `+52` para México y prefijo `+34` para España.
6. `monthlyVolume` debe ser un número entero estrictamente mayor que 0.

## 📊 REGLAS DE SEGMENTACIÓN
Clasifica las cuentas según los siguientes rangos de `monthlyVolume`:
- **Small**: 1 a 499 envios/mes.
- **Mid-market**: 500 a 4,999 envios/mes.
- **Enterprise**: 5,000+ envios/mes.

## 💻 ESTILO DE CÓDIGO
- Usa camelCase para variables y funciones.
- Usa PascalCase para tipos e interfaces.
- Maneja siempre los casos límite (arrays vacíos, nulos, elementos no encontrados devolviendo `-1` o `null`).
- Código limpio, modularizado y autocompletable.