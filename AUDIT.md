# AUDIT — Rendimiento de los frontends (Lighthouse)

## Cómo se ha medido

- **Siempre en producción**:
  - `next build` + `next start` para el website (`:3000`) y el backoffice (`:3001`);
  - la API FastAPI en `:8000` con los datos de seed (proveedores y 95 incidencias).
  - Nunca se ha medido con `next dev`.
- **Herramienta**: Lighthouse 12 (CLI) con Chromium headless.
  - Móvil: emulación de Moto G Power y 4G lenta, que es el valor por defecto.
  - Escritorio: `--preset=desktop`.
- **Backoffice autenticado**: antes de medir se inicia sesión en un perfil de Chrome y se usa `--disable-storage-reset`, para que se audite la vista real y no la pantalla de login.
- **Capturas**: `audit/before/` y `audit/after/`. Las puntuaciones exactas están en `audit/*/summary.json`.

> **Limitación del entorno.** El entorno donde se midió no tiene salida a `fonts.googleapis.com`: la petición falla al instante en lugar de tardar. Por eso las puntuaciones iniciales de rendimiento son **optimistas**. En una red real, la cadena de fuentes de Google añade varios cientos de milisegundos al FCP y al LCP. Aun así, Lighthouse marcó esa petición como *render-blocking* (230–780 ms estimados) y se ve claramente en el FCP de móvil.

## Puntuaciones iniciales

| Página | Modo | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|---|
| Website `/` | Móvil | 97 | 96 | 96 | 100 | 2.0 s | 2.2 s | 50 ms | 0 |
| Website `/` | Escritorio | 100 | 96 | 96 | 100 | 0.4 s | 0.5 s | 0 ms | 0 |
| Backoffice `/` (panel de control) | Escritorio | 100 | 95 | 96 | 100 | 0.4 s | 0.4 s | 0 ms | 0 |
| Backoffice `/incidents` (la vista más cargada: resumen y 95 filas) | Escritorio | 100 | 94 | 96 | 100 | 0.4 s | 0.4 s | 0 ms | 0.009 |

El website se midió en móvil y en escritorio porque es la página que más pesa para el SEO. En el backoffice se midieron el panel de control y la vista con más elementos.

## Problemas y su causa

### 1. Fuentes de Google cargadas con `@import` (render-blocking). Ambas apps.
- **Qué marca Lighthouse**: *Eliminate render-blocking resources* y *Network dependency tree*. En móvil, el FCP es de 2.0 s y el Speed Index de 2.7 s.
- **Causa**: `globals.css` empezaba con `@import url('https://fonts.googleapis.com/...')`. Eso crea una cadena de cuatro saltos (HTML → CSS propio → CSS de Google → archivos `.woff2`, en otro dominio con su propio DNS y TLS). El navegador no puede pintar hasta resolver los dos primeros saltos. Además, un `@import` dentro de CSS no lo detecta el preload scanner.
- **Efecto secundario**: si Google Fonts falla o está bloqueado, aparece un error en consola, y eso penaliza Best Practices.

### 2. Toda la home del website era un Client Component
- **Qué marca Lighthouse**: *Reduce unused JavaScript* (unos 57 KiB) y un TBT de 50 ms en móvil.
- **Causa**: `app/page.tsx` empezaba con `"use client"` solo porque el formulario de contacto necesita estado. Eso obligaba a hidratar en el cliente toda la página de marketing (hero, métricas, footer), que es contenido estático, y a enviar su código en el bundle.

### 3. Falta el favicon (website)
- **Qué marca Lighthouse**: *Browser errors were logged to the console*, por un 404 en `/favicon.ico`.
- **Causa**: ninguna de las dos apps tenía `app/icon.*` ni `favicon.ico`, así que el navegador lo pide igualmente.

### 4. Contraste de color insuficiente. Ambas apps.
- **Qué marca Lighthouse**: *color-contrast*. Es lo que más baja Accessibility (94–96).
- **Causa**: un token de diseño se usa para algo que no es lo suyo. El coral de marca `#ed765c` está pensado para elementos decorativos, pero se usaba como **color de texto** (eyebrow, kicker, métricas) y como **fondo de botones con texto blanco**. Los ratios eran de 2.6–2.9:1, cuando el mínimo es 4.5:1. Lo mismo pasa con los grises `--muted` (3.8–4.2:1), el verde de las tendencias y el texto de las insignias de estado y segmento (3.6–4.1:1). Y en la tarjeta oscura del panel, el kicker usaba el coral oscuro sobre fondo oscuro.

