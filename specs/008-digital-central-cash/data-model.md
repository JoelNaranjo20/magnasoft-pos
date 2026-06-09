# Data Model: Ingresos Completos a Caja Central

**Feature**: 008-digital-central-cash  
**Date**: 2026-06-09  
**Version**: v3

## 1. Schema Changes

### 1.1 `central_cash_movements` — 3 columnas nuevas

```sql
-- Columna 1: payment_method
ALTER TABLE public.central_cash_movements
ADD COLUMN payment_method TEXT;

ALTER TABLE public.central_cash_movements
ADD CONSTRAINT ccm_payment_method_check 
CHECK (payment_method IN ('cash', 'transfer', 'card', 'mixed'));

-- Columna 2: session_id (trazabilidad)
ALTER TABLE public.central_cash_movements
ADD COLUMN session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL;

-- Columna 3: metadata (desglose)
ALTER TABLE public.central_cash_movements
ADD COLUMN metadata JSONB;

-- Índices
CREATE INDEX idx_central_cash_session_id ON public.central_cash_movements(session_id);
CREATE INDEX idx_central_cash_payment_method ON public.central_cash_movements(payment_method);
CREATE INDEX idx_central_cash_created_at ON public.central_cash_movements(created_at);
```

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `payment_method` | TEXT | YES (legacy) | `'cash'`, `'transfer'`, `'card'`, `'mixed'` (cierre) |
| `session_id` | UUID FK | YES | FK a `cash_sessions`. NULL = manual |
| `metadata` | JSONB | YES | Desglose de orígenes. NULL = manual |

### 1.2 Reglas de `payment_method`

| Valor | Significado | Cuándo se usa |
|-------|-------------|---------------|
| `mixed` | Contiene efectivo + transferencia + tarjeta | Cierre automático de turno |
| `cash` | Solo efectivo | Movimientos manuales en efectivo |
| `transfer` | Solo transferencia | Movimientos manuales por transferencia |
| `card` | Solo tarjeta | Movimientos manuales por tarjeta |
| NULL | Legacy sin clasificar | Movimientos anteriores (backfill asigna `cash`) |

## 2. Metadata JSONB Schema

```typescript
interface CentralCashMetadata {
  cash_sales: number;              // Ventas en efectivo
  transfer_sales: number;          // Ventas por transferencia
  card_sales: number;              // Ventas por tarjeta
  cash_abonos: number;             // Abonos cartera clientes (efectivo)
  transfer_abonos: number;         // Abonos cartera clientes (transferencia)
  card_abonos: number;             // Abonos cartera clientes (tarjeta)
  cash_loan_payments: number;      // Pagos préstamos trabajadores (efectivo)
  transfer_loan_payments: number;  // Pagos préstamos trabajadores (transferencia)
  cash_other: number;              // Otros ingresos en efectivo
  transfer_other: number;          // Otros ingresos por transferencia
  commissions_paid: number;        // Comisiones pagadas en el turno (referencia)
}
```

### Cálculo de balances por vista

```
Efectivo Disponible = Σ[cierres mixed: cash_sales + cash_abonos + cash_loan_payments + cash_other]
                    + Σ[manuales cash income]
                    − Σ[manuales cash expense]

Transferencia Disp. = Σ[cierres mixed: transfer_sales + transfer_abonos + transfer_loan_payments + transfer_other]
                    + Σ[manuales transfer income]
                    − Σ[manuales transfer expense]

Total General       = Efectivo Disponible + Transferencia Disponible
```

## 3. RPC: `backfill_central_cash_sessions`

```sql
CREATE OR REPLACE FUNCTION public.backfill_central_cash_sessions(
    p_business_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
```

### Lógica:

1. **Migrar legacy**: `UPDATE central_cash_movements SET payment_method = 'cash' WHERE payment_method IS NULL AND session_id IS NULL`
2. **Por cada sesión cerrada** sin movimiento asociado:
   - Calcular todos los campos del metadata desde `sales`, `debt_payments`, `worker_loans`, `cash_movements`
   - `amount` = suma de todos los ingresos (menos cash_abonos ya registrados individualmente)
   - INSERT con `payment_method = 'mixed'`, `session_id`, `metadata`
3. Si ya existe un movimiento con ese `session_id`, saltar (idempotente)
4. Retornar `{ processed: N, skipped: M }`

## 4. Types — TypeScript

```typescript
// apps/desktop/src/types/supabase.ts

interface CentralCashMovement {
  id: string;
  business_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  payment_method: 'cash' | 'transfer' | 'card' | 'mixed' | null;  // NEW
  session_id: string | null;    // NEW
  metadata: CentralCashMetadata | null;  // NEW
  user_id: string | null;
  created_at: string;
}

interface CentralCashMetadata {
  cash_sales: number;
  transfer_sales: number;
  card_sales: number;
  cash_abonos: number;
  transfer_abonos: number;
  card_abonos: number;
  cash_loan_payments: number;
  transfer_loan_payments: number;
  cash_other: number;
  transfer_other: number;
  commissions_paid: number;
}
```
