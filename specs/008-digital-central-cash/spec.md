# Feature Specification: Ingresos Completos a Caja Central con Trazabilidad

**Feature Branch**: `008-digital-central-cash`

**Created**: 2026-06-09

**Status**: Draft (v3)

**Input**: "Al cerrar caja: pasar también las ventas digitales (transferencia + tarjeta) a Caja Central, no solo el efectivo físico. Incluir backfill de sesiones anteriores ya cerradas. Mejorar vista de Caja Central."

**Clarificaciones del usuario**:
1. Un solo movimiento por sesión cerrada, con TOTAL y metadata de desglose.
2. Metadata con trazabilidad de orígenes: ventas, cartera, préstamos trabajadores.
3. **Tres vistas separadas en Caja Central**: Efectivo Disponible, Transferencia Disponible, y Total General.
4. **Total General**: suma efectivo + transferencia, con gastos mensuales (pagos trabajadores, comisiones, etc.) y entradas mensuales por mes bien estructurados.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Un solo movimiento total por cierre de turno (Priority: P1)

Cuando el cajero cierra el turno, el sistema registra en Caja Central **un único movimiento `income`** con el monto total, `payment_method = 'mixed'`, y metadata JSONB con el desglose completo por método de pago y origen.

**Why this priority**: El dueño necesita una sola línea por turno con trazabilidad completa.

**Independent Test**: Cerrar turno con $100K efectivo + $50K transferencia. Verificar UN movimiento `mixed` por $150K con metadata completa.

**Acceptance Scenarios**:

1. **Given** turno con $80K ventas efectivo, $50K transferencia, $30K abonos cartera efectivo, **When** se cierra, **Then** Caja Central registra UN movimiento `mixed` por $160K con metadata `{ cash_sales: 80000, transfer_sales: 50000, cash_abonos: 30000, ... }`.
2. **Given** turno con pagos de préstamos de trabajadores + ventas mixtas, **When** se cierra, **Then** metadata muestra cada origen: ventas, cartera, préstamos.
3. **Given** turno sin ingresos digitales, **When** se cierra, **Then** igual se crea el movimiento unificado — metadata muestra `transfer_sales: 0`.

---

### User Story 2 — Tres vistas de balance en Caja Central (Priority: P1)

Caja Central debe tener 3 pestañas/tabs:

1. **Efectivo Disponible**: balance de todo el efectivo (cierres de turno parte efectivo + movimientos manuales en efectivo − egresos en efectivo).
2. **Transferencia Disponible**: balance de transferencias recibidas (cierres de turno parte transferencia + movimientos manuales transferencia − egresos transferencia).
3. **Total General**: efectivo + transferencia combinado, con resumen mensual de entradas y gastos.

**Why this priority**: El dueño necesita saber exactamente cuánto tiene en cada "bolsillo" (efectivo físico vs cuenta bancaria) y el total general del negocio.

**Independent Test**: Navegar entre las 3 pestañas. Verificar que cada una muestra el balance correcto calculado desde los movimientos.

**Acceptance Scenarios**:

1. **Given** cierres de turno y movimientos manuales, **When** el admin ve "Efectivo Disponible", **Then** el balance = suma de partes cash de cierres + manuales cash − egresos cash.
2. **Given** cierres de turno con transferencias, **When** ve "Transferencia Disponible", **Then** el balance = suma de partes transfer de cierres + manuales transfer − egresos transfer.
3. **Given** ambas pestañas, **When** ve "Total General", **Then** el balance = efectivo + transferencia, con desglose mensual visible.

---

### User Story 3 — Vista Total General con resumen mensual (Priority: P1)

La pestaña "Total General" debe mostrar:
- **Balance total** (efectivo + transferencia) en una card hero.
- **Resumen mensual**: una sección que muestre cada mes con:
  - Entradas del mes (suma de cierres de turno + ingresos manuales)
  - Gastos del mes (egresos manuales, pagos a trabajadores, comisiones)
  - Balance neto del mes
- Posibilidad de expandir un mes para ver el detalle de sus sesiones y movimientos.

**Why this priority**: Vista gerencial clave. El dueño ve la salud financiera mensual del negocio de un vistazo.

**Independent Test**: Ir a Total General, ver lista de meses con entradas, gastos y balance neto. Expandir un mes para ver detalle.

**Acceptance Scenarios**:

1. **Given** varios meses de operación, **When** el admin ve Total General, **Then** cada mes muestra: "Junio 2026 — Entradas: $5.2M | Gastos: $1.8M | Neto: +$3.4M".
2. **Given** un mes expandido, **When** ve el detalle, **Then** lista todos los movimientos de ese mes agrupados por tipo (cierres de turno, manuales, egresos).
3. **Given** gastos del mes (comisiones, salarios, préstamos), **When** ve la sección de gastos, **Then** están categorizados: "Comisiones Pagadas", "Salarios", "Otros Egresos", cada uno con su monto.

---

### User Story 4 — Backfill de sesiones históricas (Priority: P2)

Las sesiones ya cerradas deben tener su movimiento unificado creado en Caja Central con `payment_method = 'mixed'` y metadata completa. Los movimientos manuales legacy sin `payment_method` se migran a `payment_method = 'cash'` (default histórico).