### 5. El nombre accesible del logo no coincidía con el texto visible (website)
- **Qué marca Lighthouse**: *label-content-name-mismatch* (aparece tras la refactorización del logo).
- **Causa**: el `aria-label` "TrackFlow, ir al inicio" no contenía el texto visible "trackflow". Quien usa control por voz dice lo que ve, así que el comando no funciona.

### 6. Orden de encabezados (backoffice `/incidents`)
- **Qué marca Lighthouse**: *heading-order*.
- **Causa**: el panel de resumen pasaba de un `h1` a un `h3` sin `h2` en medio.

### 7. CSS propio render-blocking (website, móvil)
- **Causa**: después de quitar las fuentes de Google, la única petición bloqueante que queda es el `<link>` al CSS de la página. Pesa unos 6 KB y se descarga en un segundo viaje de red.

### Detectados pero sin corregir (justificado)
- **Legacy JavaScript (unos 14 KiB)**: son polyfills que mete el propio Next.js (`Array.prototype.at`, `Object.hasOwn`…) en un chunk del framework. No es código del proyecto y no tiene un arreglo puntual.
- **DOM grande en `/incidents`** (1.491 elementos): son 95 filas, cada una con su selector de estado. La solución correcta es paginar en el servidor, pero eso cambia la API y la arquitectura, que queda fuera del alcance de una corrección puntual. Queda anotado como siguiente paso.

## Lógica duplicada: candidatos a refactorizar

### A. El logo de TrackFlow (`<a class="brand"><span class="brand-mark">TF</span> trackflow</a>`)
- **Dónde**: en el website, dos veces en `app/page.tsx` (nav y footer). El backoffice tiene una copia del mismo marcado en `AppFrame`.
- **Por qué refactorizar**: es el mismo marcado y la misma semántica. Cualquier cambio de accesibilidad, como el del punto 5, había que hacerlo en cada copia.
- **Abstracción**: un componente `<Brand href? />` en `uis/website/components/Brand.tsx`. **Aplicado.**

### B. Manejadores `onChange` repetidos en el formulario de contacto
- **Dónde**: en `uis/website/app/page.tsx`, seis veces `onChange={(e) => setForm({...form, campo: e.target.value})}`.
- **Por qué refactorizar**: es la misma lógica copiada por campo. Crea un closure nuevo por input en cada render y es fácil equivocarse de nombre de campo al copiar.
- **Abstracción**: un custom hook `useFormFields(initial)` que devuelve `field("nombre") → { name, value, onChange }` con un único manejador estable. Está en `uis/website/hooks/useFormFields.ts`. **Aplicado.**

### C. Carga de datos con tres estados en el backoffice
- **Dónde**: en el listado de incidencias (`app/incidents/page.tsx`) y en el panel de resumen (`components/IncidentSummaryPanel.tsx`). El directorio de proveedores sigue el mismo patrón.
- **Por qué refactorizar**: cada uno repetía lo mismo: un `useEffect` con un flag `active` para ignorar respuestas viejas, `parseResponse` + `toUserMessage`, el estado de carga, el de error y un contador para reintentar. Eran unas 20 líneas casi iguales en cada sitio.
- **Abstracción**: un custom hook `useApiQuery<T>(path, mensaje, refreshKey)` que devuelve `{ state, retry }`, donde `state` es `loading | error | success`. Está en `uis/backoffice/hooks/useApiQuery.ts`. **Aplicado** en el listado y en el resumen. Los proveedores pueden migrarse más adelante.

## Agent skills
No se han instalado las skills propuestas (`core-web-vitals`, `performance`, `web-perf`), porque el enunciado las marca como opcionales. Las correcciones siguen las mismas prioridades que esas skills: primero las métricas principales (FCP/LCP/TBT/CLS), luego los recursos que bloquean el render, el JavaScript innecesario y la hidratación, y al final accesibilidad y buenas prácticas.
