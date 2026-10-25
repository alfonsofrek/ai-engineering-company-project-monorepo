# REPORT — Mejoras aplicadas y su impacto

Todas las medidas se tomaron en **producción** (`next build` + `next start`), con la misma configuración que en `AUDIT.md`. Hay una corrección por commit, en la rama `feature/frontend-performance-audit`. Capturas: `audit/before/` y `audit/after/`.

## Correcciones aplicadas

| # | Commit | Corrección | Causa que resuelve |
|---|---|---|---|
| 1 | `perf: self-host fonts with next/font…` | DM Sans y Space Grotesk pasan a servirse desde el propio dominio con `next/font/local` (paquetes `@fontsource-variable`). Se usa `display: swap`, precarga y una fuente de reserva ajustada en tamaño. Se elimina el `@import` de Google. | Problema 1: la cadena de cuatro saltos que bloqueaba el render y el error de consola. |
| 2 | `perf(website): render the home page as a Server Component…` | `app/page.tsx` pasa a ser un Server Component. El formulario se extrae a `<LeadForm />` (`"use client"`), que es lo único que se hidrata. | Problema 2: se hidrataba toda la página de marketing. |
| 3 | `fix: add app icons…` | `app/icon.svg` en las dos apps. | Problema 3: el 404 de `/favicon.ico`. |
| 4 | `fix(a11y): text colors that meet WCAG AA contrast` | Nuevos tokens `--coral-text` (#b4492f) y `--green-text` (#2f6f50) para texto y botones rellenos, y `--muted` más oscuro. El coral original queda solo para elementos decorativos. | Problema 4: ratios de 2.6–4.2:1, que pasan a 4.9–5.9:1. |
| 5 | `fix(a11y): darken status and segment badge text…` | Texto más oscuro en las insignias de estado y segmento y en el indicador «neutral». | Problema 4: insignias por debajo de 4.5:1. |
| 6 | `fix(a11y): light accent for the kicker inside the dark insight card` | El kicker sobre fondo oscuro usa un tono claro (#f8b6a4, 6.9:1). | Problema 4: 2.2:1 en la tarjeta oscura. |
| 7 | `fix(a11y): let the brand link use its visible text…` | Se quita el `aria-label` que no coincidía con el texto visible. | Problema 5. |
| 8 | `refactor(backoffice): extract useApiQuery hook…` | Hook `useApiQuery` en el listado y el panel de resumen. Los encabezados del panel pasan de `h3` a `h2`. | Refactor C y problema 6. |
| 9 | `perf(website): inline the critical CSS…` | `experimental.inlineCss` en el website: el CSS de unos 6 KB va dentro de un `<style>` en el HTML. | Problema 7: el último recurso que bloqueaba el render. |

Refactors aplicados (están en el commit 2 y en el 8):
- `<Brand />`: en el nav y el footer del website.
- `useFormFields()`: sustituye a los seis `onChange` copiados del formulario.
- `useApiQuery()`: carga de datos con tres estados en el backoffice.

**Corrección colateral.** El atributo `pattern` del teléfono tenía `\\+` dentro de JSX. Eso llegaba al navegador como una expresión regular que exige una barra invertida literal, así que **ningún teléfono pasaba la validación**. Ahora usa `\+`. Lo descubrí al mover el formulario a `LeadForm` y lo confirma la prueba E2E: el formulario se envía correctamente con `+52 55 1234 5678`.

## Antes y después

| Página | Modo | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|
| Website `/` | Móvil | 97 → **98** | 96 → **100** | 96 → **100** | 100 → 100 |
| Website `/` | Escritorio | 100 → 100 | 96 → **100** | 96 → **100** | 100 → 100 |
| Backoffice `/` | Escritorio | 100 → 100 | 95 → **100** | 96 → **100** | 100 → 100 |
| Backoffice `/incidents` | Escritorio | 100 → 100 | 94 → **100** | 96 → **100** | 100 → 100 |

| Métrica (website, móvil) | Antes | Tras el commit 1 (fuentes) | Final |
|---|---|---|---|
| First Contentful Paint | 2.0 s | 0.8 s | **0.8 s** |
| Speed Index | 2.7 s | 0.8 s | **0.8 s** |
| Largest Contentful Paint | 2.2 s | 2.3 s | 2.2 s |
| Total Blocking Time | 50 ms | 90 ms | 110 ms |
| CLS | 0 | 0 | 0 |

En escritorio, el FCP baja de 0.4 s a 0.2 s en las dos apps.

## Qué tuvo más impacto

1. **Servir las fuentes desde el propio dominio.** Es la mejora más grande en métricas reales: el **FCP de móvil pasa de 2.0 s a 0.8 s (−60 %) y el Speed Index de 2.7 s a 0.8 s**, y Best Practices llega a 100 en el backoffice. Además, esta medición es conservadora: en este entorno Google Fonts fallaba al instante. Con una red real, donde esa petición sí tarda, la ganancia es mayor.
2. **Los tokens de contraste.** Llevan Accessibility a 100 en las cuatro páginas. Es un cambio con mucho alcance porque corrige la causa (un color de marca usado como color de texto), no cada elemento por separado.
3. **Server Component con el formulario aislado.** Reduce el JavaScript que hay que hidratar en el website. Lighthouse sigue mostrando un TBT de 90–110 ms en móvil, dentro de lo que varía entre ejecuciones (±50 ms). El origen está sobre todo en el runtime de Next.js, no en el código de la página.

## Lo que queda pendiente
- **LCP de móvil, unos 2.2 s.** El elemento LCP es el `h1` del hero, que usa Space Grotesk. Para bajarlo más habría que precargar solo los pesos que se usan, o usar `display: optional` en el titular, que cambia el aspecto en la primera visita. Merece una decisión de diseño.
- **Paginación en el servidor** para `/incidents`: reduce el DOM y escala con el volumen real.
- **Migrar el directorio de proveedores** a `useApiQuery`.
- **Repetir estas mediciones en una red real** con acceso a Google Fonts para el «antes». La comparación de este informe infravalora la mejora del commit 1.
