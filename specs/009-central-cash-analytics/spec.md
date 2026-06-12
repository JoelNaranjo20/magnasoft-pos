# Feature Specification: Analytics de Ventas por Categoría y Servicio en Caja Central

**Feature Branch**: `009-central-cash-analytics`

**Created**: 2026-06-10

**Status**: Draft

**Input**: "En caja central, agrega en resumen mensual total, la información de cuanto se vendió por servicio individualmente por categoría y ventas, y actualiza la caja central en el módulo web también igual a como está en el de escritorio."

## Clarifications

### Session 2026-06-10

- Q: ¿Dónde se ubica la sección de analytics de ventas por categoría/servicio? → A: Dentro del mismo acordeón del mes, como una nueva sección, pero al hacer clic en "Ver detalle completo" se abre un modal con toda la información de servicios ofrecidos durante el mes, incluyendo totales por categoría (ej. "Lavados: $X total") y desagregación por servicio individual (ej. "Lavado de moto: $Y", "Lavado de 25: $Z", "Lavado normal: $W").
- Q: ¿El hook useCentralCash se comparte entre desktop y web? → A: Sí, se mueve a `apps/shared/` como hook compartido vía `@shared/logic`. Desktop y web reutilizan la misma lógica de datos, balances, monthlySummary y backfill. La seguridad depende del correo y contraseña en ambos casos.

## User Scenarios & Testing

### User Story 1 — Desglose de ventas por categoría y servicio en resumen mensual (Priority: P1)

El dueño expande un mes en el tab "Total General" de Caja Central y ve, además de las entradas y gastos actuales, un desglose de cuánto se vendió por cada categoría de servicio (ej. "Lavado", "Pintura", "Mecánica") y dentro de cada categoría, por servicio individual (ej. "Lavado básico: $450,000", "Lavado premium: $320,000").

**Why this priority**: El dueño necesita saber qué servicios generan más dinero para tomar decisiones de negocio. Sin este desglose, Caja Central solo muestra totales agregados.

**Independent Test**: Expandir un mes en Total General, ver sección "Ventas por Categoría" con lista de categorías y montos, expandir una categoría para ver sus servicios individuales.

**Acceptance Scenarios**:

1. **Given** un mes con 8 sesiones cerradas y ventas en 5 categorías, **When** el admin expande el mes en Total General y hace clic en "Ver detalle completo", **Then** se abre un modal con cada categoría, su monto total, y la lista desagregada de todos sus servicios.
2. **Given** el modal de analytics abierto, **When** el admin revisa una categoría (ej. "Lavados"), **Then** ve el total de la categoría y cada servicio individual con cantidad y monto (ej. "Lavado de moto: 45 × $20,000 = $900,000").
3. **Given** un mes sin ventas en alguna categoría, **When** se ve el modal, **Then** esa categoría simplemente no aparece (no muestra $0).

---

### User Story 2 — Sincronización de Caja Central en módulo web (Priority: P1)

El portal web (`apps/web`) debe tener la misma vista de Caja Central que el escritorio: 3 tabs (Efectivo, Transferencia, Total General), resumen mensual, formulario de movimiento manual con selector de método de pago, y el mismo diseño responsive.

**Why this priority**: Actualmente el módulo web tiene una versión antigua o incompleta de Caja Central. El dueño debe poder consultar sus finanzas desde cualquier dispositivo.

**Independent Test**: Abrir el portal web, navegar a Caja Central, verificar que tiene los 3 tabs, resumen mensual, y formulario de movimiento idénticos al escritorio.

**Acceptance Scenarios**:

1. **Given** el admin abre Caja Central en el portal web, **When** navega entre tabs, **Then** ve Efectivo, Transferencia y Total General con los mismos datos que en escritorio.
2. **Given** el admin registra un movimiento manual en web, **When** selecciona método de pago, **Then** el selector tiene Efectivo y Transferencia como opciones.
3. **Given** el admin ve el Total General en web, **When** expande un mes, **Then** ve el desglose de ventas por categoría y servicio igual que en escritorio.

