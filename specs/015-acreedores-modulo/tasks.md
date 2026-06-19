# Tasks: Módulo de Acreedores con Integración en Caja Central

**Input**: Design documents from `specs/015-acreedores-modulo/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Manual exploratorio — sin tests automatizados en esta feature.

**Organization**: Tasks grouped by user story per spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths included in descriptions

---

## Phase 1: Setup (Builds & Migration)

**Purpose**: Verificar builds actuales y crear las tablas en Supabase

- [x] T001 Verificar build desktop: `cd apps/desktop && npx vite build`
- [x] T002 [P] Verificar build web: `cd apps/web && npx next build`
- [x] T003 Crear migración SQL `supabase/migrations/20260619_add_creditor_tables.sql` — tablas `creditor_debts` (id, business_id, creditor_name, amount, remaining_amount, invoice_date, status, notes, created_at, updated_at) + `creditor_payments` (id, business_id, creditor_debt_id, amount, payment_method, notes, created_at) + índices + RLS policies
- [x] T004 Ejecutar migración en Supabase: `cd supabase && npx supabase db push`

---

## Phase 2: Foundational — Hook + CarteraDetailModal

**Purpose**: Extender `useCentralCash` con queries de acreedores y extender `CarteraDetailModal` para modos de acreedores. BLOQUEA US2/US3.

- [x] T005 Agregar interfaces `AcreedorItem` y `AcreedorPagoItem` en `apps/shared/hooks/useCentralCash.ts`
- [x] T006 [P] Agregar `fetchCreditorData()` en `apps/shared/hooks/useCentralCash.ts` — queries: `acreedoresTotal` (SUM remaining_amount WHERE status != 'paid'), `acreedoresPagadoMes` (SUM amount de creditor_payments del mes), `acreedoresDetalle` (SELECT * de creditor_debts pendientes), `acreedoresPagosDetalle` (SELECT * de creditor_payments del mes)
- [x] T007 Agregar estados `acreedoresTotal`, `acreedoresPagadoMes`, `acreedoresLoading`, `acreedoresDetalle`, `acreedoresPagosDetalle` en `apps/shared/hooks/useCentralCash.ts`. Llamar `fetchCreditorData()` desde `fetchDashboardData()`. Exponer en return.
- [x] T008 Extender `CarteraDetailModal` en `apps/shared/components/modals/CarteraDetailModal.tsx` para aceptar modos `"acreedores"` (lista de acreedores con saldo) y `"acreedores-pagos"` (lista de abonos del mes). Títulos y estilos adaptados al contexto de acreedores.

**Checkpoint**: Hook listo. Modal extendido. Datos de acreedores disponibles.

---

## Phase 3: US4 — Reemplazar Préstamo por Acreedores en navegación (Priority: P1) 🎯 MVP

**Goal**: En desktop, la pestaña "Préstamos" se reemplaza por "Acreedores" con el nuevo componente `CreditorDebts.tsx`.

**Independent Test**: Ir a Finanzas → ver pestaña "Acreedores" → lista de deudas funcional.

### Implementation for User Story 4

- [x] T009 [US4] Crear `apps/desktop/src/components/finance/CreditorDebts.tsx` — componente principal: tabla de deudas (columnas: fecha factura, acreedor, valor, saldo, estado) + botón "Nueva Deuda" + botón "Registrar Abono" en cada fila con saldo > 0
- [x] T010 [US4] Implementar modal "Nueva Deuda" dentro de `apps/desktop/src/components/finance/CreditorDebts.tsx` — campos: fecha factura (input date), nombre (input text), valor (input number). Insert en `creditor_debts`.
- [x] T011 [US4] Implementar modal "Registrar Abono" dentro de `apps/desktop/src/components/finance/CreditorDebts.tsx` — campos: monto (input number), método de pago (efectivo/transferencia). Insert en `creditor_payments` + UPDATE `creditor_debts.remaining_amount` y `status` + INSERT en `central_cash_movements` como egreso.
- [x] T012 [US4] Validaciones en `apps/desktop/src/components/finance/CreditorDebts.tsx`: abono no puede exceder saldo pendiente, deuda pagada no permite nuevos abonos, campos requeridos no vacíos.
- [x] T013 [US4] Modificar `apps/desktop/src/pages/FinancePage.tsx` — reemplazar import de `WorkerLoans` por `CreditorDebts`, cambiar etiqueta "Préstamos" → "Acreedores", cambiar ícono si aplica.

**Checkpoint**: Módulo de Acreedores funcional en desktop. Se pueden crear deudas y registrar abonos.

---

## Phase 4: US1 — Registrar deuda con acreedor (Priority: P1)

**Goal**: El usuario puede registrar una deuda con fecha de factura, nombre del acreedor, y valor. La deuda aparece en la lista.

> **Note**: US1 y US4 comparten el mismo componente. US4 crea la estructura; US1 es la funcionalidad de crear deuda que ya está implementada en T010. Esta fase verifica y pule esa funcionalidad.

### Implementation for User Story 1

- [x] T014 [US1] Verificar y pulir flujo de creación de deuda en `apps/desktop/src/components/finance/CreditorDebts.tsx` — fecha default hoy, limpiar campos tras crear, feedback visual (toast o animación), recargar lista automáticamente.
- [x] T015 [US1] Agregar filtro por estado (pendiente/parcial/pagado) y búsqueda por nombre en `apps/desktop/src/components/finance/CreditorDebts.tsx`.

**Checkpoint**: Flujo de creación de deuda pulido y completo.

---

## Phase 5: US2 — Registrar abono a una deuda (Priority: P1)

**Goal**: El usuario selecciona una deuda y registra un abono parcial. El saldo se reduce y se crea un egreso en Caja Central.

> **Note**: La funcionalidad base de abono ya está en T011. Esta fase verifica la integración con Caja Central.

### Implementation for User Story 2

- [x] T016 [US2] Verificar integridad transaccional en `apps/desktop/src/components/finance/CreditorDebts.tsx` — confirmar que el INSERT en `creditor_payments`, UPDATE de `creditor_debts`, e INSERT en `central_cash_movements` se ejecutan correctamente. Si alguna falla, mostrar error claro.
- [x] T017 [US2] Agregar historial de abonos visible en `apps/desktop/src/components/finance/CreditorDebts.tsx` — al hacer clic en una deuda, mostrar lista de abonos realizados (fecha, monto, método de pago).

**Checkpoint**: Abonos funcionales con egreso en Caja Central e historial visible.

---

## Phase 6: US3 — Card de Acreedores en Caja Central (Priority: P2)

**Goal**: En Caja Central (desktop + web), sección "🏗️ Acreedores" con Deuda Total + Pagado del Mes cliqueables.

**Independent Test**: Abrir Caja Central → ver sección Acreedores con totales correctos → clic abre modal.

### Implementation for User Story 3

- [x] T018 [US3] Agregar sección "🏗️ Acreedores" con 2 cards en `apps/desktop/src/components/finance/CentralCash.tsx` — Deuda Total (usa `acreedoresTotal`) y Pagado del Mes (usa `acreedoresPagadoMes`). Cards cliqueables → `CarteraDetailModal` con modos `"acreedores"` y `"acreedores-pagos"`.
- [x] T019 [P] [US3] Agregar sección "🏗️ Acreedores" con 2 cards en `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` — misma implementación que T018 usando los mismos datos del hook.
- [x] T020 [US3] Verificar que las cards de Acreedores se actualizan tras registrar un abono (datos en tiempo real). Refrescar `fetchCreditorData()` tras cambios.

**Checkpoint**: Cards de Acreedores visibles y funcionales en desktop + web.

---

## Phase 7: Polish & Build Verification

**Purpose**: Builds finales, verificación de eliminación de WorkerLoans, limpieza

- [x] T021 Ejecutar build desktop: `cd apps/desktop && npx vite build` — cero errores
- [x] T022 [P] Ejecutar build web: `cd apps/web && npx next build` — cero errores
- [x] T023 Verificar en `electron:dev`: pestaña "Acreedores" visible, crear deuda, registrar abono, verificar egreso en Caja Central, verificar cards Acreedores en Caja Central
- [x] T024 Confirmar que `WorkerLoans.tsx` ya no se renderiza en ninguna ruta — buscar referencias residuales en `apps/desktop/src/`
- [x] T025 Limpiar imports no usados en `apps/desktop/src/pages/FinancePage.tsx` y `apps/desktop/src/components/finance/CreditorDebts.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — builds + migración
- **Foundational (Phase 2)**: Depende de Phase 1 (migración aplicada) — BLOQUEA US2/US3
- **US4 (Phase 3)**: Depende de Phase 2 — crea CreditorDebts.tsx y modifica FinancePage
- **US1 (Phase 4)**: Depende de US4 — pule el flujo de creación ya implementado en T010
- **US2 (Phase 5)**: Depende de US4 — pule el flujo de abono ya implementado en T011
- **US3 (Phase 6)**: Depende de Phase 2 — cards en Caja Central (no depende de US4 directamente, pero se beneficia de tener datos reales)
- **Polish (Phase 7)**: Depende de US1+US2+US3+US4

