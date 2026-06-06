# Flujo de Caja — Sesiones, Cierre y Caja Central

**Actualizado**: 2026-06-05

---

## Resumen del Flujo

```
APERTURA DE CAJA
  └─ OpenSessionModal → INSERT cash_sessions { opening_balance, status: 'open' }

DURANTE LA SESIÓN
  ├─ Ventas (PaymentModal) → INSERT sales (+ sale_items)
  ├─ Movimientos Manuales (CashMovementModal) → INSERT cash_movements
  ├─ Pagos de Deudas (CreditManagement, CarteraHub) → INSERT debt_payments
  │    └─ También → INSERT central_cash_movements { type: 'income', desc: 'Abono crédito' }
  └─ Comisiones (CommissionPaymentModal) → UPDATE worker_commissions.status = 'paid'
       └─ También → INSERT central_cash_movements { type: 'expense' }

CIERRE DE CAJA
  └─ CloseSessionModal
       ├─ Cálculo: expectedTotal = opening_balance + cashSales + cashMovements + cashAbonos
       ├─ Conteo físico: totalCounted (billetes + monedas)
       ├─ UPDATE cash_sessions { closed_at, end_amount, manual_end_amount, difference, status:'closed' }
       └─ INSERT central_cash_movements { type:'income', amount: totalCounted - cashAbonosTotal }
            └─ NOTA: Se resta cashAbonosTotal porque esos abonos YA fueron registrados
               en central_cash_movements al momento del pago (evitar doble conteo)
```

---

## Apertura de Caja (OpenSessionModal)

**Archivo**: [`apps/desktop/src/components/modals/OpenSessionModal.tsx`](../../apps/desktop/src/components/modals/OpenSessionModal.tsx)

1. El cajero selecciona un trabajador admin como responsable
2. Ingresa la base inicial en efectivo mediante un teclado numérico
3. El sistema verifica que no haya otra sesión abierta. Si existe, la restaura en vez de crear una nueva
4. Se inserta en `cash_sessions`: `{ business_id, worker_id, opening_balance, status: 'open', opened_at }`
5. Se actualiza `useSessionStore.setCashSession()` con los datos de la sesión

**Validaciones**:
- Solo trabajadores con rol admin pueden abrir caja
- Si no hay admins configurados, muestra advertencia

---

## Durante la Sesión

### Ventas (PaymentModal)

**Archivo**: [`apps/desktop/src/components/modals/PaymentModal.tsx`](../../apps/desktop/src/components/modals/PaymentModal.tsx)

Cada venta registra:
- `sales`: monto total, método de pago, montos por método (cash/transfer/card/credit), metadata JSONB
- `sale_items`: ítems individuales con cantidad, precio, descuento
- `worker_commissions`: comisiones por servicio y/o propinas
- Opcional: `cash_movements` (si hay cambio cruzado → expense)

### Movimientos Manuales (CashMovementModal)

**Archivo**: [`apps/desktop/src/components/modals/CashMovementModal.tsx`](../../apps/desktop/src/components/modals/CashMovementModal.tsx)

Tres modos:
- **Ingreso**: `cash_movements { type: 'income', payment_method: 'cash' }`
- **Egreso**: `cash_movements { type: 'expense', payment_method: 'cash' }`
- **Canje**: Dos movimientos atómicos — uno income y uno expense, con métodos opuestos

### Pagos de Deudas (Abonos)

Tres lugares donde se procesan abonos:
- `CreditManagement.tsx` (desktop)
- `CarteraHub.tsx` (desktop)
- `RegisterAbonoModal.tsx` (web)

**Todos los abonos van a Caja Central** (`goToCentral = true` siempre):
1. Se ejecuta RPC `process_debt_payment` → actualiza `customer_debts.remaining_amount`
2. Se inserta `debt_payments { cash_session_id, amount, payment_method }`
3. Se inserta `central_cash_movements { type: 'income', amount, description: 'Abono crédito - [Cliente]' }`

---

## Cierre de Caja (CloseSessionModal)

**Archivo**: [`apps/desktop/src/components/modals/CloseSessionModal.tsx`](../../apps/desktop/src/components/modals/CloseSessionModal.tsx)

