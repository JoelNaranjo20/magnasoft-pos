# Feature Specification: Dashboard Financiero de Caja Central

**Feature Branch**: `010-central-cash-dashboard`

**Created**: 2026-06-12

**Status**: Draft

**Input**: User description: "quiero cambiar la estructura de la caja central: dashboard 2 columnas con KPI de balance total, efectivo, transferencia, resumen operativo, cartera, acreedores y nómina"

## Clarifications

### Session 2026-06-12

- Q: ¿El nuevo dashboard REEMPLAZA completamente la interfaz actual, o la COMPLEMENTA? → A: Reemplazo completo. La vista actual (pestañas, acordeones, formulario siempre visible) desaparece. El historial mensual se accede desde un botón "Ver Historial" en Resumen Operativo. El formulario de ingreso/egreso se abre desde un botón "+ Nuevo Movimiento" en un modal. Sin botón de backfill.
- Q: ¿Qué compone "Total de Servicios"? → A: Ventas completadas en sesiones cerradas del mes, desde las tablas `sales` + `sale_items`. El valor principal es la suma de `unit_price × quantity` de todos los items vendidos. Al hacer clic, se despliega el desglose por servicio/producto (reutiliza `fetchCategorySales()`).
- Q: ¿Egresos y Liquidaciones? → A: Muestran el valor total en la card. Al hacer clic, abren un modal con el detalle de los movimientos que los componen. El botón "Ver Historial" en Resumen Operativo abre un modal con los acordeones mensuales completos (mismo diseño que existe hoy).
- Q: ¿Las métricas son del mes en curso o globales? → A: Mixto según contexto: Cartera Total (global, toda la deuda pendiente), Recuperación Efectivo/Transferencia (mes en curso), Total Servicios/Egresos/Liquidaciones (mes en curso), Nómina (mes en curso).
- Q: ¿Qué mostrar en "Acreedores"? → A: No se incluye la card de Acreedores ni préstamos a trabajadores en este dashboard. Se eliminan del layout.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vista General de Caja Central (Priority: P1)

El administrador o dueño del negocio abre Caja Central y ve de inmediato un dashboard financiero de 2 columnas con todos los indicadores clave: balance total disponible, desglose por método de pago (efectivo y transferencia), y un resumen operativo del mes actual con total de servicios, egresos y liquidaciones a trabajadores.

**Why this priority**: Es la vista principal de tesorería. Reemplaza la interfaz actual de 3 pestañas + formulario por un dashboard que muestra todos los KPIs financieros en una sola pantalla. Es el MVP completo — sin esto, no hay navegación financiera útil.

**Independent Test**: Abrir Caja Central desde el menú de finanzas. Verificar que en menos de 3 segundos se cargan los KPIs principales (balance total, efectivo, transferencia, total servicios, egresos) con datos correctos del mes en curso.

**Acceptance Scenarios**:

1. **Given** que el negocio tiene movimientos en Caja Central, **When** el usuario navega a la página de Caja Central, **Then** ve el balance total en formato grande, con tarjetas separadas de efectivo y transferencia en la columna izquierda.
2. **Given** que el mes actual tiene sesiones cerradas con ventas, **When** se carga el dashboard, **Then** el "Total de Servicios" en Resumen Operativo muestra la suma de `unit_price × quantity` de todos los items vendidos en esas sesiones.
3. **Given** que hay egresos registrados en el mes (comisiones, bases de día siguiente, gastos manuales), **When** se carga el dashboard, **Then** el campo "Egresos" muestra el total de salidas del mes.
4. **Given** que no hay movimientos en el mes actual, **When** se carga el dashboard, **Then** todos los KPIs muestran $0 sin errores.
5. **Given** que el usuario hace clic en "Total de Servicios", **When** se abre el modal de detalle, **Then** se muestra el desglose de servicios vendidos con cantidades y montos (reutilizando `fetchCategorySales`).
6. **Given** que el usuario hace clic en "Egresos" o "Liquidaciones", **When** se abre el modal, **Then** se muestran los movimientos individuales que componen el total.

---

### User Story 2 - Resumen de Cartera y Recuperación (Priority: P2)

El administrador ve en la misma pantalla el estado actual de la cartera (deuda total pendiente de clientes, global) y cuánto se ha recuperado en el mes, desglosado por método de pago (efectivo vs transferencia). Esto le permite evaluar la salud de cobranza sin navegar a otra sección.

**Why this priority**: Es información complementaria crítica para el negocio. La cartera representa dinero por cobrar que impacta directamente la liquidez visible en Caja Central.

