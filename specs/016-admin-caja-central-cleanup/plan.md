# Implementation Plan: Limpieza de Caja Central y Mejora de Información de Ingresos

**Branch**: `017-admin-caja-central-cleanup` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-admin-caja-central-cleanup/spec.md`

## Summary

Dos mejoras complementarias en el sistema de limpieza de datos administrativo:

1. **Checkbox independiente de Caja Central** — Separar `central_cash_movements` del checkbox "Sesiones de caja" en el modal "Limpiar Datos". Se añade un nuevo parámetro `p_delete_central_cash` a la RPC `reset_business_data_modules`, un nuevo checkbox en los dos entry points del admin web (Configuraciones y Tenants), y se propaga el parámetro en el server action `purgeBusinessData`.

2. **Mostrar nombre de usuario en ingresos de Caja Central** — Resolver `user_id` → nombre de usuario en el hook `useCentralCash` para que cada movimiento muestre quién lo registró. Se añade un campo `user_name` al interface `CentralMovement` y se resuelve con una consulta a `profiles`.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), SQL (PL/pgSQL)

**Primary Dependencies**: React 19, Next.js 16 (web), Vite 7 + Electron 33 (desktop), Supabase JS client, Zustand 5, Tailwind CSS 3/4

**Storage**: PostgreSQL via Supabase (PostgREST + RLS), migrations en `supabase/migrations/`

**Testing**: Sin framework formal; validación manual via `pnpm build` + ejecución en Electron/Next.js

**Target Platform**: Web (Next.js SaaS portal en `/saas/*`) + Desktop (Electron — no tocado en este feature)

**Project Type**: Monorepo con `apps/web/`, `apps/desktop/`, `apps/shared/` via pnpm workspaces

**Performance Goals**: Limpieza de datos batch (no hay SLAs de latencia); mostrar nombres de usuario no debe añadir más de 1 consulta adicional

**Constraints**: La RPC `reset_business_data_modules` usa `SECURITY DEFINER` con permisos elevados; cualquier cambio debe mantener la integridad de los datos de otros módulos

**Scale/Scope**: 2 rutas web afectadas, 1 RPC modificada, 1 server action modificada, 1 hook + 1 componente compartido actualizados

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Multi-Industry Dynamism** | ✅ PASS | No hay lógica condicional por `business_type`; aplica a todos los negocios por igual |
| **II. Tenant Isolation via Supabase RLS** | ✅ PASS | La RPC filtra por `p_business_id`; el frontend solo puede limpiar datos de su propio tenant (super admin bypass intencional) |
| **III. Spec-Driven Development** | ✅ PASS | Seguimos el protocolo de 5 fases |
| **IV. Store Integrity** | ✅ PASS | `useCentralCash` hook no cambia firma pública; se añade `user_name` opcional al interface sin romper consumidores |
| **V. TypeScript Strict / Zero Shadowing** | ✅ PASS | Sin `any` nuevo; sin shadowing. Los cambios son incrementales sobre código existente |
| **Architecture: Monorepo** | ✅ PASS | Cambios en shared (hook + componente) se propagan a ambos targets |
| **Architecture: No Custom Backend** | ✅ PASS | La lógica de borrado sigue en la RPC; el frontend solo pasa parámetros |

## Project Structure

### Documentation (this feature)

```text
specs/016-admin-caja-central-cleanup/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/
├── web/
│   └── app/(saas)/saas/
│       ├── dashboard/configurations/
│       │   ├── page.tsx           # MODIFIED: añadir checkbox centralCash al modal
│       │   └── actions.ts         # MODIFIED: aceptar centralCash en purgeBusinessData
│       └── tenants/
│           └── page.tsx           # MODIFIED: añadir checkbox + pasar a RPC
├── shared/
│   ├── hooks/
│   │   └── useCentralCash.ts      # MODIFIED: resolver user_id → user_name
│   └── components/finance/
│       └── CentralCash.tsx        # MODIFIED: mostrar user_name en modal Balance Total
└── desktop/                       # NO TOCADO

supabase/
└── migrations/
    └── <timestamp>_add_central_cash_cleanup.sql   # NEW: actualizar RPC
```

**Structure Decision**: Monorepo existente con `apps/shared/` como fuente única de verdad para hooks y componentes. Las páginas admin web (`apps/web`) son independientes del desktop para este feature. La migración SQL se aplica directamente en Supabase.

## Complexity Tracking

> No violations. All gates pass.
