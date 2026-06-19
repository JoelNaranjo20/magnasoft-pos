# Feature Specification: Módulo de Acreedores con Integración en Caja Central

**Feature Branch**: `015-acreedores-modulo`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Reemplazar el módulo de Préstamo por Acreedores. Deudas con proveedores integradas con Caja Central. Cartera de acreedores en tiempo real, similar a cómo se hace en Caja y Cartera."

## Clarifications

### Session 2026-06-19

- Q: ¿Qué datos debe tener un Acreedor? → A: Fecha de factura/adquisición, nombre del proveedor (texto libre), valor de la deuda, y opción de hacer abonos (pagos parciales).
- Q: ¿Cómo se integran los pagos a acreedores en Caja Central? → A: Pagos como egresos en `central_cash_movements`. Card de "Acreedores" en Caja Central con total pendiente + pagos del mes.
- Q: ¿Qué pasa con los préstamos a trabajadores existentes? → A: Reemplazo total. Se elimina WorkerLoans y solo queda Acreedores (proveedores).
- Q: ¿Los acreedores son una entidad separada? → A: No. Solo una tabla con nombre/concepto libre. Sin entidad separada, sin CRM.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar deuda con un acreedor (Priority: P1)

El dueño del negocio recibe una factura de un proveedor (ej. "Hidrolavadora", "Coéxito", "pago de agua"). Desde Finanzas > Acreedores, registra la deuda con: fecha de la factura, nombre del proveedor (texto libre), y el valor total de la deuda. La deuda queda registrada con saldo pendiente igual al valor total.

**Why this priority**: Es la base del módulo. Sin registrar deudas, no hay nada que gestionar ni mostrar.

**Independent Test**: Ir a Finanzas > Acreedores, crear una nueva deuda con fecha, nombre y valor. Verificar que aparece en la lista con saldo pendiente = valor total.

**Acceptance Scenarios**:

1. **Given** que el usuario está en la pestaña Acreedores, **When** registra una deuda con fecha 15/06/2026, nombre "Coéxito", valor $500,000, **Then** la deuda aparece en la lista con saldo pendiente $500,000 y estado "pendiente".
2. **Given** que hay deudas registradas, **When** el usuario ve la lista, **Then** cada deuda muestra: fecha de factura, nombre del acreedor, valor total, saldo pendiente, y estado.

---

### User Story 2 - Registrar abono a una deuda (Priority: P1)

El dueño hace un pago parcial a un acreedor. Desde la lista de deudas, selecciona una deuda y registra un abono por el monto pagado, eligiendo el método de pago (efectivo o transferencia). El saldo pendiente se reduce. El pago se registra como **egreso** en Caja Central.

**Why this priority**: Igual de crítico que registrar — sin abonos, el saldo nunca baja y el módulo no refleja la realidad financiera.

**Independent Test**: Seleccionar una deuda con saldo $500,000, registrar un abono de $200,000 en efectivo. Verificar que el saldo baja a $300,000 y que aparece un egreso en Caja Central.

**Acceptance Scenarios**:

1. **Given** una deuda de $500,000 con "Coéxito", **When** se registra un abono de $200,000 en efectivo, **Then** el saldo pendiente baja a $300,000, la deuda cambia a estado "parcial", y Caja Central registra un egreso de $200,000.
2. **Given** una deuda con saldo $100,000, **When** se registra un abono de $100,000, **Then** el saldo llega a $0 y la deuda cambia a estado "pagado".
3. **Given** una deuda pagada, **When** se intenta registrar otro abono, **Then** el sistema no lo permite (estado "pagado" bloquea nuevos abonos).

---

### User Story 3 - Card de Acreedores en Caja Central (Priority: P2)

En la Caja Central (tanto desktop como web), se muestra una nueva sección "🏗️ Acreedores" con dos indicadores cliqueables: **Deuda Total** (suma de todos los saldos pendientes con acreedores) y **Pagado del Mes** (total abonado a acreedores en el mes en curso). Al hacer clic en Deuda Total, se abre un modal con el listado de acreedores y sus saldos. Al hacer clic en Pagado del Mes, se abre un modal con los abonos realizados en el mes.

**Why this priority**: Visibilidad financiera. El dueño necesita ver de un vistazo cuánto debe a proveedores y cuánto ha pagado este mes, igual que ya ve la cartera de clientes.

**Independent Test**: Abrir Caja Central, verificar que la sección Acreedores muestra los totales correctos. Hacer clic en Deuda Total y ver el listado.

**Acceptance Scenarios**:

1. **Given** que hay 3 deudas con acreedores por $500K, $300K, $200K (saldo total $1M), **When** el usuario abre Caja Central, **Then** la card de Acreedores muestra "Deuda Total: $1,000,000".
2. **Given** que este mes se han abonado $150K a acreedores, **When** el usuario abre Caja Central, **Then** la card muestra "Pagado del Mes: $150,000".
3. **Given** que no hay deudas registradas, **When** el usuario abre Caja Central, **Then** la card muestra "$0" en ambos indicadores sin errores.

---

### User Story 4 - Reemplazo de Préstamo por Acreedores en navegación (Priority: P1)

En el desktop, la pestaña "Préstamos" en Finanzas se reemplaza completamente por "Acreedores". La nueva pestaña contiene: lista de deudas con acreedores, botón para nueva deuda, botón para registrar abono. Todo el código y funcionalidad de WorkerLoans se elimina.

