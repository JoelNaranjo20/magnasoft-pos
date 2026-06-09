# Quickstart: Implementar 3 vistas en Caja Central

**Feature**: 008-digital-central-cash  
**Version**: v3

## Paso 1: Migración de schema

Archivo: `supabase/migrations/20260609_add_session_id_metadata_central_cash.sql`

```sql
-- 1. payment_method
ALTER TABLE public.central_cash_movements ADD COLUMN payment_method TEXT;
ALTER TABLE public.central_cash_movements ADD CONSTRAINT ccm_payment_method_check CHECK (payment_method IN ('cash', 'transfer', 'card', 'mixed'));

-- 2. session_id
ALTER TABLE public.central_cash_movements ADD COLUMN session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL;

-- 3. metadata
ALTER TABLE public.central_cash_movements ADD COLUMN metadata JSONB;

-- 4. Índices
CREATE INDEX idx_central_cash_session_id ON public.central_cash_movements(session_id);
CREATE INDEX idx_central_cash_payment_method ON public.central_cash_movements(payment_method);

-- 5. RPC backfill
-- (ver data-model.md para lógica completa)
```

`supabase db push`

## Paso 2: Actualizar tipos TypeScript

`apps/desktop/src/types/supabase.ts`:
- Agregar `payment_method`, `session_id`, `metadata` a interfaz de `central_cash_movements`
- Agregar tipo `CentralCashMetadata`

## Paso 3: Modificar CloseSessionModal

`apps/desktop/src/components/modals/CloseSessionModal.tsx`:

En `handleConfirmClose`:
- Construir objeto `metadata` con los 11 campos desde las variables ya calculadas
- Un solo INSERT con `type: 'income'`, `payment_method: 'mixed'`, `amount: total`, `session_id`, `metadata`
- Eliminar el INSERT anterior de solo efectivo

## Paso 4: Actualizar useCentralCash

`apps/desktop/src/hooks/useCentralCash.ts`:
- Query: incluir `session_id`, `metadata`, `payment_method`
- Agregar `backfillSessions()` que llama la RPC
- Exponer funciones helper:
  - `getCashBalance()` — calcula balance de efectivo
  - `getTransferBalance()` — calcula balance de transferencia
  - `getTotalBalance()` — suma ambos
  - `getMonthlySummary()` — agrupa por mes con entradas/gastos/neto

## Paso 5: Rediseñar CentralCash.tsx

`apps/desktop/src/components/finance/CentralCash.tsx`:

- **Estado**: `activeTab: 'cash' | 'transfer' | 'total'`, `expandedDays: Set<string>`, `expandedMonths: Set<string>`
- **Tabs**: 3 botones con badge de monto
- **Tab Cash**: filtra movimientos por parte cash, agrupa por día, acordeones
- **Tab Transfer**: igual pero parte transferencia
- **Tab Total**: hero card + resumen mensual con secciones de entradas/gastos
- **Formulario**: agrega selector de `payment_method` obligatorio

Usar `date-fns` para formateo de meses (`format(created_at, 'MMMM yyyy')`).

## Verificación

- `pnpm tsc -b` sin errores
- `pnpm build` exitoso
- Cerrar turno con ventas mixtas → ver movimiento `mixed` en Caja Central
- Navegar entre 3 tabs → balances correctos
- Expandir mes en Total General → entradas y gastos categorizados
- Ejecutar backfill → sesiones históricas procesadas
