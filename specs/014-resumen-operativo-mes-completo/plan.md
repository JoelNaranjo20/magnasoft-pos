# Implementation Plan: Resumen Operativo Completo por Mes en Caja Central

**Branch**: `014-resumen-operativo-mes-completo` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-resumen-operativo-mes-completo/spec.md`

## Summary

Refactorizar el "Resumen Operativo" de Caja Central: reemplazar los acordeones actuales por una tabla jerárquica de 3 niveles (Año → Mes → Detalle) con Total General sticky al pie. Las queries de servicios y bonos se refactorizan para devolver datos de todos los meses de una sola vez. Sin migraciones SQL — solo cambios en el hook compartido y los componentes de UI.

## Technical Context

**Language/Version**: TypeScript 5.4+ / React 19

**Primary Dependencies**: React 19, Zustand 5, @supabase/supabase-js, Tailwind CSS 3.4 (desktop) / 4 (web)

**Storage**: PostgreSQL (Supabase) — solo lecturas de `sales`, `sale_items`, `services`, `central_cash_movements`. Sin nuevas tablas ni migraciones.

**Testing**: Manual exploratorio en `electron:dev` + `next dev`

**Target Platform**: Electron 30+ (desktop app) + Next.js 16 (web portal)

**Project Type**: Monorepo full-stack — `apps/desktop/`, `apps/web/`, `apps/shared/`

**Performance Goals**: Vista inicial <3s, expandir nivel <200ms, hasta 60 meses sin degradación

**Constraints**: Sin nuevas migraciones, sin nuevos endpoints RPC, RLS existente suficiente

**Scale/Scope**: 3 archivos modificados, 0 archivos nuevos de código, ~200 líneas cambiadas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Industry Dynamism | ✅ PASS | Sin condicionales `business_type` |
| II. Tenant Isolation via RLS | ✅ PASS | Filtros vía `sales.business_id`; RLS heredado |
| III. Spec-Driven Development | ✅ PASS | Artefactos en `specs/014-...` |
| IV. Store Integrity | ✅ PASS | Sin cambios en stores Zustand |
| V. TypeScript Strict & Zero Shadowing | ✅ PASS | A verificar en implementación |
| Monorepo Structure | ✅ PASS | Cambios en shared (hook) + desktop + web |
| No Custom Backend | ✅ PASS | Solo PostgREST queries existentes |
| Zustand as Single State Manager | ✅ PASS | Sin nuevos stores |
| Styling Stack | ✅ PASS | Tailwind CSS puro |

## Project Structure

### Documentation (this feature)

```text
specs/014-resumen-operativo-mes-completo/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (files to modify)

```text
apps/shared/
└── hooks/
    └── useCentralCash.ts          # MODIFY: funciones multi-mes + computeMonthlyTable()

apps/desktop/
└── src/
    └── components/
        └── finance/
            └── CentralCash.tsx    # MODIFY: acordeones → tabla 3 niveles

apps/web/
└── app/
    └── (dashboard)/
        └── dashboard/
            └── finanzas/
                └── page.tsx      # MODIFY: mismo cambio que desktop
```

**Structure Decision**: Monorepo con 3 packages. El hook compartido es la fuente única de datos. Desktop y web renderizan la misma tabla con los mismos datos del hook. Sin nuevos archivos de componentes — la tabla se implementa inline.

## Complexity Tracking

> Sin violaciones a la constitución. No se requiere justificación.
