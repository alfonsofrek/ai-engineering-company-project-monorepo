# Propuesta de arquitectura backend para TrackFlow

## 1. Resumen ejecutivo

TrackFlow necesita un backend que soporte tres tipos de actividad muy diferentes pero relacionadas entre sí: captación y validación de clientes, planificación operativa de rutas y coordinación de actividades en almacén. Por tanto, la mejor opción no es un backend “todo en uno” sin estructura, ni una arquitectura demasiado fragmentada para una primera fase. La propuesta más sólida es una arquitectura en capas con módulos por dominio, implementada sobre FastAPI.

Este enfoque encaja con el negocio porque:

- La lógica de onboarding es un proceso de negocio con validaciones críticas y segmentación comercial.
- Las operaciones de última milla y almacén requieren dominios distintos con distintos actores y reglas.
- El frontend ya está separado en aplicaciones Next.js (`website` y `backoffice`), así que el backend debe actuar como un servicio compartido con contratos claros.
- La empresa necesita crecer sin reescribir el sistema desde cero, pero aún no requiere una separación extrema de microservicios.

La idea es mantener un backend principal con una estructura modular y un conjunto de routers por dominio, dejando la frontera clara entre validación, negocio, persistencia y API.

---

## 2. Patrón arquitectónico propuesto

### 2.1. Arquitectura en capas con enfoque por dominio

Proponemos una arquitectura en capas, pero organizada por dominios funcionales y no por un único archivo de rutas o de servicios:

1. Capa de API / presentación
   - Routers y endpoints REST con FastAPI.
   - Validación de entrada y serialización con Pydantic.
   - Control de excepciones y respuesta uniforme.

2. Capa de aplicación / servicios
   - Lógica de negocio del dominio.
   - Validaciones transversales y coordinación entre entidades.
   - Reglas específicas de onboarding, segmentación y flujo operativo.

3. Capa de dominio
   - Entidades, modelos y reglas del negocio.
   - Lógica propia de clientes, rutas, almacén y operaciones.
   - Reglas de negocio basadas en la realidad del negocio: país permitido, volumen mínimo, clasificación por segmento.

4. Capa de infraestructura / persistencia
   - Acceso a base de datos, repositorios, integraciones externas.
   - Mapeo de datos y adaptadores para sistemas de logística, clientes y analítica.

### 2.2. ¿Por qué este patrón y no otro?

#### a) Encaja con la realidad de TrackFlow

TrackFlow no es una aplicación de blog ni una simple gestión administrativa. Tiene varios flujos críticos:

- alta de clientes y partners,
- validación de datos operativos,
- clasificación de cuentas por volumen,
- trazabilidad de entregas y almacén,
- posible automatización en analítica y agentes de IA.

Eso exige un backend con dominio claro y reglas de negocio visibles. Una arquitectura en capas permite separar responsabilidades sin crear complejidad innecesaria.

#### b) Es más segura para un equipo que empieza

Un backend con rutas y lógica mezcladas acaba generando acoplamiento. En una primera fase, el equipo necesita:

- que cada end-to-end sea comprensible,
- que el flujo de onboarding tenga validaciones consistentes,
- que los endpoints se agrupen por tipo de recurso,
- que se puedan probar con menos riesgo.

La separación por capas reduce el riesgo de errores de negocio y facilita el onboarding de nuevos miembros del equipo.

#### c) Evita la sobreingeniería de microservicios

Para este caso, no recomiendo salir de la idea de un backend monolítico modular en una primera etapa. Los microservicios no son necesarios si todavía no hay un volumen operativo que justifique separación por infraestructura o despliegue. Un monolito modular es más rápido de construir, más fácil de mantener y más adecuado para la fase inicial del negocio.

---

## 3. Estructura propuesta del proyecto backend

La estructura que recomiendo para FastAPI sigue las convenciones habituales del ecosistema, pero adaptadas al dominio del negocio. Una base razonable sería:

