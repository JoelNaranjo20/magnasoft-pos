# Flujo de Caja — Sesiones, Cierre y Caja Central

**Actualizado**: 2026-08-31 (spec 018 — Base Diaria de Caja)

---

## Resumen del Flujo

```
APERTURA DE CAJA
  └─ OpenSessionModal → monto inicial pre-cargado con la Base Diaria de Caja (editable con PIN)
                      → INSERT cash_sessions { opening_balance, status: 'open' }

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
       ├─ "Base Próximo Día" pre-cargado con la Base Diaria de Caja (editable con PIN)
       ├─ UPDATE cash_sessions { closed_at, end_amount, manual_end_amount, difference, status:'closed' }
       ├─ INSERT central_cash_movements { type:'income', payment_method:'cash', amount: cashIngresos }
       │       (cashIngresos = ventas/abonos/otros en efectivo de la sesión — NO incluye opening_balance)
       │       metadata.next_day_base = safeNextDayBase  (solo dato, no genera movimiento)
       └─ INSERT central_cash_movements { type:'income', payment_method:'transfer', amount: transferIngresos }

  ⚠️ spec 018: la base del día siguiente NO genera movimiento en Caja Central.
     Se queda físicamente en la registradora y es el opening_balance del turno siguiente.
     (Antes existía un egreso "💵 Base próximo día" — ELIMINADO: causaba descuadre acumulado.)
```

---

## Apertura de Caja (OpenSessionModal)

**Archivo**: [`apps/desktop/src/components/modals/OpenSessionModal.tsx`](../../apps/desktop/src/components/modals/OpenSessionModal.tsx)

1. El cajero selecciona un trabajador admin como responsable
2. El "Monto Inicial en Efectivo" ya viene pre-cargado con la **Base Diaria de Caja** configurada (0 si no está configurada). El admin puede editarlo con el teclado numérico, pero editar el monto pide el **PIN Maestro** del negocio (si hay PIN configurado)
3. El sistema verifica que no haya otra sesión abierta. Si existe, la restaura en vez de crear una nueva
4. Se inserta en `cash_sessions`: `{ business_id, worker_id, opening_balance, status: 'open', opened_at }` — `opening_balance` = el valor mostrado en pantalla
5. Se actualiza `useSessionStore.setCashSession()` con los datos de la sesión

**Validaciones**:
- Solo trabajadores con rol admin pueden abrir caja
- Si no hay admins configurados, muestra advertencia

---

## Base Diaria de Caja (ajuste)

**Configuración**: Configuración → sección **Caja** → "Base Diaria de Caja" (`GeneralSettings.tsx`, desktop).

- Persistencia: `business_settings` con `setting_type = 'cash'`, `value = { daily_base: <número> }` (uno por negocio; ausencia = 0).
- Expuesto en la store compartida `useBusinessStore` como `dailyCashBase`, cargado en `fetchBusinessProfile`.
- **Apertura**: pre-carga el monto inicial. **Cierre**: pre-carga "Base Próximo Día" (siempre la Base Diaria, no el `opening_balance`).
- Editar el monto en Apertura o Cierre requiere el **PIN Maestro** (`business.pin` / `SecurityPinModal`). Sin PIN configurado → editable directo.
- La base **nunca** entra ni se resta en Caja Central: se queda en la registradora como base del turno siguiente.

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

Al cerrar se insertan hasta dos movimientos `income` (uno `cash`, uno `transfer`) con
el efectivo y las transferencias que **entraron durante la sesión** (`cashIngresos` /
`transferIngresos`). Estos totales **no incluyen `opening_balance`**, así que la base
heredada del día anterior nunca vuelve a "entrar" a Caja Central.

**Base del día siguiente (spec 018)**: NO genera ningún movimiento. El monto de
"Base Próximo Día" (por defecto = Base Diaria de Caja) se guarda solo como
`metadata.next_day_base` para trazabilidad. Físicamente ese efectivo se queda en la
registradora y será el `opening_balance` del turno siguiente. El antiguo egreso
`💵 Base próximo día` fue eliminado porque restaba la base del total central cada día
sin que ésta se hubiera sumado (descuadre acumulado).

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
| CloseSessionModal | `income` (cash + transfer) | Al cerrar caja — efectivo y transferencias de la sesión (NO la base, NO `opening_balance`) |
| CreditManagement / CarteraHub | `income` | Al recibir abono de cliente |
| RegisterAbonoModal (web) | `income` | Al recibir abono de cliente (web) |
| WorkerPaymentCalculator | `expense` | Al pagar comisiones/salarios |

> La "Base Próximo Día" **no** aparece en esta tabla: desde spec 018 no genera movimiento.

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
