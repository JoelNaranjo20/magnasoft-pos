# Implementation Plan: Dashboard Financiero de Caja Central

**Branch**: `010-central-cash-dashboard` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-central-cash-dashboard/spec.md`

## Summary

Reemplazar la vista actual de Caja Central (3 pestañas + formulario siempre visible + acordeones mensuales) por un dashboard financiero de 2 columnas. Columna izquierda: Balance Total (KPI grande), Efectivo, Transferencia, botón "+ Nuevo Movimiento". Columna derecha: Resumen Operativo (Total Servicios, Egresos, Liquidaciones + "Ver Historial"), Cartera (Cartera Total, Recuperación Efectivo, Recuperación Transferencia), Total Nómina. Cada KPI cliqueable abre modal con detalle. El historial mensual existente se mueve a modal. Se respeta el sistema de módulos para ocultar cards según configuración del negocio.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)

**Primary Dependencies**: React 19, Zustand 4-5, Supabase client SDK, Tailwind CSS 3.4 (desktop) / 4 (web), Vite 6 (desktop), Next.js 16 (web), date-fns

**Storage**: PostgreSQL via Supabase/PostgREST. Tablas: `central_cash_movements`, `sales`, `sale_items`, `services`, `products`, `categories`, `customer_debts`, `debt_payments`, `worker_commissions`, `workers`, `cash_sessions`, `business_config`

**Testing**: Manual testing via `electron:dev` (desktop), `pnpm dev` (web). No automated test suite.

**Target Platform**: Electron 30+ (Windows desktop) + Next.js 16 (web browser). Shared hook en `apps/shared/`.

**Project Type**: Monorepo (pnpm workspaces) — desktop app (Vite + Electron) + web app (Next.js) + shared logic package

**Performance Goals**: Dashboard carga todos los KPIs en <3s. Modal de detalle abre en <1s.

**Constraints**: Sin backend propio. Toda lógica de negocio en frontend + PostgreSQL RPC/triggers. Tipado estricto (`no any`). Cero shadowing de variables. Arquitectura multi-tenant via `business_id` RLS.

**Scale/Scope**: ~10 queries por carga de dashboard (paralelizables). 7 cards/KPIs. 4 modales. Desktop + web idénticos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| **I. Multi-Industry Dynamism** | Cards se ocultan vía `useModule()` — sin condicionales por `business_type` | ✅ PASS |
| **II. Tenant Isolation** | Todas las queries heredan `business_id` del store → RLS. Sin cross-tenant | ✅ PASS |
| **III. Spec-Driven Development** | Artefactos completos en `specs/010-central-cash-dashboard/` | ✅ PASS |
| **IV. Store Integrity** | Hook `useCentralCash` se extiende sin cambiar contratos existentes. Se verifican consumidores (desktop `CentralCash.tsx`, web `finanzas/page.tsx`, `CloseSessionModal.tsx`) | ✅ PASS |
| **V. TypeScript Strict** | Sin `any` (salvo wrappers Supabase existentes con `@ts-nocheck`). Sin shadowing | ✅ PASS |
| **Monorepo** | Cambios en `apps/shared/`, `apps/desktop/`, `apps/web/`. Shared no depende de desktop/web | ✅ PASS |
| **No Custom Backend** | Sin servidor nuevo. Datos nuevos vía consultas PostgREST directas | ✅ PASS |
| **Zustand** | Sin nuevo estado global. Hook existente extendido | ✅ PASS |
| **Styling Stack** | Tailwind + CSS vanilla para animaciones. Sin librerías UI externas | ✅ PASS |

**Gate Result**: ✅ ALL PASS — proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/010-central-cash-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/shared/
├── hooks/
│   └── useCentralCash.ts          # EXTEND: nuevos campos (totalServicios, carteraTotal, etc.)
├── components/
│   └── modals/
│       ├── CategorySalesModal.tsx  # REUSE (existing, for Total Servicios detail)
│       ├── CentralCashHistoryModal.tsx   # NEW — acordeones mensuales en modal
│       └── CashDashboardDetailModal.tsx  # NEW — modal genérico de detalle (Egresos, Liquidaciones)

apps/desktop/src/
├── components/
│   └── finance/
│       ├── CentralCash.tsx               # REPLACE — nuevo dashboard 2 columnas
│       └── CentralCashMovementModal.tsx   # NEW — formulario ingreso/egreso en modal
├── hooks/
│   └── useCentralCash.ts                 # UNCHANGED — re-export from shared

apps/web/app/
├── (dashboard)/dashboard/finanzas/
│   └── page.tsx                          # REPLACE — mismo dashboard adaptado a Next.js
├── hooks/
│   └── useCentralCash.ts                 # UNCHANGED — re-export from shared
```

**Structure Decision**: Monorepo existente con 3 packages. La feature extiende el hook compartido `useCentralCash` en `apps/shared/` con nuevos campos computados. Desktop y web re-exportan y consumen el mismo hook. El componente principal `CentralCash.tsx` (desktop) se reescribe completamente como dashboard. Web copia el layout con adaptaciones Next.js.

## Complexity Tracking

Sin violaciones a la constitución. Sin justificaciones requeridas.

## Plan Phases

### Phase 0: Research → `research.md`

- [x] Resolver: Cálculo de Total Servicios desde `sales` + `sale_items` (optimización de queries, batch vs single)
- [x] Resolver: Consulta de cartera (global vs mes, método de pago)
- [x] Resolver: Integración con sistema de módulos (`useModule`)
- [x] Resolver: Estrategia de migración — cómo reemplazar la vista actual sin romper referencias
- [x] Resolver: Estados de carga y error (skeleton por KPI, Promise.allSettled)
- [x] Resolver: Reutilización de `fetchCategorySales`

### Phase 1: Design → `data-model.md`, `quickstart.md`

- [x] Definir interfaces TypeScript nuevas/extendidas
- [x] Definir contratos de componentes (props de modales)
- [x] Definir flujo de carga de datos (queries paralelizables)
- [x] Actualizar CLAUDE.md con referencia al nuevo plan

### Phase 2: Tasks → `tasks.md` (via `/speckit-tasks`)

- [ ] Desglose en fases de implementación
- [ ] Tareas secuenciadas con IDs, marcadores [P], y paths exactos
