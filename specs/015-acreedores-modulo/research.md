# Research: Módulo de Acreedores

**Feature**: 015-acreedores-modulo
**Date**: 2026-06-19

## Decision 1: Estructura de tablas

**Decision**: Crear `creditor_debts` y `creditor_payments` siguiendo el mismo patrón que `customer_debts` y `debt_payments`, pero simplificado.

```sql
CREATE TABLE public.creditor_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    creditor_name TEXT NOT NULL,          -- texto libre, ej. "Coéxito", "pago de agua"
    amount DECIMAL(10,2) NOT NULL,       -- valor total de la deuda
    remaining_amount DECIMAL(10,2) NOT NULL, -- saldo pendiente
    invoice_date DATE,                    -- fecha de factura/adquisición
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','partial','paid')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.creditor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    creditor_debt_id UUID REFERENCES public.creditor_debts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','transfer')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Rationale**: 
- `creditor_name` como TEXT libre porque el usuario rechazó una entidad separada de acreedores
- `invoice_date` como DATE (no TIMESTAMPTZ) porque solo interesa la fecha, no la hora
- Mismos estados que `customer_debts`: pending → partial → paid
- `creditor_payments` sin `cash_session_id` porque los pagos son desde Finanzas, no desde sesión POS
- RLS con política `business_id = get_my_business_id()` (patrón estándar del proyecto)

**Alternatives considered**:
- ❌ Reutilizar `customer_debts` con un flag `type='creditor'`: ensuciaría la tabla con campos nullable (`customer_id`, `sale_id`)
- ❌ Entidad `creditors` separada con FK: el usuario quiere nombre libre, no CRM
- ✅ Tabla simple con `creditor_name` TEXT: mínima fricción, máxima flexibilidad

## Decision 2: Integración con Caja Central

**Decision**: Los abonos a acreedores insertan en `central_cash_movements` con `type='expense'` y `payment_method` del abono.

**Rationale**: El dinero sale del negocio hacia el proveedor → egreso. El método de pago se hereda del abono (si el abono fue en efectivo, el egreso es en efectivo). La descripción incluye el nombre del acreedor para trazabilidad.

**Flujo**:
1. Usuario registra abono de $200K en efectivo a "Coéxito"
2. Se inserta en `creditor_payments` (amount=200K, payment_method='cash')
3. Se actualiza `creditor_debts.remaining_amount` y `status`
4. Se inserta en `central_cash_movements` (type='expense', amount=200K, payment_method='cash', description='Abono a acreedor: Coéxito')
5. El hook `useCentralCash` consulta `creditor_debts` y `creditor_payments` para las cards

**Alternatives considered**:
- ❌ No integrar con Caja Central: inconsistente con Cartera (que sí se integra)
- ❌ Registrar como ingreso: conceptualmente incorrecto (es dinero que sale)

## Decision 3: Reutilización de CarteraDetailModal

**Decision**: Extender `CarteraDetailModal` para aceptar un modo `"acreedores"` y `"acreedores-pagos"`.

**Rationale**: La estructura visual es idéntica: lista de items con nombre + monto. Agregar 2 modos evita crear un componente nuevo. El modal ya soporta 3 modos (`total`, `recuperacion-efectivo`, `recuperacion-transferencia`).

**Alternativas consideradas**:
- ❌ Crear `AcreedoresDetailModal.tsx`: duplicación de código (~60% igual a `CarteraDetailModal`)
- ✅ Extender `CarteraDetailModal`: solo se agregan 2 modos + títulos condicionales

## Decision 4: Estado de carga en el hook

**Decision**: Agregar al hook `useCentralCash`: `fetchCreditorData()` + estados `acreedoresTotal`, `acreedoresPagadoMes`, `acreedoresLoading`, `acreedoresDetalle`, `acreedoresPagosDetalle`.

**Rationale**: Mismo patrón que `fetchCarteraData()`. Se llama desde `fetchDashboardData()` con `Promise.allSettled`. Las queries son:
- `acreedoresTotal`: `SELECT SUM(remaining_amount) FROM creditor_debts WHERE business_id = X AND status != 'paid'`
- `acreedoresPagadoMes`: `SELECT SUM(amount) FROM creditor_payments WHERE business_id = X AND created_at >= start AND created_at < end`
- `acreedoresDetalle`: `SELECT * FROM creditor_debts WHERE business_id = X AND status != 'paid' ORDER BY created_at DESC`
- `acreedoresPagosDetalle`: `SELECT * FROM creditor_payments WHERE business_id = X AND created_at >= start AND created_at < end ORDER BY created_at DESC`