**Why this priority**: Corrige el histórico para que los balances de las 3 vistas sean correctos desde el día 1.

**Independent Test**: Ejecutar backfill, verificar que todas las sesiones tienen su movimiento `mixed` con metadata, y los movimientos manuales legacy tienen `payment_method = 'cash'`.

**Acceptance Scenarios**:

1. **Given** 50 sesiones cerradas sin movimiento en Caja Central, **When** se ejecuta backfill, **Then** se crean 50 movimientos `mixed` con metadata completa.
2. **Given** movimientos manuales legacy sin `payment_method`, **When** se ejecuta backfill, **Then** se les asigna `payment_method = 'cash'`.
3. **Given** backfill ya ejecutado, **When** se ejecuta de nuevo, **Then** es idempotente (sin duplicados).

---

### Edge Cases

- Sesión sin ventas digitales: metadata muestra 0 en transfer/card, todo concentrated en cash.
- Ventas "mixed": la metadata captura cada parte. El `amount` total es la suma.
- Ventas a crédito: no entran a Caja Central. Solo cuando el cliente paga (abono).
- Propinas: incluidas según método de pago de la propina.
- Movimiento manual sin payment_method (legacy): se asume `cash` en backfill.
- Egresos manuales: restan del balance según su `payment_method`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al cerrar turno, crear **un único movimiento `income`** en `central_cash_movements` con `payment_method = 'mixed'`, `amount = total general`, `session_id`, y `metadata` JSONB con el desglose completo.
- **FR-002**: Columna `payment_method` en `central_cash_movements` con valores: `'cash'`, `'transfer'`, `'card'`, `'mixed'`. Movimientos de cierre usan `'mixed'`. Movimientos manuales usan método específico.
- **FR-003**: Metadata JSONB con estructura fija: `cash_sales`, `transfer_sales`, `card_sales`, `cash_abonos`, `transfer_abonos`, `card_abonos`, `cash_loan_payments`, `transfer_loan_payments`, `cash_other`, `transfer_other`, `commissions_paid`. Todos los campos siempre presentes (0 si no hay).

- **FR-004**: Vista **"Efectivo Disponible"** (Tab 1):
  - Balance = Σ(parte cash de cierres `mixed`) + Σ(ingresos manuales `cash`) − Σ(egresos manuales `cash`)
  - Lista de movimientos que componen el balance, agrupados por día.

- **FR-005**: Vista **"Transferencia Disponible"** (Tab 2):
  - Balance = Σ(parte transfer de cierres `mixed`) + Σ(ingresos manuales `transfer`) − Σ(egresos manuales `transfer`)
  - Lista de movimientos agrupados por día.

- **FR-006**: Vista **"Total General"** (Tab 3):
  - Balance = Efectivo Disponible + Transferencia Disponible
  - Hero card con balance total
  - Resumen mensual: cada mes muestra entradas totales, gastos totales, balance neto
  - Sección de gastos mensuales categorizados: comisiones pagadas, salarios/préstamos trabajadores, otros egresos
  - Sección de entradas mensuales: suma de cierres de turno + ingresos manuales
  - Meses expandibles para ver detalle de movimientos

- **FR-007**: Backfill idempotente que: (a) crea movimientos `mixed` para sesiones cerradas sin representación, (b) asigna `payment_method = 'cash'` a movimientos manuales legacy sin método.

- **FR-008**: Cada pestaña debe mostrar su balance en una card hero con formato de moneda grande y claro.

### Key Entities

- **central_cash_movements**: Columnas nuevas:
  - `session_id UUID FK → cash_sessions(id) ON DELETE SET NULL`
  - `metadata JSONB`
  - `payment_method TEXT CHECK (payment_method IN ('cash', 'transfer', 'card', 'mixed'))` — nuevos movimientos siempre tienen método. Legacy se migran a 'cash'.
- **cash_sessions**: Relación 1:1 con movimientos de cierre.
- **sales**, **debt_payments**, **worker_loans**, **cash_movements**: Fuentes de datos para calcular metadata.

## Success Criteria *(mandatory)*

- **SC-001**: Cada pestaña muestra su balance correcto en menos de 1 segundo al cambiar entre ellas.
- **SC-002**: El resumen mensual en Total General permite identificar la rentabilidad de cada mes en un solo vistazo.
- **SC-003**: Backfill procesa 100 sesiones en <10s, sin duplicados.
- **SC-004**: Los gastos mensuales están categorizados (comisiones, salarios, otros) y suman correctamente contra el balance.
- **SC-005**: Cero regresiones en cierre de turno, conciliación, o cálculo de totales.

## Assumptions

- Movimientos manuales nuevos siempre tendrán `payment_method` seleccionado por el usuario al crearlos (cash o transfer).
- El balance de "Transferencia" refleja el dinero que entra por transferencias — no está conectado a una cuenta bancaria real, es un registro contable interno.
- La parte cash de un movimiento `mixed` se calcula como: `cash_sales + cash_abonos + cash_loan_payments + cash_other`.
- La parte transfer de un movimiento `mixed` se calcula como: `transfer_sales + transfer_abonos + transfer_loan_payments + transfer_other`.
- Las comisiones pagadas (`commissions_paid`) son informativas y no modifican el balance (ya se descontaron al pagar).