### User Story Dependencies

- **US4 (P1)**: Depende de Phase 2. Crea el componente base. Independiente.
- **US1 (P1)**: Depende de US4. Mismo componente, pule creación.
- **US2 (P1)**: Depende de US4. Mismo componente, pule abonos.
- **US3 (P2)**: Depende de Phase 2. Independiente de US1/US2/US4.

### Within Each Phase

- T001 + T002: builds en paralelo ✅
- T005 + T006: interfaces + función en paralelo (mismo archivo pero funciones distintas) ✅
- T018 + T019: desktop + web en paralelo ✅
- T021 + T022: builds finales en paralelo ✅

### Parallel Opportunities

```text
Phase 1:
  T001 [P] build desktop  ←→  T002 [P] build web
  T003 → T004 (secuencial: crear migración → push)

Phase 2:
  T005 [P] interfaces  ←→  T006 [P] fetchCreditorData  (dos secciones del mismo archivo)
  T007 → T008 (secuencial: hook necesita estar listo antes del modal)

Phase 3 (US4):
  T009 → T010 → T011 → T012 → T013 (secuencial: mismo componente)

Phase 6 (US3):
  T018 [P] desktop  ←→  T019 [P] web  (archivos distintos)

Phase 7:
  T021 [P] desktop build  ←→  T022 [P] web build
```