**Independent Test**: Con al menos una deuda registrada en cartera, verificar que "Cartera Total" muestra el saldo pendiente global y que "Recuperación Efectivo" y "Recuperación Transferencia" reflejan los abonos del mes en curso.

**Acceptance Scenarios**:

1. **Given** que existen deudas activas en cartera, **When** el dashboard carga, **Then** "Cartera Total" muestra la suma de todas las deudas pendientes (global, no filtrado por mes).
2. **Given** que se registraron abonos en el mes, **When** se carga el dashboard, **Then** "Recuperación Efectivo" y "Recuperación Transferencia" muestran los totales correctos por método de pago del mes en curso.
3. **Given** que no hay deudas registradas, **When** se carga el dashboard, **Then** todos los campos de cartera muestran $0.

---

### User Story 3 - Nómina Mensual (Priority: P3)

El administrador ve en tiempo real el total de nómina mensual (salarios y pagos fijos de trabajadores activos). Esto completa el panorama financiero con los compromisos de pago del mes.

**Why this priority**: Información valiosa pero secundaria respecto al balance de caja y la cartera.

**Independent Test**: Con trabajadores activos con salario configurado, verificar que "Total Nómina" muestra la suma correcta de salarios mensuales.

**Acceptance Scenarios**:

1. **Given** que hay trabajadores activos con salario configurado, **When** se carga el dashboard, **Then** "Total Nómina" muestra la suma de salarios mensuales de trabajadores activos.
2. **Given** que no hay trabajadores con salario, **When** se carga el dashboard, **Then** "Total Nómina" muestra $0.

---

### Edge Cases

- ¿Qué sucede si el negocio no tiene el módulo de cartera activo? → La card de Cartera no se muestra (respeta feature flags del módulo `customers`).
- ¿Qué sucede si el negocio no tiene el módulo de comisiones activo? → "Liquidaciones" se oculta de la card de Resumen Operativo (respeta `module_commissions`).
- ¿Qué sucede si el negocio no tiene el módulo de nómina activo? → La card de Nómina se oculta (respeta `module_payroll`).
- ¿Qué sucede si no hay sesiones cerradas en el mes? → "Total de Servicios" muestra $0.
- ¿Qué sucede si el negocio cambia de `business_id` durante la sesión? → El dashboard se refresca automáticamente con los datos del nuevo negocio (mismo mecanismo que el hook actual).
- ¿Qué sucede al hacer clic en una card de KPI? → Abre un modal con el desglose detallado (servicios, egresos, liquidaciones según corresponda).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El dashboard DEBE mostrar un layout de 2 columnas en escritorio que colapse a 1 columna en dispositivos móviles.
- **FR-002**: La columna izquierda DEBE contener: Balance Total (KPI grande), Efectivo (KPI pequeño), Transferencia (KPI pequeño), y un botón "+ Nuevo Movimiento" que abre un modal con el formulario de registro manual (tipo, monto, método de pago, descripción).
- **FR-003**: La columna derecha DEBE contener: Card de Resumen Operativo (Total de Servicios, Egresos, Liquidaciones + botón "Ver Historial"), Card de Cartera (Cartera Total, Recuperación Efectivo, Recuperación Transferencia), Card de Total Nómina. No se incluyen Acreedores ni Préstamos a Trabajadores.
- **FR-004**: "Total de Servicios" DEBE calcularse desde las tablas `sales` + `sale_items`, filtrando solo ventas (`status = 'completed'`) cuyas sesiones de caja estén cerradas (`cash_sessions.status = 'closed'`) en el mes en curso. El valor es la suma de `unit_price × quantity` de todos los items.
- **FR-005**: "Egresos" DEBE calcularse como la suma de todos los gastos del mes en curso (comisiones, bases de día siguiente, gastos manuales, salarios) desde `central_cash_movements`.
- **FR-006**: "Liquidaciones" DEBE calcularse como la suma de comisiones pagadas a trabajadores (`worker_commissions` con `status = 'paid'`) en el mes en curso.
- **FR-007**: "Cartera Total" DEBE consultar el saldo total pendiente de todas las deudas activas de clientes (global, sin filtrar por mes).
- **FR-008**: "Recuperación Efectivo" y "Recuperación Transferencia" DEBEN consultar los abonos del mes en curso desde `debt_payments`, agrupados por método de pago.
- **FR-009**: "Total Nómina" DEBE consultar la suma de salarios mensuales configurados (`workers.salary`) para trabajadores activos (`workers.status = 'active'`).
- **FR-010**: El dashboard DEBE respetar el sistema de módulos: si `module_customers` está inactivo, la Card de Cartera se oculta. Si `module_commissions` está inactivo, "Liquidaciones" se oculta. Si `module_payroll` está inactivo, la Card de Nómina se oculta.
- **FR-011**: Los datos DEBEN refrescarse automáticamente al cambiar de negocio (mismo mecanismo que el hook `useCentralCash` actual).
- **FR-012**: El dashboard DEBE funcionar idénticamente en desktop (Electron) y web (Next.js), compartiendo el mismo hook desde `@shared/hooks/`.
- **FR-013**: Al hacer clic en "Total de Servicios", DEBE abrirse un modal con el desglose de servicios vendidos (cantidad × precio promedio = total por servicio, agrupados por categoría). Reutiliza `fetchCategorySales()` del hook compartido.
- **FR-014**: Al hacer clic en "Egresos" o "Liquidaciones", DEBE abrirse un modal con el detalle de los movimientos individuales que componen el total.
- **FR-015**: El botón "Ver Historial" en la card de Resumen Operativo DEBE abrir un modal con los acordeones mensuales completos (Entradas/Gastos/Neto por mes, mismo diseño que existe hoy, con analytics por categoría).

