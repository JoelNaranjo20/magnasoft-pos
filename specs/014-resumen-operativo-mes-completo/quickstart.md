# Quickstart: Resumen Operativo Completo por Mes

**Feature**: 014-resumen-operativo-mes-completo
**Date**: 2026-06-18

## Prerequisites

- Supabase project running (local or remote)
- pnpm installed
- Environment variables set in `apps/desktop/.env.local` and `apps/web/.env.local`

## Quick Overview

Esta feature es un **refactor de UI + hook** — sin migraciones, sin nuevas tablas, sin cambios en el esquema Supabase.

### Archivos a modificar

| File | Change |
|------|--------|
| `apps/shared/hooks/useCentralCash.ts` | Refactorizar `fetchBonosData`/`fetchVentasServiciosData` para multi-mes; agregar `computeMonthlyTable()` |
| `apps/desktop/src/components/finance/CentralCash.tsx` | Reemplazar acordeones por tabla 3 niveles |
| `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` | Mismo cambio que desktop |

### Sin cambios en

- ❌ Supabase (sin migraciones)
- ❌ Modales existentes (BonosDetalleModal, VentasServiciosDetalleModal, etc.)
- ❌ Cards del dashboard
- ❌ Zustand stores

## Development Steps

1. **Modificar hook** (`useCentralCash`):
   - Renombrar `fetchBonosData` → `fetchBonosDataForMonth(monthKey)`: acepta rango de fechas
   - Renombrar `fetchVentasServiciosData` → `fetchVentasServiciosForMonth(monthKey)`: acepta rango de fechas
   - Nuevo `fetchAllMonthsData()`: itera sobre todos los meses con datos, consolida
   - Nuevo `computeMonthlyTable()`: agrupa en `YearGroup[]` + `GeneralTotal`
   - Las funciones originales se convierten en wrappers: `fetchBonosData()` → `fetchBonosDataForMonth(currentMonthRange().key)`

2. **Modificar UI desktop** (`CentralCash.tsx`):
   - Reemplazar `monthlyBreakdown.map(...)` con tabla de años
   - Estado: `expandedYears: Set<number>`, `expandedMonth: string | null`
   - Filas de año: cliqueables para expandir/colapsar meses
   - Filas de mes: cliqueables para expandir/colapsar detalle N3
   - Total General: `sticky bottom-0`

3. **Replicar en web** (`finanzas/page.tsx`):
   - Mismo componente de tabla, mismos estados
   - Misma estructura de datos del hook

## Testing

```bash
# Desktop
cd apps/desktop && npx electron:dev
# → Navegar a "Caja Central" → Verificar tabla con años
# → Expandir un año → Ver meses
# → Expandir un mes → Ver detalle N3
# → Verificar Total General sticky

# Web
cd apps/web && npx next dev
# → /dashboard/finanzas → Misma tabla

# Build
cd apps/desktop && npx vite build
cd apps/web && npx next build
```

## Acceptance Checklist

- [ ] Tabla muestra años colapsados + Total General al cargar
- [ ] Al expandir año, aparecen todos sus meses con datos correctos
- [ ] Al expandir mes, aparece detalle N3 con ingresos/egresos/servicios/bonos
- [ ] Varios años expandidos simultáneamente
- [ ] Solo un detalle de mes expandido a la vez
- [ ] Colapsar año oculta todo su contenido
- [ ] Total General sticky al hacer scroll
- [ ] Cards de Bonos y Ventas Servicios sin cambios
- [ ] Build desktop ✅
- [ ] Build web ✅
