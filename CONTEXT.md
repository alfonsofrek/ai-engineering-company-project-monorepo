# CONTEXT — TrackFlow

Resumen operativo de la empresa asignada. Se basa en los briefings oficiales de [`docs/briefings/`](docs/briefings/), indexados en [`company-BRIEFING.md`](company-BRIEFING.md). Si este archivo y un briefing no coinciden, manda el briefing.

## 1) Empresa

**Nombre:** TrackFlow
**Sector:** última milla y gestión de almacenes (3PL) para marcas de e-commerce
**Fundada:** 2009, en Los Ángeles (Estados Unidos)
**Mercados:** Estados Unidos y España
**Almacenes:** Los Ángeles (`LA`) y Zaragoza (`ZGZ`)
**Tamaño:** unos 130 empleados y unos 9 M€ de facturación anual

TrackFlow almacena el inventario de sus marcas cliente, prepara y empaqueta los pedidos, los envía a través de 8 transportistas y gestiona las devoluciones. Para la marca, toda la logística, desde el pedido hasta la entrega o la devolución, la resuelve TrackFlow.

## 2) Organización

| Área | Responsable | Base |
| --- | --- | --- |
| Dirección ejecutiva | Thomas Harry (CEO) | Los Ángeles |
| Tecnología (TrackFlow Tech) | Andrés Kim (CTO) | Zaragoza |
| Operaciones de almacén | Ana Whitfield | LA y Zaragoza |
| Última milla y transportistas | Carlos Vega | ambos países |
| Logística inversa (devoluciones) | Sofía Ramos | — |
| Experiencia del cliente | Valentina Cruz | LA y Zaragoza |
| Comercial y relación con clientes | Miguel Torres | — |
| Personas | Rafael Sanz | Zaragoza |

**TrackFlow Tech** es la unidad interna que construye los sistemas, integraciones y automatizaciones. Nosotros formamos parte de ella.

## 3) Transportistas

8 en total: UPS, FedEx y DHL en Estados Unidos; MRW, SEUR y DHL en España, más dos transportistas locales. Detalle en [`trackflow-carrier-coverage.es.md`](docs/briefings/00-general-policies/trackflow-carrier-coverage.es.md).

## 4) Problemas de negocio que guían los proyectos

- Los dos almacenes usan sistemas distintos y no comparten una visión del inventario. Necesitan stock en tiempo real por SKU y almacén.
- La asignación de transportista es manual y no hay datos históricos de su rendimiento.
- Entre el 18 % y el 25 % del volumen son devoluciones, y todas se revisan a mano.
- No hay sistema de tickets ni base de conocimiento para atención al cliente.
- No hay telemetría centralizada: los fallos se detectan por WhatsApp.
- El informe semanal del CEO se monta a mano y llega con 1–2 días de retraso.

## 5) Valores canónicos compartidos

Estos valores se usan igual en todo el monorepo. Cada proyecto los toma de su briefing:

- **Países:** Estados Unidos y España. No se aceptan otros mercados sin un briefing que lo diga.
- **Almacenes:** `LA` (Los Ángeles) y `ZGZ` (Zaragoza) en el inventario (Milestone 5); `los_angeles` / `zaragoza` en las propiedades de telemetría.
- **Monedas:** USD (Estados Unidos) y EUR (España). En el directorio de proveedores, `country` es `USA` o `Spain`, con su moneda obligatoria.
- **Formulario de alta de marcas (Milestone 1):** 12 campos definidos en [`01-web-fundamentals.es.md`](docs/briefings/01-web-fundamentals.es.md).
- **Incidencias:** 9 categorías, 5 sedes y su ciclo de vida, en [`centralized-incident-manager.es.md`](docs/briefings/centralized-incident-manager.es.md).
- **Eventos de telemetría obligatorios y KPIs del pipeline:** en [`06-telemetry.es.md`](docs/briefings/06-telemetry.es.md) y [`06-data-pipelines.es.md`](docs/briefings/06-data-pipelines.es.md).

## 6) Tono

- Voz profesional, directa y orientada a operaciones.
- Énfasis en trazabilidad, fiabilidad y visibilidad entre los dos países.
- Nada de claims no verificables.

## 7) Restricciones

- No incluir datos personales del consumidor final (destinatario del paquete) en telemetría ni en informes de inventario.
- Un valor cerrado nuevo (país, almacén, categoría, sede, evento) solo entra si lo pide un briefing oficial.
- Antes de cambiar un flujo, leer el briefing de su proyecto en `docs/briefings/`.