---

## Implementation Strategy

### MVP First (US4 Only)

1. Phase 1: Setup (migración aplicada) ✅
2. Phase 2: Foundational (hook + modal extendido) ✅
3. Phase 3: US4 (CreditorDebts + FinancePage) ✅
4. **STOP**: Módulo de Acreedores funcional en desktop.

### Incremental Delivery

1. Setup + Foundational → Base de datos lista, hook listo
2. US4 → Acreedores reemplaza Préstamo en navegación (MVP!)
3. US1 → Creación de deudas pulida con filtros
4. US2 → Abonos con integración Caja Central verificada
5. US3 → Cards Acreedores en Caja Central (desktop + web)
6. Polish → Builds y limpieza

### MVP Scope

→ Phase 1 + Phase 2 + Phase 3 (13 tareas): Módulo de Acreedores funcional con navegación reemplazada.

---

## Notes

- Sin RPC nuevos. Los inserts/updates se hacen directo desde el frontend con `supabase.from().insert/update`.
- Las tablas `worker_loans` y `worker_loan_payments` NO se tocan. Se conservan intactas.
- `WorkerLoans.tsx` ya no se importa ni renderiza, pero el archivo puede conservarse en disco (no se borra).
- El modal `CarteraDetailModal` se reutiliza con modos nuevos. No se crea un modal separado.
- Los pagos a acreedores siempre son egresos. No hay opción de ingreso.
- El diseño de las cards sigue el mismo patrón que Cartera (2 cards en grid).
