# Quickstart: Módulo de Acreedores

**Feature**: 015-acreedores-modulo
**Date**: 2026-06-19

## Prerequisites

- Supabase project running (remote `iejrrivdvgvzzgtpihcd`)
- pnpm installed
- Environment variables in `apps/desktop/.env.local` and `apps/web/.env.local`

## Development Steps

### 1. Migración SQL

Crear `supabase/migrations/20260619_add_creditor_tables.sql`:
- `creditor_debts` table
- `creditor_payments` table
- Indexes
- RLS policies

Push: `npx supabase db push`

### 2. Hook compartido (`useCentralCash.ts`)

Agregar:
- `fetchCreditorData()` — queries de acreedores (total pendiente + pagado del mes)
- Estados: `acreedoresTotal`, `acreedoresPagadoMes`, `acreedoresLoading`, `acreedoresDetalle`, `acreedoresPagosDetalle`
- Llamar desde `fetchDashboardData()`
- Exponer en return

### 3. Componente CreditorDebts (`desktop`)

Crear `apps/desktop/src/components/finance/CreditorDebts.tsx`:
- Lista de deudas (tabla con: fecha, nombre, valor, saldo, estado)
- Modal "Nueva Deuda" (fecha, nombre, valor)
- Modal "Registrar Abono" (monto, método de pago)
- Insert en `creditor_debts` / `creditor_payments` / `central_cash_movements`

### 4. FinancePage (`desktop`)

Modificar `apps/desktop/src/pages/FinancePage.tsx`:
- Reemplazar import y render de `<WorkerLoans />` → `<CreditorDebts />`
- Cambiar etiqueta de pestaña: "Préstamos" → "Acreedores"

### 5. CentralCash (`desktop`)

Modificar `apps/desktop/src/components/finance/CentralCash.tsx`:
- Agregar sección "🏗️ Acreedores" con 2 cards (Deuda Total, Pagado del Mes)
- Cards cliqueables → `CarteraDetailModal` con modos nuevos

### 6. Web finanzas page

Modificar `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx`:
- Agregar sección "🏗️ Acreedores" (mismas cards que desktop)

### 7. CarteraDetailModal (`shared`)

Extender `apps/shared/components/modals/CarteraDetailModal.tsx`:
- Agregar soporte para modos `"acreedores"` y `"acreedores-pagos"`

## Testing

```bash
# Push migration
cd supabase && npx supabase db push

# Desktop
cd apps/desktop && npx electron:dev
# → Finanzas → Acreedores → Crear deuda → Registrar abono
# → Caja Central → Verificar cards Acreedores

# Web
cd apps/web && npx next dev
# → /dashboard/finanzas → Verificar cards Acreedores

# Build
cd apps/desktop && npx vite build
cd apps/web && npx next build
```

## Acceptance Checklist

- [ ] Migración aplicada en Supabase
- [ ] Pestaña "Acreedores" visible en Finanzas (desktop)
- [ ] Se puede crear deuda (fecha + nombre + valor)
- [ ] Se puede registrar abono (monto + método de pago)
- [ ] Saldo pendiente se actualiza correctamente
- [ ] El abono genera egreso en Caja Central
- [ ] Cards "🏗️ Acreedores" visibles en Caja Central (desktop + web)
- [ ] Card Deuda Total abre modal con lista de acreedores
- [ ] Card Pagado del Mes abre modal con lista de abonos
- [ ] Pestaña "Préstamos" ya no existe
- [ ] WorkerLoans.tsx ya no se renderiza
- [ ] Build desktop ✅
- [ ] Build web ✅

## Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/20260619_add_creditor_tables.sql` | NEW |
| `apps/desktop/src/components/finance/CreditorDebts.tsx` | NEW |
| `apps/desktop/src/pages/FinancePage.tsx` | MODIFY |
| `apps/desktop/src/components/finance/CentralCash.tsx` | MODIFY |
| `apps/shared/hooks/useCentralCash.ts` | MODIFY |
| `apps/shared/components/modals/CarteraDetailModal.tsx` | MODIFY |
| `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` | MODIFY |