### Cálculo del Efectivo Esperado

```
expectedTotal = opening_balance
              + cashSalesTotal          (ventas en efectivo + parte cash de mixtas)
              + cashMovementBalance     (ingresos - egresos en efectivo)
              + cashAbonosTotalLocal    (abonos recibidos en efectivo)
```

### Cálculo del Total Digital Esperado

```
expectedDigitalTotal = digitalSalesTotal        (ventas con transferencia/tarjeta)
                     + digitalAbonosTotal        (abonos digitales)
                     + digitalMovementBalance    (movimientos en transferencia/tarjeta)
```

### Conteo Físico

El cajero cuenta billetes por denominación ($100K, $50K, $20K, $10K, $5K, $2K, $1K) más monedas. El total contado es `totalCounted`.

### Diferencias

```
difference          = totalCounted - expectedTotal
digitalDifference   = manualDigitalAmount - expectedDigitalTotal
```

### Grabación en Caja Central

```typescript
const netToTransfer = Math.max(0, totalCounted - cashAbonosTotal);
```

**¿Por qué se resta `cashAbonosTotal`?** Los abonos en efectivo recibidos durante la sesión YA fueron registrados individualmente en `central_cash_movements` al momento del pago. Si el cierre enviara `totalCounted` completo, esos montos aparecerían dos veces. Esta resta corrige el doble conteo.

La descripción del registro incluye: `"($X ya registrados como abonos)"` para trazabilidad.

### Cálculo de Ganancia

La UI muestra: `Ganancia = totalCounted - opening_balance` (efectivo final menos base inicial)

---

## Caja Central (useCentralCash)

**Archivos**:
- Desktop: [`apps/desktop/src/hooks/useCentralCash.ts`](../../apps/desktop/src/hooks/useCentralCash.ts)
- Web: [`apps/web/app/hooks/useCentralCash.ts`](../../apps/web/app/hooks/useCentralCash.ts)

La caja central (`central_cash_movements`) recibe registros de:

| Origen | Tipo | Cuándo |
|---|---|---|
| CloseSessionModal | `income` | Al cerrar caja (neto de abonos) |
| CreditManagement / CarteraHub | `income` | Al recibir abono de cliente |
| RegisterAbonoModal (web) | `income` | Al recibir abono de cliente (web) |
| WorkerPaymentCalculator | `expense` | Al pagar comisiones/salarios |

**Balance**: `SUM(income) - SUM(expense)` calculado en frontend.

### Web — Tiempo Real

El hook web incluye suscripción Realtime a `central_cash_movements` vía `postgres_changes`, refrescando automáticamente ante cualquier cambio.

---

## SessionHistory (Historial de Sesiones)

**Archivo**: [`apps/desktop/src/components/admin/sessions/SessionHistory.tsx`](../../apps/desktop/src/components/admin/sessions/SessionHistory.tsx)

Vista de panel dividido:
- **Izquierda**: Lista de sesiones con fecha, hora, trabajador, balance inicial/final, estado
- **Derecha**: Detalle con ventas, movimientos, comisiones, y arqueo de caja

---

## CashierStatus (Dashboard de Caja Activa)

**Archivo**: [`apps/desktop/src/components/finance/CashierStatus.tsx`](../../apps/desktop/src/components/finance/CashierStatus.tsx)

Dashboard en tiempo real de la sesión activa. Calcula:

```
currentCash = start_amount + cashSales + cashIncomes - cashExpenses
```

Muestra 5 paneles: base inicial, ventas efectivo, ventas digitales, pendientes (créditos + préstamos), descuentos.

---

## Registro de Cambio Cruzado

Cuando un cliente paga por transferencia un monto mayor y pide cambio en efectivo (o viceversa), el sistema:

1. Crea la venta con el monto recibido real en el método de pago
2. Inserta `cash_movements { type: 'expense', payment_method: <método_destino> }` por el monto del cambio
3. Guarda `cross_change` en `sales.metadata`: `{ from_method, to_method, amount }`

El CloseSessionModal procesa estos movimientos automáticamente porque `cashMovementBalance` ya incluye todos los `cash_movements` (income y expense) de la sesión.
