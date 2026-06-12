# Implementation Plan: Modales Drill-Down de Caja Central

**Branch**: `011-central-cash-drilldown` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

## Summary

Agregar drill-down a los KPIs del dashboard de Caja Central. Cada KPI cliqueable abre un modal con detalle:
- **Efectivo/Transferencia**: desglose de ingresos/egresos del mes filtrados por método de pago.
- **Egresos**: ya existe (`CashDashboardDetailModal`) — sin cambios.
- **Liquidaciones**: ya existe (`CashDashboardDetailModal`) — se enriquece con más datos.
- **Nómina**: modal nuevo con dos secciones: Nómina Semanal (asalariados) + Liquidaciones Diarias (comisionistas).
- **Cartera**: modal nuevo con 3 modos (Total / Recuperación Efectivo / Recuperación Transferencia).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)

**Primary Dependencies**: React 19, Zustand, Supabase client, Tailwind CSS 3.4 (desktop) / 4 (web), Vite 6 (desktop), Next.js 16 (web)

**Storage**: PostgreSQL via Supabase/PostgREST. Tablas: `central_cash_movements`, `worker_commissions`, `workers`, `customer_debts`, `debt_payments`, `customers`

**Testing**: Manual via `electron:dev` + `pnpm dev`

**Target Platform**: Electron 30+ (Windows) + Next.js 16 (browser). Shared en `apps/shared/`.

**Project Type**: Monorepo — desktop + web + shared

**Performance Goals**: Modal abre <1s. Total modal = KPI del dashboard.

**Constraints**: Sin backend propio. Sin migraciones SQL. Sin nuevas tablas.

**Scale/Scope**: 3 modales nuevos + 1 extendido. ~600 líneas totales. 10 nuevas queries (livianas, sobre índices existentes).

## Constitution Check

| Principle | Check | Status |
|-----------|-------|--------|
| **I. Multi-Industry** | Sin condicionales `business_type`. Modales genéricos. | ✅ |
| **II. Tenant Isolation** | Queries heredan `business_id`. | ✅ |
| **III. Spec-Driven** | Artefactos en `specs/011-central-cash-drilldown/`. | ✅ |
| **IV. Store Integrity** | Hook extendido sin romper contratos existentes. | ✅ |
| **V. TS Strict** | Sin `any` nuevo. Sin shadowing. | ✅ |
| **Monorepo** | Shared → desktop + web. Sin dependencias inversas. | ✅ |
| **No Custom Backend** | Solo SELECTs PostgREST. | ✅ |

**Gate**: ✅ ALL PASS

## Project Structure

```text
apps/shared/
├── hooks/useCentralCash.ts                    # EXTEND: datos para modales nuevos
├── components/modals/
│   ├── CashDashboardDetailModal.tsx           # EXTEND: acepta ingresos + egresos (no solo egresos)
│   ├── EfectivoTransferenciaDetailModal.tsx   # NEW — drill-down Efectivo/Transferencia
│   ├── NominaDetailModal.tsx                  # NEW — nómina semanal + liquidaciones diarias
│   └── CarteraDetailModal.tsx                 # NEW — cartera 3 modos

apps/desktop/src/components/finance/
└── CentralCash.tsx                            # UPDATE: conectar KPIs a nuevos modales

apps/web/app/(dashboard)/dashboard/finanzas/
└── page.tsx                                   # UPDATE: íbidem
```

## Phases

### Phase 0: Research → `research.md`

### Phase 1: Design → `data-model.md`, `quickstart.md`

### Phase 2: Tasks → `tasks.md` (via `/speckit-tasks`)
