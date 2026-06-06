# Data Model: Mejora del Sistema de Cambio y Propinas en POS

**Feature**: [spec.md](./spec.md) | **Date**: 2026-06-05

---

## Entities (No new tables — extensión de estructuras existentes)

### 1. Sale Metadata (JSONB) — Campos Nuevos

Se extiende `sales.metadata` con los siguientes campos nuevos. Ninguno requiere migración de esquema (son JSONB).

```jsonc
{
  // ─── Campos existentes (se preservan) ───
  "business_type": "automotive",
  "created_from": "desktop_pos",
  "tip_amount": 600,            // existente: monto de propina
  "tip_worker_id": "uuid",      // existente: trabajador que recibe propina
  
  // ─── NUEVOS: Cambio Cruzado ───
  "cross_change": {             // null si no hubo cambio cruzado
    "from_method": "transfer",  // método con el que pagó
    "to_method": "cash",        // método en que se devuelve el cambio
    "amount": 1500              // monto devuelto
  },

  // ─── NUEVOS: Propina Mejorada ───
  "tip_payment_method": "cash", // método de pago de la propina (independiente del método de venta)
  "tip_percentage": 15,         // porcentaje aplicado (null si fue monto manual)
  "tip_distribution": [         // null si propina a un solo trabajador
    { "worker_id": "uuid-a", "amount": 300 },
    { "worker_id": "uuid-b", "amount": 300 }
  ]
}
```

**Reglas de validación**:
- `cross_change.from_method !== cross_change.to_method` (no puede ser el mismo)
- `cross_change.amount > 0` y `cross_change.amount <= (monto_recibido - total_venta)`
- `tip_distribution` solo se usa si `tipWorkerId` no está definido (mutuamente excluyentes)
- `sum(tip_distribution[].amount) === tip_amount`
- `tip_percentage` debe estar en {10, 15, 20} o null (monto manual)

### 2. SaleMetadata TypeScript Interface

Se extiende `apps/desktop/src/types/pos.ts`:

```ts
export interface SaleMetadata {
    // existentes...
    business_type: 'automotive' | 'retail' | 'restaurant' | 'barbershop';
    created_from: 'desktop_pos' | 'web_pos';
    mileage?: number;
    vehicle_notes?: string;
    table_id?: string;
    table_number?: number;
    diners?: number;
    shift_id?: string;
    stylist_id?: string;
    appointment_id?: string;
    quick_sale_name?: string;
    sale_notes?: string;
    
    // NUEVOS
    tip_amount?: number;
    tip_worker_id?: string | null;
    tip_payment_method?: 'cash' | 'transfer' | 'card';
    tip_percentage?: number;
    tip_distribution?: Array<{ worker_id: string; amount: number }>;
    cross_change?: {
        from_method: 'cash' | 'transfer' | 'card';
        to_method: 'cash' | 'transfer' | 'card';
        amount: number;
    };
}
```

### 3. Cash Movement (cash_movements)

**Sin cambios de esquema**. Se usa la tabla existente con nuevos valores de `description`:

```sql
-- Movimiento generado por cambio cruzado
INSERT INTO cash_movements (type, amount, payment_method, description, session_id, business_id, user_id)
VALUES (
    'expense',
    1500,
    'cash',                          -- método destino del cambio
    'Cambio cruzado - Venta #abc123 - Transferencia a Efectivo',
    '<session_id>',
    '<business_id>',
    '<user_id>'
);
```

**Reglas**:
- Siempre `type = 'expense'` (el negocio está entregando dinero)
- `payment_method` = `cross_change.to_method` (el método en que se entrega el cambio)
- `amount` = `cross_change.amount`
- Se crea en el mismo `handleConfirm` de PaymentModal, después de crear la venta

### 4. Worker Commission (worker_commissions)

**Sin cambios de esquema**. Se extiende el uso existente:

```sql
-- Antes: una sola comisión por propina
INSERT INTO worker_commissions (worker_id, sale_id, service_type, base_amount, commission_percentage, commission_amount, status, business_id)
VALUES ('<tip_worker_id>', '<sale_id>', 'tip', 600, 100, 600, 'pending', '<business_id>');

-- Ahora (con distribución): múltiples comisiones
INSERT INTO worker_commissions (...) VALUES
    ('<worker-a>', '<sale_id>', 'tip_split', 300, 100, 300, 'pending', '<business_id>'),
    ('<worker-b>', '<sale_id>', 'tip_split', 300, 100, 300, 'pending', '<business_id>');
```

**`service_type` values**:
| Valor | Significado |
|---|---|
| `tip` (existente) | Propina a un solo trabajador |
| `tip_split` (NUEVO) | Propina distribuida entre múltiples trabajadores |

### 5. CloseSession — Cálculo de Totales

El `CloseSessionModal` ya calcula `expectedTotal` con la fórmula correcta. No cambia el esquema de `cash_sessions`. Lo que cambia es el procesamiento:

```
Efectivo Esperado = Base + VentasEfectivo + MovimientosEfectivo + AbonosEfectivo
- VentasEfectivo: cash_amount de cada sale (ya incluye tip si tip_payment_method=cash)
- MovimientosEfectivo: incluye los cambios cruzados 'expense' en cash
```

El `CloseSessionModal` ya maneja esto correctamente porque:
- Línea 90: `cashMovementBalance` suma/resta todos los `cash_movements` con `payment_method='cash'`
- Los cambios cruzados generan `expense` en el método destino → se restan automáticamente

### 6. Relaciones entre Entidades

```
Sale (sales)
  ├─ metadata.cross_change          → cash_movement (expense, método destino)
  ├─ metadata.tip_amount            → worker_commissions (service_type='tip'|'tip_split')
  ├─ metadata.tip_payment_method    → determina si tip se suma a cash/transfer/card_amount
  └─ cash_amount / transfer_amount / card_amount → CloseSession esperado

CashMovement (cash_movements)
  ├─ type='expense', payment_method  → CloseSession cashMovementBalance
  └─ description='Cambio cruzado...' → trazabilidad en SessionHistory
```
