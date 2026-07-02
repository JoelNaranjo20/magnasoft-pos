# Tasks: Limpieza de Caja Central y Mejora de Información de Ingresos

**Input**: Design documents from `specs/016-admin-caja-central-cleanup/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No test tasks — not requested in specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project setup needed — existing monorepo already configured.

*Skipped — all infrastructure already exists.*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database migration that both US1 page entry points depend on.

**⚠️ CRITICAL**: The RPC must be updated before the pages can pass `p_delete_central_cash`.

- [x] T001 Create SQL migration in `supabase/migrations/20260625_add_central_cash_cleanup.sql` that uses `CREATE OR REPLACE FUNCTION` to add `p_delete_central_cash BOOLEAN DEFAULT FALSE` as 7th parameter, moves `DELETE FROM central_cash_movements` out of the `p_delete_cash` block into its own `IF p_delete_central_cash THEN` block, and applies the migration to Supabase.

**Checkpoint**: RPC `reset_business_data_modules` now accepts `p_delete_central_cash` — user story implementation can begin.

---

## Phase 3: User Story 1 - Borrar Caja Central desde Limpiar Datos (Priority: P1) 🎯 MVP

**Goal**: El administrador puede borrar exclusivamente los datos de Caja Central mediante un checkbox independiente en el modal "Limpiar Datos".

**Independent Test**: Ir a `/saas/dashboard/configurations` → abrir "Limpiar Datos" → ver checkbox "Caja Central (movimientos)" → marcarlo solo → confirmar → verificar que Caja Central está en ceros y otros módulos intactos.

### Implementation for User Story 1

- [x] T002 [US1] Add `centralCash?: boolean` to the options parameter of `purgeBusinessData` in `apps/web/app/(saas)/saas/dashboard/configurations/actions.ts`, and pass `p_delete_central_cash: options.centralCash || false` to the RPC call around line 484-491.

- [x] T003 [P] [US1] Add `centralCash: false` to `resetOptions` state, add checkbox `<label>` for "Caja Central (movimientos)" after the cash checkbox, update "Seleccionar Todo" to include `centralCash: true`, update validation to include `resetOptions.centralCash`, and pass `centralCash: resetOptions.centralCash` to `purgeBusinessData` in `apps/web/app/(saas)/saas/dashboard/configurations/page.tsx`.

- [x] T004 [P] [US1] Add `centralCash: false` to `resetOptions` state, add checkbox `<label>` for "Caja Central (movimientos)" after the cash checkbox, update "Seleccionar Todo" to include `centralCash: true`, update validation to include `resetOptions.centralCash`, and pass `p_delete_central_cash: resetOptions.centralCash` to `supabase.rpc('reset_business_data_modules', ...)` in `apps/web/app/(saas)/saas/tenants/page.tsx`.

**Checkpoint**: At this point, User Story 1 should be fully functional — Caja Central can be independently cleaned from both admin pages.

---

## Phase 4: User Story 2 - Ver nombre/usuario en ingresos de Caja Central (Priority: P2)

**Goal**: Cada movimiento de Caja Central muestra quién lo registró (nombre de usuario) junto al motivo.

**Independent Test**: Ir a Caja Central → Balance Total → verificar que cada movimiento muestra "Nombre de Usuario — Motivo" o "Sistema — Motivo automático".

### Implementation for User Story 2

- [x] T005 [US2] Add `user_name: string | null` field to the `CentralMovement` interface, and in `fetchMovements()` (or a helper called after fetching), collect unique non-null `user_id` values, query `profiles` table for `id, full_name`, build a `Map<string, string>` lookup, and populate `user_name` on each movement (null when `user_id` is null or profile not found) in `apps/shared/hooks/useCentralCash.ts`.

- [x] T006 [US2] In the Balance Total modal (around lines 563-639), update each movement row to show `user_name || 'Sistema'` before the description, formatted as `"Admin — Pago de nómina"` or `"Sistema — Cierre de Sesión #abc123"` in `apps/shared/components/finance/CentralCash.tsx`.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently — limpieza granular de Caja Central + nombres de usuario visibles en movimientos.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup.

- [x] T007 Build and validate both targets: run `pnpm --filter magnasoft-web build` and `pnpm --filter magnasoft-pos build` to verify no compilation errors across all modified files.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: No dependencies — SQL migration can be created and applied immediately.
- **Phase 3 (US1)**: Depends on Phase 2 (RPC must exist with new parameter). Tasks T003 and T004 are [P] — can be done in parallel (different files).
- **Phase 4 (US2)**: No dependency on Phase 3 — can run in parallel with US1 if staffed. Only depends on existing codebase. T006 depends on T005 (needs interface change first).
- **Phase 5 (Polish)**: Depends on all prior phases complete.

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Phase 2 (RPC migration). Independent of US2.
- **User Story 2 (P2)**: No phase dependencies — can start immediately, even before US1. Modifies only shared hook + component.

### Within Each User Story

- **US1**: T002 (server action) → T003 + T004 (pages, parallel)
- **US2**: T005 (hook interface + logic) → T006 (component display)

### Parallel Opportunities

- T003 and T004 (both pages) can be done in parallel — different files, same pattern.
- US1 and US2 can be implemented in parallel by different developers — completely independent code paths.

---

## Parallel Example: User Story 1

```bash
# After T002 (server action) is done, launch both pages in parallel:
Task: "Add Caja Central checkbox to configurations page in apps/web/app/(saas)/saas/dashboard/configurations/page.tsx"
Task: "Add Caja Central checkbox to tenants page in apps/web/app/(saas)/saas/tenants/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: T001 (SQL migration)
2. Complete Phase 3: T002 (server action) → T003 + T004 (pages, parallel)
3. **STOP and VALIDATE**: Test Caja Central cleanup independently from admin pages
4. Deploy/demo if ready

### Incremental Delivery

1. Phase 2 → RPC updated (foundation ready)
2. Phase 3 → Checkbox Caja Central funciona → Test → Deploy/Demo (MVP!)
3. Phase 4 → Nombres de usuario visibles → Test → Deploy/Demo
4. Phase 5 → Build validation → Listo para release

### Single Developer Strategy

Execute in order: T001 → T002 → T003 → T004 → T005 → T006 → T007

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No tests requested in spec — validation is manual via admin UI and Caja Central dashboard
