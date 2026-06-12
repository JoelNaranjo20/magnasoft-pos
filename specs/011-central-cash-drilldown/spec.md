# Feature Specification: Modales Drill-Down de Caja Central

**Feature Branch**: `011-central-cash-drilldown`

**Created**: 2026-06-12 | **Status**: Clarified

**Input**: "Al dar clic en Efectivo/Transferencia, desplegar modal con detalle de movimientos. En Egresos ver servicios por cantidad. En Liquidaciones ver detalle. En Nómina ver desglose semanal + liquidaciones diarias. En Cartera ver detalle de cada abono y deuda. Todo en web también."

## Clarifications

### Session 2026-06-12

- Q: ¿El modal de Efectivo/Transferencia muestra mes en curso o balance global? → A: Mes en curso desde `central_cash_movements` filtrado por `payment_method` + mes. El neto del modal = KPI del dashboard.
- Q: ¿De dónde salen los datos de Nómina? → A: Panorama completo de pagos a trabajadores: (a) Nómina Semanal con trabajadores de salario fijo (`workers.salary` activos), desglosada por semana y por trabajador; (b) Liquidaciones Diarias con comisiones pagadas a trabajadores que NO tienen salario fijo, desglosadas por trabajador. El total del modal = nómina semanal + liquidaciones diarias. Es la vista completa de "cuánto me cuesta el personal este mes".

## User Scenarios & Testing

### US1 — Drill-Down Efectivo y Transferencia (P1)

Clic en "Efectivo Disponible" o "Transferencia Disponible" → modal con desglose de todos los movimientos del **mes en curso** de ese método de pago, filtrados desde `central_cash_movements`: ingresos (cierres, abonos, préstamos, otros), egresos (gastos, base próximo día), y el neto coincide con el KPI del dashboard.

### US2 — Detalle de Egresos, Liquidaciones y Nómina (P1)

- **Egresos**: clic → lista individual de cada egreso con descripción, fecha, monto.
- **Liquidaciones**: clic → lista de comisiones pagadas con trabajador, monto, fecha de pago.
- **Total Nómina**: clic → modal con panorama completo de pagos a trabajadores:
  - **Nómina Semanal**: trabajadores con salario fijo (`workers.salary > 0`, `status = 'active'`). Total mensual + desglose por semanas del mes (4-5) + lista de trabajadores con su salario.
  - **Liquidaciones Diarias**: comisiones pagadas en el mes (`worker_commissions.status = 'paid'`) a trabajadores que **no** tienen salario fijo (se les paga por día/servicio). Desglosado por trabajador con monto total y cantidad de comisiones.
  - **Total general** = nómina semanal + liquidaciones diarias, visible en el header del modal.

### US3 — Drill-Down Cartera (P2)

Clic en "Cartera Total" → lista de clientes con deuda pendiente, ordenados mayor a menor.
Clic en "Recuperación Efectivo" → lista de abonos en efectivo del mes (cliente, monto, fecha).
Clic en "Recuperación Transferencia" → lista de abonos por transferencia del mes (cliente, monto, fecha).

### Edge Cases

- ¿Trabajador con salario fijo Y comisiones? → Aparece en ambas secciones: su salario en Nómina Semanal y sus comisiones en Liquidaciones Diarias.
- ¿Negocio sin trabajadores con salario fijo? → Sección "Nómina Semanal" muestra mensaje "Sin trabajadores asalariados".
- ¿Negocio con todos los trabajadores asalariados (nadie a comisión)? → Sección "Liquidaciones Diarias" muestra "Sin trabajadores a comisión este mes".
- ¿Movimientos legacy `payment_method: 'mixed'`? → No aparecen en los modales de Efectivo/Transferencia. El KPI sigue siendo correcto (el hook los parsea vía metadata).
- ¿Mes con 5 semanas? → El modal de nómina muestra 5 columnas de semanas en vez de 4.

## Requirements

- **FR-001**: Efectivo Disponible → modal filtrado por `payment_method = 'cash'` y mes en curso. Secciones: Ingresos (cierres, abonos, préstamos, otros), Egresos (gastos, base próximo día), Neto = KPI.
- **FR-002**: Transferencia Disponible → modal filtrado por `payment_method = 'transfer' | 'card'` y mes en curso. Secciones: Ingresos (cierres, abonos, préstamos, otros), Egresos, Neto = KPI.
- **FR-003**: Egresos → modal con lista de egresos individuales del mes (descripción, fecha, monto). Orden: más reciente primero.
- **FR-004**: Liquidaciones → modal con comisiones pagadas en el mes: trabajador, monto, fecha de pago. Orden: mayor monto primero.
- **FR-005**: Total Nómina → modal con dos secciones:
  - **Nómina Semanal**: Trabajadores con salario fijo (`workers.salary > 0`, activos). Total mensual + tabla de semanas del mes (Semana 1-N con subtotal). Al expandir cada semana, lista de trabajadores con su salario.
  - **Liquidaciones Diarias**: Trabajadores sin salario fijo que recibieron comisiones en el mes. Suma de `worker_commissions` pagadas, agrupadas por trabajador. Cada trabajador muestra: nombre, monto total, cantidad de comisiones.
  - Header del modal: Total General = Nómina Semanal + Liquidaciones Diarias.
- **FR-006**: Cartera Total → modal con clientes y saldo pendiente (`customer_debts.remaining_amount > 0`), ordenados mayor a menor deuda.
- **FR-007**: Recuperación Efectivo → modal con abonos en efectivo del mes: cliente, monto, fecha.
- **FR-008**: Recuperación Transferencia → modal con abonos por transferencia del mes: cliente, monto, fecha.
- **FR-009**: Todos los modales son componentes compartidos en `apps/shared/components/modals/`.
- **FR-010**: Estados de carga (skeleton/spinner) y vacío descriptivo en cada modal.
- **FR-011**: Datos se refrescan automáticamente al cambiar de negocio.
- **FR-012**: Idéntico en desktop (Electron) y web (Next.js).

## Success Criteria

- **SC-001**: Cada modal abre en <1s tras clic en su KPI.
- **SC-002**: El total/neto en cada modal coincide exactamente con el KPI del dashboard.
- **SC-003**: Modal de Nómina muestra semanas correctas según calendario del mes y separa correctamente asalariados de trabajadores a comisión.
- **SC-004**: Todos los modales funcionan idéntico en desktop y web usando componentes compartidos.

## Assumptions

- Efectivo/Transferencia: datos desde `central_cash_movements` filtrados por `payment_method` + `created_at` del mes en curso. Movimientos `mixed` legacy no aparecen — se están migrando a cash/transfer separados en cada nuevo cierre.
- Nómina Semanal: `workers.salary` de activos. Total ÷ semanas del mes = estimación por semana. No hay tabla de pagos reales de nómina; esto es una referencia de costo.
- Liquidaciones Diarias: `worker_commissions.status = 'paid'` del mes, filtradas solo para trabajadores que NO están en el grupo de asalariados (`salary = 0` o `null`).
- Cartera comparte un `CarteraDetailModal` con prop `mode` (total/efectivo/transferencia).
- Total Servicios mantiene su modal actual (`CategorySalesModal`). Sin cambios.
- Los modales nuevos son: `EfectivoTransferenciaDetailModal`, `NominaDetailModal`, `CarteraDetailModal`. `CashDashboardDetailModal` existente se mantiene para Egresos.