**Why this priority**: Es el cambio estructural. Sin esto, la nueva funcionalidad no es accesible.

**Independent Test**: Ir a Finanzas, verificar que la tercera pestaña se llama "Acreedores" (no "Préstamos"), y que muestra la lista de deudas con acreedores.

**Acceptance Scenarios**:

1. **Given** que el usuario abre Finanzas, **When** mira las pestañas, **Then** ve: Nómina, Caja y Cartera, Acreedores, Caja Central (sin "Préstamos").
2. **Given** que el usuario selecciona "Acreedores", **When** la pestaña carga, **Then** muestra la interfaz de acreedores (lista de deudas, botón nueva deuda, botón abono). No muestra WorkerLoans.

---

### Edge Cases

- ¿Qué pasa si se registra un abono mayor al saldo pendiente? → El sistema rechaza el abono y muestra un mensaje de error.
- ¿Qué pasa si se intenta editar una deuda ya pagada? → Solo se permite editar el nombre y la fecha; el valor no se modifica.
- ¿Qué pasa si no hay acreedores registrados? → La lista muestra un estado vacío: "Sin deudas registradas".
- ¿Qué pasa con los datos existentes de worker_loans y worker_loan_payments? → Las tablas se conservan en la base de datos (no se borran), pero la UI ya no las muestra. Se pueden eliminar en una migración futura si se confirma que no se necesitan.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE reemplazar la pestaña "Préstamos" por "Acreedores" en la navegación de Finanzas del desktop.
- **FR-002**: El sistema DEBE permitir registrar una deuda con acreedor especificando: fecha de factura, nombre del acreedor (texto libre), y valor total de la deuda.
- **FR-003**: El sistema DEBE permitir registrar abonos parciales a una deuda, especificando monto y método de pago (efectivo o transferencia).
- **FR-004**: Cada abono a un acreedor DEBE registrarse como **egreso** en `central_cash_movements` con descripción que incluya el nombre del acreedor.
- **FR-005**: El sistema DEBE mostrar en una lista todas las deudas con acreedores con: fecha de factura, nombre, valor total, saldo pendiente, y estado (pendiente/parcial/pagado).
- **FR-006**: Caja Central DEBE incluir una sección "🏗️ Acreedores" con dos indicadores cliqueables: Deuda Total (suma de saldos pendientes) y Pagado del Mes (total abonado en el mes en curso).
- **FR-007**: Los indicadores de Acreedores en Caja Central DEBEN ser cliqueables y abrir modales con el detalle (listado de acreedores con saldo, o listado de abonos del mes).
- **FR-008**: El sistema DEBE eliminar el componente `WorkerLoans.tsx` y sus dependencias de la interfaz de Finanzas.
- **FR-009**: Las tablas `worker_loans` y `worker_loan_payments` DEBEN conservarse en la base de datos (no se eliminan), pero la UI ya no las referencia.
- **FR-010**: La sección de Acreedores en Caja Central DEBE estar disponible tanto en desktop como en web (misma funcionalidad en ambas plataformas).

### Key Entities

- **Deuda con Acreedor (`creditor_debts`)**: Fecha de factura, nombre del acreedor (texto libre), valor total de la deuda, saldo pendiente, estado (pending/partial/paid). Pertenece a un `business_id`.
- **Abono a Acreedor (`creditor_payments`)**: Monto abonado, método de pago (efectivo/transferencia), fecha. Vinculado a una deuda (`creditor_debt_id`) y a un `business_id`.
- **Indicador en Caja Central**: Deuda Total (suma de `remaining_amount` de todas las deudas pendientes/parciales) y Pagado del Mes (suma de abonos del mes en curso).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El usuario puede registrar una deuda con acreedor en menos de 30 segundos.
- **SC-002**: El saldo pendiente de cada deuda se actualiza instantáneamente tras registrar un abono.
- **SC-003**: Los indicadores de Acreedores en Caja Central muestran los totales correctos en tiempo real (coinciden con la suma real de deudas y abonos).
- **SC-004**: La sección de Acreedores en Caja Central tiene el mismo nivel de detalle y usabilidad que la sección de Cartera existente.
- **SC-005**: La migración de WorkerLoans a Acreedores no rompe ninguna funcionalidad existente de Finanzas (Nómina, Caja y Cartera, Caja Central).
- **SC-006**: Los datos existentes en worker_loans y worker_loan_payments se conservan íntegros (no se pierden).

## Assumptions

- Las tablas existentes `worker_loans` y `worker_loan_payments` se conservan en la base de datos sin modificar.
- La nueva tabla `creditor_debts` usará una estructura similar a `customer_debts` pero simplificada (sin `customer_id` FK, solo `creditor_name` TEXT).
- La tabla `creditor_payments` usará estructura similar a `debt_payments`.
- Los pagos a acreedores siempre generan egresos en `central_cash_movements` (dinero que sale del negocio).
- El módulo de Acreedores no requiere un nuevo módulo en `MODULE_REGISTRY` — se muestra siempre que Finanzas sea accesible (igual que Préstamos antes).
- Los abonos a acreedores se registran desde la UI de Acreedores, no desde el POS ni desde Caja Central.
- El diseño visual de la sección Acreedores en Caja Central seguirá el mismo patrón que la sección Cartera (cards cliqueables + modales).
- La web app (Next.js) solo necesita la sección de Acreedores en Caja Central; la gestión completa de acreedores (crear/editar/abonar) se hace desde el desktop.
