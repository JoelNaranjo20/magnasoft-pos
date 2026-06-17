# Implementation Plan: Mejoras Transversales — Inventario, Puntos, Caja Central

**Branch**: `012-cross-cutting-improvements` | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

## Summary

Tres mejoras independientes:
1. **Consumo Interno de Inventario**: Registrar egreso en `cash_movements` con costo promedio de compra + descuento de stock.
2. **Vencimiento de Puntos**: Si un cliente no acumula ni canjea en 6 meses, todos sus puntos expiran. Actividad reinicia contador.
3. **Caja Central 2 Columnas**: Reescribir `CentralCashHistoryModal` con ingresos efectivo/transferencia lado a lado, egresos, categorías, analytics de servicios.

## Technical Context

**Language/Version**: TypeScript 5.7 strict

**Primary Dependencies**: React 19, Zustand, Supabase client, Tailwind 3.4/4, Vite 6, Next.js 16, date-fns

**Storage**: PostgreSQL via Supabase. Tablas afectadas: `products`, `inventory_movements`, `cash_movements`, `customer_loyalty_points` (posible nueva), `central_cash_movements`

**Testing**: Manual via `electron:dev` + `pnpm dev`

**Target Platform**: Electron 30+ (Windows) + Next.js 16 (browser)

**Project Type**: Monorepo — `apps/shared/` + `apps/desktop/` + `apps/web/`

**Constraints**: Sin backend propio. Sin nuevas migraciones complejas. Reutilizar hook existente.

**Scale/Scope**: 1 nueva migración (puntos), 1 modal modificado (history), 1 modal nuevo (consumo interno). ~400 líneas nuevas totales.

## Constitution Check

| Principle | Check | Status |
|-----------|-------|--------|
| I. Multi-Industry | Sin condicionales `business_type` | ✅ |
| II. Tenant Isolation | `business_id` en todas las queries | ✅ |
| III. Spec-Driven | Artefactos en `specs/012/` | ✅ |
| IV. Store Integrity | Sin cambios a stores existentes | ✅ |
| V. TS Strict | Sin `any` nuevo, sin shadowing | ✅ |
| Monorepo | Shared → desktop + web | ✅ |
| No Custom Backend | Solo PostgREST + migración SQL | ✅ |

**Gate**: ✅ ALL PASS

## Project Structure

```text
supabase/migrations/
└── 20260615_add_loyalty_points.sql        # NEW — tabla customer_loyalty_points

apps/shared/
├── hooks/useCentralCash.ts                 # EXTEND — serviceSalesCount para US3
├── components/modals/
│   └── CentralCashHistoryModal.tsx          # REWRITE — 2 columnas (US3)

apps/desktop/src/
├── components/finance/
│   ├── CentralCash.tsx                      # UPDATE — conectar nuevo modal
│   └── InventoryInternalConsumptionModal.tsx # NEW — modal consumo interno (US1)
└── components/inventory/
    └── InventoryManager.tsx                 # UPDATE — botón "Consumo Interno"

apps/web/app/(dashboard)/dashboard/finanzas/
└── page.tsx                                 # UPDATE — íbidem
```

## Phases

### Phase 0: Research → `research.md`

### Phase 1: Design → `data-model.md`, `quickstart.md`

### Phase 2: Tasks → `/speckit-tasks`