```text
services/
  api/
    app/
      main.py
      core/
        __init__.py
        config.py
        security.py
      api/
        __init__.py
        deps.py
        v1/
          __init__.py
          routers/
            onboarding.py
            customers.py
            routes.py
            warehouse.py
            health.py
      domain/
        onboarding/
          __init__.py
          schemas.py
          service.py
          repository.py
        customers/
          __init__.py
          schemas.py
          service.py
          repository.py
        routes/
          __init__.py
          schemas.py
          service.py
          repository.py
        warehouse/
          __init__.py
          schemas.py
          service.py
          repository.py
      db/
        base.py
        session.py
      models/
        customer.py
        onboarding_request.py
        route.py
        warehouse_task.py
      schemas/
        common.py
        onboarding.py
        customer.py
        route.py
      services/
        email_service.py
        validation_service.py
        analytics_service.py
      tests/
        test_onboarding.py
        test_routes.py
        test_warehouse.py
```

### 3.1. Criterio de separación

La estructura se organiza por dominio y responsabilidad, no por tipo de archivo aislado. Es decir:

- `onboarding/`: todo lo relacionado con captación y validación de nuevas cuentas.
- `customers/`: clientes activos, información institucional y estado de relación.
- `routes/`: gestión de entregas y rutas de última milla.
- `warehouse/`: recepción, clasificación, inventario y despacho.

La clave es que cada módulo tenga:

- schemas para validación de entrada/salida,
- service para reglas de negocio,
- repository para persistencia,
- router para endpoints.

Esto facilita que el equipo conozca dónde debe ir cada cambio.

---

## 4. Organización de endpoints y routers en FastAPI

### 4.1. Convenciones habituales de FastAPI que influyen en la propuesta

La estructura estándar de FastAPI suele dividirse en:

- `app/main.py` como punto de entrada,
- `routers/` para agrupar endpoints por funcionalidad,
- `schemas/` para validación de request/response,
- `models/` para entidades persistentes,
- `services/` para lógica de negocio,
- `core/config.py` para entorno y configuración,
- `db/` para conexión y sesión.

Esa convención importa porque reduce la ambigüedad del proyecto. La aplicación no debe tener todos los endpoints en un único archivo ni mezclar validación con persistencia. Es una práctica normal y esperable, y además hace que la base sea más fácil de escalar.

### 4.2. Propuesta de rutas por dominio

Se recomienda usar versionado para evitar cambios incompatibles en el futuro:

- `/api/v1/health` — verificación de disponibilidad del backend.
- `/api/v1/onboarding/requests` — registro de nuevas solicitudes.
- `/api/v1/onboarding/requests/{id}` — detalle, validación y actualización de estado.
- `/api/v1/onboarding/segments` — resultados de clasificación de cuentas por volumen.
- `/api/v1/customers` — listado y detalle de clientes activos.
- `/api/v1/customers/{id}/status` — seguimiento de estado comercial o operativo.
- `/api/v1/routes` — gestión de rutas y entregas.
- `/api/v1/routes/{id}/assignments` — asignaciones de paquetes o entregas.
- `/api/v1/warehouse/receipts` — recepción de paquetes.
- `/api/v1/warehouse/dispatch` — seguimiento de despacho.
- `/api/v1/warehouse/tasks/{id}` — detalle de tareas operativas.

### 4.3. Criterio para agrupar endpoints

Agruparé por dominio funcional y no solo por entidad técnica. Algunos ejemplos:

- `onboarding` agrupa lo relacionado con alta y validación de nuevas cuentas.
- `routes` centra la lógica de entregas, planificaciones y devoluciones.
- `warehouse` reúne el flujo físico de entrada, clasificación y salida.
- `customers` gestiona el estado del cliente ya activado.

Esto permite que el equipo entienda qué es cada flujo y evita que una línea de negocio termine dispersa por toda la API.

---

## 5. Consideraciones del negocio para los datos y reglas

TrackFlow ya ha definido un conjunto de campos canonicos para onboarding. Eso debe convertirse en reglas de validación compartidas entre frontend y backend:

- `fullName`
- `companyName`
- `email`
- `country`
- `phone`
- `monthlyVolume`

Las mismas reglas debieran estar centralizadas en el backend y replicadas en validaciones de interfaz, para evitar inconsistencias. Por ejemplo:

- `country` solo podrá ser `Mexico` o `Espana`.
- `phone` deberá respetar prefijos internacionales según país.
- `monthlyVolume` debe ser entero positivo.
- Los segmentos iniciales: `Small`, `Mid-market` y `Enterprise` según el volumen mensual.

La base del backend debe ser la fuente de verdad del negocio; la UI debe consumir la API con esos acuerdos definidos y no crear nuevas reglas ocultas.

