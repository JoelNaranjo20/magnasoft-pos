# Implementation Plan: Módulo de Acreedores con Integración en Caja Central

**Branch**: `015-acreedores-modulo` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/015-acreedores-modulo/spec.md`

## Summary

Crear el módulo de Acreedores que reemplaza al actual módulo de Préstamo en Finanzas. Incluye: nueva migración SQL (`creditor_debts` + `creditor_payments`), nuevo componente `CreditorDebts.tsx` para la gestión de deudas con proveedores, integración con `central_cash_movements` (pagos como egresos), cards de Acreedores en Caja Central (desktop y web), y eliminación de `WorkerLoans.tsx` de la navegación. Sin cambios en stores Zustand. Sin nuevas dependencias.

## Technical Context

**Language/Version**: TypeScript 5.4+ / React 19

**Primary Dependencies**: React 19, Zustand 5, @supabase/supabase-js, Tailwind CSS 3.4 (desktop) / 4 (web)

**Storage**: PostgreSQL (Supabase) — 2 tablas nuevas (`creditor_debts`, `creditor_payments`) + inserción en `central_cash_movements` (existente). Sin RPC nuevos.

**Testing**: Manual exploratorio en `electron:dev` + `next dev`

**Target Platform**: Electron 30+ (desktop app) + Next.js 16 (web portal)

**Project Type**: Monorepo full-stack — `apps/desktop/`, `apps/web/`, `apps/shared/`

**Performance Goals**: Lista de deudas carga en <1s, registro de abono <500ms

**Constraints**: Sin nuevas migraciones complejas. Las tablas `worker_loans`/`worker_loan_payments` se conservan intactas. Sin cambios en RLS de tablas existentes.

**Scale/Scope**: ~8 archivos modificados/creados, 1 migración SQL, 1 componente nuevo, 1 componente eliminado de navegación

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Industry Dynamism | ✅ PASS | Sin condicionales `business_type` |
| II. Tenant Isolation via RLS | ✅ PASS | Tablas nuevas con `business_id` + políticas RLS |
| III. Spec-Driven Development | ✅ PASS | Artefactos en `specs/015-...` |
| IV. Store Integrity | ✅ PASS | Sin cambios en stores Zustand |
| V. TypeScript Strict & Zero Shadowing | ✅ PASS | A verificar en implementación |
| Monorepo Structure | ✅ PASS | Cambios en shared (hook) + desktop + web |
| No Custom Backend | ✅ PASS | Solo PostgREST queries + insert |
| Zustand as Single State Manager | ✅ PASS | Sin nuevos stores |
| Styling Stack | ✅ PASS | Tailwind CSS puro |

## Project Structure

### Documentation (this feature)

```text
specs/015-acreedores-modulo/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (files to modify/create)

```text
supabase/
└── migrations/
    └── 20260619_add_creditor_tables.sql   # NEW: creditor_debts + creditor_payments tables + RLS

apps/desktop/
└── src/
    ├── components/
    │   └── finance/
    │       ├── CreditorDebts.tsx          # NEW: componente principal de gestión de acreedores
    │       └── CentralCash.tsx            # MODIFY: agregar sección Acreedores
    └── pages/
        └── FinancePage.tsx               # MODIFY: reemplazar WorkerLoans → CreditorDebts

apps/shared/
├── hooks/
│   └── useCentralCash.ts                 # MODIFY: agregar fetchCreditorData() + estados
└── components/
    └── modals/
        └── CarteraDetailModal.tsx        # MODIFY (o reutilizar): añadir modo "acreedores"

apps/web/
└── app/
    └── (dashboard)/
        └── dashboard/
            └── finanzas/
                └── page.tsx              # MODIFY: agregar sección Acreedores
```

**Structure Decision**: Monorepo con 3 packages. El componente `CreditorDebts.tsx` es desktop-only (la web solo muestra indicadores en Caja Central). El hook compartido se extiende con queries de acreedores. El modal `CarteraDetailModal` se reutiliza para acreedores (misma estructura de lista).

## Complexity Tracking

> Sin violaciones a la constitución.
