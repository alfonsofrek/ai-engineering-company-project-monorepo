# CONTEXT - TrackFlow

## 1) Empresa

**Nombre:** TrackFlow  
**Sector:** Logistica de ultima milla y operaciones de almacen  
**Cobertura actual:** Mexico y Espana  
**Tipo de clientes:** e-commerce, retail, distribuidores y empresas con alto volumen de envios

TrackFlow ofrece servicios de recogida, clasificacion, almacenamiento temporal y entrega de paquetes. La empresa combina operaciones fisicas (hubs y almacenes) con optimizacion digital de rutas y trazabilidad.

## 2) Objetivo de negocio

Digitalizar el alta de clientes/partners y mejorar la eficiencia operativa en procesos de ultima milla.

Objetivos prioritarios:
- Reducir tiempos de onboarding comercial.
- Mejorar precision en datos de registro de clientes.
- Priorizar cuentas con mayor potencial de volumen mensual.
- Estandarizar informacion para proyectos de automatizacion, analitica y agentes.

## 3) Unidades operativas

- **Last-mile delivery:** asignacion de rutas, entregas y devoluciones.
- **Warehouse operations:** recepcion, clasificacion, consolidacion y despacho.
- **Customer onboarding:** captura y validacion de datos de nuevas cuentas.

## 4) Datos canonicos para onboarding

Todo flujo de registro debe usar estos campos y nombres de clave:

1. `fullName` - Nombre completo del contacto principal.
2. `companyName` - Nombre legal/comercial de la empresa.
3. `email` - Correo corporativo de contacto.
4. `country` - Pais de operacion principal (`Mexico` o `Espana`).
5. `phone` - Telefono del contacto en formato internacional.
6. `monthlyVolume` - Volumen de envios mensuales estimado (entero positivo).

## 5) Reglas de validacion funcional

Estas reglas son obligatorias para formularios y APIs que capturen altas:

- Todos los campos del onboarding son obligatorios.
- `fullName` debe tener al menos 3 caracteres.
- `email` debe cumplir formato valido de correo.
- `country` solo admite `Mexico` o `Espana`.
- `phone` debe ser valido para prefijos `+52` (Mexico) o `+34` (Espana).
- `monthlyVolume` debe ser un entero mayor que 0.

## 6) Segmentacion inicial de cuentas

Para priorizacion comercial inicial:

- **Small:** 1 a 499 envios/mes.
- **Mid-market:** 500 a 4,999 envios/mes.
- **Enterprise:** 5,000+ envios/mes.

## 7) KPI sugeridos para hitos tecnicos

- **Onboarding conversion rate:** solicitudes validas / solicitudes totales.
- **Lead validation error rate:** formularios con error / formularios enviados.
- **Average onboarding time:** tiempo promedio desde registro hasta activacion.
- **Monthly volume forecast:** suma estimada de `monthlyVolume` por pais.

## 8) Tono y lineamientos de comunicacion

- Voz profesional, directa y orientada a operaciones.
- Enfatizar eficiencia, trazabilidad y confiabilidad.
- Evitar claims no verificables.
- Mantener consistencia entre interfaces, validaciones y documentacion.

## 9) Restricciones

- No incluir datos personales sensibles adicionales a los campos definidos.
- No aceptar paises fuera del alcance actual (Mexico y Espana) sin cambio de contexto.
- Cualquier nuevo campo de onboarding debe agregarse primero a este contexto y luego a UI/servicios.

## 10) Uso de este contexto

Este archivo es la fuente de verdad para:

- Interfaces web y formularios.
- Validaciones de frontend/backend.
- Definicion de datasets iniciales.
- Prompts y comportamientos de agentes.
- Automatizaciones y workflows.
