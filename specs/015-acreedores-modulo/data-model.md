# Data Model: Módulo de Acreedores

**Feature**: 015-acreedores-modulo
**Date**: 2026-06-19

## New Tables

### creditor_debts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| `business_id` | UUID | FK → business(id) ON DELETE CASCADE | Tenant isolation |
| `creditor_name` | TEXT | NOT NULL | Nombre o concepto del acreedor (texto libre). Ej: "Coéxito", "pago de agua", "soldador" |
| `amount` | DECIMAL(10,2) | NOT NULL | Valor total de la deuda |
| `remaining_amount` | DECIMAL(10,2) | NOT NULL | Saldo pendiente por pagar |
| `invoice_date` | DATE | NULLABLE | Fecha de la factura o adquisición |
| `status` | TEXT | DEFAULT 'pending', CHECK IN ('pending','partial','paid') | Estado de la deuda |
| `notes` | TEXT | NULLABLE | Notas adicionales |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Última actualización |

**State transitions**: `pending` → `partial` (al registrar primer abono) → `paid` (cuando remaining_amount = 0)

### creditor_payments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| `business_id` | UUID | FK → business(id) ON DELETE CASCADE | Tenant isolation |
| `creditor_debt_id` | UUID | FK → creditor_debts(id) ON DELETE CASCADE | Deuda a la que pertenece el abono |
| `amount` | DECIMAL(10,2) | NOT NULL | Monto abonado |
| `payment_method` | TEXT | NOT NULL, CHECK IN ('cash','transfer') | Método de pago |
| `notes` | TEXT | NULLABLE | Notas adicionales |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Fecha del abono |

### Indexes

```sql
CREATE INDEX idx_creditor_debts_business_id ON creditor_debts(business_id);
CREATE INDEX idx_creditor_debts_status ON creditor_debts(business_id, status);
CREATE INDEX idx_creditor_payments_business_id ON creditor_payments(business_id);
CREATE INDEX idx_creditor_payments_debt_id ON creditor_payments(creditor_debt_id);
CREATE INDEX idx_creditor_payments_created ON creditor_payments(business_id, created_at);
```

### RLS Policies

```sql
ALTER TABLE creditor_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creditor_payments ENABLE ROW LEVEL SECURITY;

-- Mismo patrón que el resto de tablas del proyecto
CREATE POLICY "Tenant Isolation" ON creditor_debts
    FOR ALL TO authenticated
    USING (business_id = public.get_my_business_id());

CREATE POLICY "Tenant Isolation" ON creditor_payments
    FOR ALL TO authenticated
    USING (business_id = public.get_my_business_id());
```

## Existing Tables (read-only, no changes)

| Table | Used For |
|-------|----------|
| `central_cash_movements` | Insertar egreso por cada abono a acreedor |
| `business` | Tenant context (FK) |

## Existing Tables (conserved, UI removed)

| Table | Status |
|-------|--------|
| `worker_loans` | Conservada intacta en DB, ya no referenciada desde UI |
| `worker_loan_payments` | Conservada intacta en DB, ya no referenciada desde UI |

## TypeScript Interfaces

```ts
// Extensión de useCentralCash.ts
interface AcreedorItem {
    id: string;
    creditor_name: string;
    amount: number;
    remaining_amount: number;
    invoice_date: string | null;
    status: 'pending' | 'partial' | 'paid';
}

interface AcreedorPagoItem {
    id: string;
    creditor_name: string;       // joined desde creditor_debts
    amount: number;
    payment_method: 'cash' | 'transfer';
    created_at: string;
}
```

## Data Flow

```
CreditorDebts.tsx (desktop)
  │
  ├─ Crear deuda → INSERT creditor_debts
  ├─ Registrar abono → INSERT creditor_payments
  │                   → UPDATE creditor_debts.remaining_amount, status
  │                   → INSERT central_cash_movements (type='expense')
  │
  └─ Lista deudas → SELECT creditor_debts WHERE business_id = X

useCentralCash.ts (shared)
  │
  ├─ fetchCreditorData()
  │   ├─ acreedoresTotal = SUM(remaining_amount) WHERE status != 'paid'
  │   └─ acreedoresPagadoMes = SUM(amount) WHERE created_at IN month
  │
  └─ Exponer a CentralCash.tsx + web finanzas/page.tsx
        └─ Cards "🏗️ Acreedores" + modales
```