### Key Entities

- **CentralCashMovement**: Movimiento financiero en Caja Central. Atributos: tipo (ingreso/egreso), monto, método de pago, sesión asociada, metadata. Ya existe en la DB.
- **CustomerDebt**: Deuda de cliente en cartera. Atributos: saldo pendiente, método de pago de abonos, cliente asociado, negocio. Ya existe en `customer_debts`.
- **DebtPayment**: Abono a deuda de cartera. Atributos: monto, método de pago, sesión de caja, fecha. Ya existe en `debt_payments`.
- **WorkerCommission**: Comisión de trabajador. Atributos: monto, estado (pagada/pendiente), sesión, trabajador. Ya existe en `worker_commissions`.
- **Worker**: Trabajador del negocio. Atributos: salario, estado (activo/inactivo). Ya existe en `workers`.
- **Sale + SaleItem**: Ventas completadas y sus items. Ya existen en `sales` + `sale_items`. Se usan para calcular Total de Servicios sumando `unit_price × quantity` de sesiones cerradas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El dashboard carga todos sus KPIs en menos de 3 segundos en condiciones normales de red.
- **SC-002**: El administrador puede ver en una sola pantalla (sin scroll en escritorio 1920×1080) todos los KPIs: balance total, efectivo, transferencia, total servicios, egresos, liquidaciones, cartera total, recuperación efectivo, recuperación transferencia, nómina.
- **SC-003**: Los valores mostrados en cada KPI coinciden exactamente con los reportes detallados al abrir el modal de cada uno (consistencia de datos).
- **SC-004**: El layout es funcionalmente idéntico entre desktop (Electron) y web (Next.js) — mismas cards, mismos datos, mismos estados de carga.
- **SC-005**: El cambio de un negocio a otro refresca todos los KPIs sin requerir recarga manual de la página.
- **SC-006**: Al hacer clic en cualquier KPI cliqueable (Total Servicios, Egresos, Liquidaciones), el modal de detalle abre en menos de 1 segundo con los datos correctos.

## Assumptions

- El dashboard **reemplaza completamente** la vista actual de Caja Central. Las pestañas Efectivo/Transferencia/Total General desaparecen. El historial mensual, analytics y formulario se acceden desde modales.
- No se incluye botón de backfill en el dashboard.
- "Total de Servicios" se calcula desde `sales` + `sale_items` para sesiones cerradas del mes en curso, no desde `central_cash_movements`.
- "Liquidaciones" y "Comisiones Pagadas" son el mismo concepto — comisiones a trabajadores marcadas como `status = 'paid'` en el mes. El nombre que se muestra en la UI depende del tipo de industria.
- "Cartera Total" es global (toda la deuda pendiente, sin filtrar por fecha). "Recuperación Efectivo/Transferencia" es solo del mes en curso.
- "Total Nómina" usa el campo `salary` de la tabla `workers` para trabajadores activos. No incluye comisiones.
- Los datos de analytics por categoría/servicio se acceden desde el KPI "Total de Servicios" (clic → modal) o desde el modal de historial al expandir un mes.
- Las cards se ocultan según los módulos activos del negocio: Cartera (`module_customers`), Liquidaciones (`module_commissions`), Nómina (`module_payroll`).
- No se incluye card de Acreedores ni de Préstamos a Trabajadores en este dashboard.