---

### Edge Cases

- ¿Qué pasa si un servicio fue eliminado después de tener ventas? Los datos históricos de `sale_items` siguen existiendo — se muestra el nombre que tenía al momento de la venta.
- ¿Qué pasa si hay productos (inventario) además de servicios? Se agrupan bajo su categoría también. Productos sin categoría van a "Sin categoría".
- ¿Qué pasa si el mes no tiene sesiones cerradas? No se muestra la sección de analytics — no hay datos que mostrar.
- ¿Qué pasa en web si el negocio no tiene el módulo `pos` activo? Caja Central siempre está disponible (es finanzas, no POS).

## Requirements

### Functional Requirements

- **FR-001**: El resumen mensual en Total General debe incluir una sección "📊 Ventas por Categoría" con un resumen compacto (top 5 categorías) y un botón "Ver detalle completo" que abre un modal con la información completa de todos los servicios ofrecidos durante el mes.
- **FR-002**: El modal de analytics muestra por cada categoría: nombre, ícono, monto total vendido, cantidad de ventas, porcentaje del total del mes, y la lista desagregada de servicios individuales (ej. "Lavado de moto: 45 ventas — $900,000", "Lavado de 25: 30 ventas — $750,000", "Lavado normal: 60 ventas — $600,000").
- **FR-003**: Cada servicio individual en el modal muestra: nombre, cantidad de veces vendido, monto total, y precio promedio.
- **FR-004**: Los datos de analytics se obtienen consultando `sales` + `sale_items` + `services` + `products` + `categories` filtrados por mes y `business_id`.
- **FR-005**: El módulo web (`apps/web`) debe tener un componente `CentralCashPage` con la misma estructura de 3 tabs, resumen mensual, formulario de movimiento y modal de analytics que el escritorio.
- **FR-006**: El hook `useCentralCash` se mueve a `apps/shared/` como hook compartido (`@shared/logic`) para que desktop y web reutilicen la misma lógica de balances, monthlySummary, backfill y analytics. Ambos usan la misma autenticación de Supabase.
- **FR-007**: El formulario de movimiento manual en web debe incluir selector de `payment_method` (efectivo/transferencia), igual que en escritorio.
- **FR-008**: La metadata de analytics (ventas por categoría/servicio) se calcula en frontend desde los datos ya disponibles en Supabase — no requiere nuevas columnas ni migraciones.

### Key Entities

- **sales**: Ventas completadas. Se filtran por `session.closed_at` dentro del mes.
- **sale_items**: Ítems individuales de cada venta. Vinculan a `services` o `products`.
- **services / products**: Catálogo. Tienen `category_id` y `name`.
- **categories**: Agrupación de servicios/productos. Tienen `name` e `icon`.

## Success Criteria

- **SC-001**: El dueño puede identificar en menos de 10 segundos cuál fue la categoría más rentable del mes.
- **SC-002**: El dueño puede ver el ranking de servicios más vendidos expandiendo una categoría.
- **SC-003**: El módulo web de Caja Central es funcionalmente idéntico al de escritorio (mismos tabs, mismos datos, mismo formulario).
- **SC-004**: Cero regresiones en el cierre de turno, conciliación, o cálculo de totales.

## Assumptions

- Los datos de analytics se calculan en frontend consultando las tablas existentes — no se requiere nueva migración.
- El módulo web ya tiene acceso a Supabase y a las mismas tablas que el escritorio.
- Las categorías y servicios ya existen en la base de datos con sus relaciones.
- El hook `useCentralCash` se mueve de `apps/desktop/src/hooks/` a `apps/shared/` como parte de `@shared/logic`. Ambos (desktop y web) comparten exactamente la misma lógica de datos, autenticación Supabase, y helpers.
- Si un servicio no tiene categoría asignada, se agrupa bajo "Sin categoría".