---

## 6. Separación entre frontend y backend

El proyecto ya está organizado con interfaces independientes dentro de `uis/`: `website` y `backoffice`. El backend futuro debe vivir bajo `services/` y tratar a estas aplicaciones como clientes de la API.

### 6.1. Comunicación por API

La relación debe ser estándar:

- Frontend hace requests HTTP al backend.
- Backend expone una API REST con contratos definidos por schemas.
- Las interfaces no deben compartir lógica de negocio ni base de datos.

Esto aporta dos ventajas clave:

- el `website` y el `backoffice` pueden evolucionar por separado,
- el backend puede reutilizar la misma lógica para varias interfaces y agentes IA.

### 6.2. Variables de entorno

El backend debe usar variables de entorno para:

- cadena de conexión a base de datos,
- secretos JWT o autenticación,
- URLs de servicios externos,
- configuración de CORS y entornos (dev, staging, prod).

No es recomendable hardcodear valores ni depender de URLs fijas del navegador. La convención recomendada es mantener archivos `.env` locales y variables inyectadas en entorno real.

### 6.3. CORS

Como frontend y backend son sistemas separados, el servidor debe configurar CORS explícitamente. Esto implica:

- permitir solo orígenes autorizados (`website`, `backoffice`, entornos reales),
- no abrir el backend a cualquier origen,
- distinguir claramente entorno local y producción.

Un CORS demasiado abierto puede dar lugar a vulnerabilidades y problemas de seguridad.

---

## 7. Decisiones técnicas iniciales recomendadas

1. FastAPI como base del backend
   - Excelente para APIs REST con validación clara y documentación automática.
   - Encaja con una aplicación que necesita crecer sin carga operativa excesiva.

2. Pydantic para validación centralizada
   - Las reglas de los formularios de onboarding se materializan en schemas reutilizables.
   - Reduce duplicación y errores entre UI y backend.

3. Base de datos relacional en etapa inicial
   - Una base de datos SQL es suficiente para un sistema con clientes, rutas y tareas operativas.
   - Permite trazabilidad, auditoría y analítica más fácilmente que un enfoque completamente documentado.

4. Repositorios por dominio
   - Cada entidad y dominio tiene su acceso a datos encapsulado.
   - Evita que la API acceda directamente a todas las tablas desde un único lugar.

5. Documentación y contratos claros
   - Las rutas, request y response deben estar documentados para que frontend y backend hablen el mismo idioma.

---

## 8. Riesgos y puntos de atención

### Riesgo 1: acoplamiento por falta de separación de módulos

Si el equipo mete toda la lógica en el router o en un archivo enorme, el backend crecerá difícil de mantener. Eso se traducirá en:

- validaciones duplicadas,
- endpoints inconsistentes,
- cambios difíciles de testear,
- más riesgo de errores en alta de clientes.

### Riesgo 2: mezcla de responsabilidades entre frontend y backend

Si la UI sigue validando negocio y el backend hace lo mismo de forma distinta, aparecerán problemas entre lo que acepta el formulario y lo que acepta la API. Esto da lugar a inconsistencias reales en datos, errores de flujo y frustración operativa.

### Riesgo 3: CORS y variables de entorno sin control

Si se permite cualquier origen y se exponen secretos en código o archivos compartidos, el sistema queda vulnerable a accesos indebidos y fallos en despliegue.

### Riesgo 4: crecimiento sin versionado de API

Si la API cambia sin estrategia de versionado, el frontend y backoffice pueden romperse simultáneamente. La versión de la API es una forma de estabilizar contratos mientras el negocio evoluciona.

---

## 9. Conclusión

La arquitectura recomendada para TrackFlow es un backend FastAPI monolítico modular, con separación por capas y dominio funcional. Es la mejor opción para la etapa actual porque combina claridad, escalabilidad controlada y baja complejidad operativa.

La clave del diseño no es elegir la tecnología más avanzada, sino construir un sistema que refleje la realidad del negocio:

- validación y segmentación de onboarding,
- operaciones de ruta y almacén,
- separación clara entre frontend y backend,
- APIs bien definidas y con versionado.

Si el equipo sigue esta estructura desde el inicio, tendrá una base sólida para añadir más flujos, automatizaciones y analítica sin reescribir el sistema en cada hito.
