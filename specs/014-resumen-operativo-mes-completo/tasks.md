# Tasks: Resumen Operativo Completo por Mes en Caja Central

**Input**: Design documents from `specs/014-resumen-operativo-mes-completo/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Manual exploratorio — sin tests automatizados en esta feature.

**Organization**: Tasks grouped by user story per spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in descriptions

---

## Phase 1: Setup

**Purpose**: Verificar que los builds actuales compilan antes de modificar nada

- [x] T001 Verificar build desktop: `cd apps/desktop && npx vite build`
- [x] T002 [P] Verificar build web: `cd apps/web && npx next build`

---

## Phase 2: Foundational — Refactor del Hook (Multi-Mes)

**Purpose**: Refactorizar `fetchBonosData` y `fetchVentasServiciosData` para aceptar rangos de fecha arbitrarios. Crear `computeMonthlyTable()` que consolida todos los datos en `YearGroup[]` + `GeneralTotal`. BLOQUEA US1/US2/US3.

**⚠️ CRITICAL**: Sin esta fase, ninguna UI puede mostrar datos multi-mes.

- [x] T003 Crear interfaces `MonthlyTableRow`, `YearGroup`, `GeneralTotal` en `apps/shared/hooks/useCentralCash.ts`
- [x] T004 [P] Refactorizar `fetchBonosData()` → `fetchBonosDataForMonth(monthKey: string)` en `apps/shared/hooks/useCentralCash.ts` — parametrizar rango de fechas en vez de usar siempre `currentMonthRange()`. Mantener wrapper `fetchBonosData()` que llama `fetchBonosDataForMonth(currentMonthRange().key)` para no romper las cards existentes.
- [x] T005 [P] Refactorizar `fetchVentasServiciosData()` → `fetchVentasServiciosForMonth(monthKey: string)` en `apps/shared/hooks/useCentralCash.ts` — igual que T004 pero para servicios facturados. Mantener wrapper `fetchVentasServiciosData()`.
- [x] T006 [P] Agregar helper `getAllMonthKeys()` en `apps/shared/hooks/useCentralCash.ts` — detecta todos los meses con datos (desde la primera venta completada hasta el mes actual) consultando `sales.created_at` mínimo.
- [x] T007 Crear `computeMonthlyTable()` en `apps/shared/hooks/useCentralCash.ts` — itera sobre todos los monthKeys, obtiene datos de `monthlyBreakdown` (ya existente) + `fetchBonosDataForMonth` + `fetchVentasServiciosForMonth` en paralelo con `Promise.allSettled`, y consolida en `{ yearGroups: YearGroup[], generalTotal: GeneralTotal }`.
- [x] T008 Exponer `monthlyTableData` (`{ yearGroups, generalTotal }`) y `tableLoading` en el return de `useCentralCash` en `apps/shared/hooks/useCentralCash.ts`. Ejecutar `computeMonthlyTable()` desde `fetchDashboardData()`.

**Checkpoint**: Hook listo. Datos multi-mes disponibles para las UIs.

---

## Phase 3: User Story 1 — Tabla de Años + Total General (Priority: P1) 🎯 MVP

**Goal**: Reemplazar los acordeones actuales por una tabla donde cada fila es un año (colapsada por defecto) con columnas: Año, Ingresos, Egresos, Neto, Bonos, Servicios. Al pie, Total General sticky siempre visible.

**Independent Test**: Abrir Caja Central → ver filas de años colapsadas + Total General. Sin meses visibles hasta expandir año.

### Implementation for User Story 1

- [x] T009 [US1] Reemplazar `monthlyBreakdown.map(...)` en `apps/desktop/src/components/finance/CentralCash.tsx` por tabla de años usando `monthlyTableData.yearGroups` — cada fila = año con columnas Año, Ingresos, Egresos, Neto, Bonos, Servicios. Años colapsados por defecto. Ícono ▶/▼ para indicar expandible.
- [x] T010 [US1] Agregar estado `expandedYears: Set<number>` en `apps/desktop/src/components/finance/CentralCash.tsx` — toggle año expande/colapsa el Set. Varios años expandibles a la vez.
- [x] T011 [US1] Agregar fila de Total General sticky al pie de la tabla en `apps/desktop/src/components/finance/CentralCash.tsx` — `position: sticky; bottom: 0` con `bg-white dark:bg-slate-900`. Muestra `generalTotal.ingresos`, `.egresos`, `.neto`, `.bonos`, `.servicios`.
- [x] T012 [P] [US1] Replicar tabla de años + Total General en `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` — mismo componente que T009-T011 usando `monthlyTableData` del hook.

**Checkpoint**: Vista N1 funcional. Años colapsados + Total General visible.

---

## Phase 4: User Story 2 — Expandir Año → Meses (Priority: P1)

**Goal**: Al hacer clic en un año, se expanden los meses debajo con sus 6 columnas de datos. Varios años expandidos simultáneamente.

**Independent Test**: Clic en año → ver meses. Clic en otro año → ambos expandidos. Clic de nuevo → colapsa.

### Implementation for User Story 2

- [x] T013 [US2] Agregar filas de meses inline debajo del año expandido en `apps/desktop/src/components/finance/CentralCash.tsx` — iterar `yearGroup.months`, renderizar fila por mes con columnas Mes, Ingresos, Egresos, Neto, Bonos, Servicios. Meses con indentación visual (padding-left) y fondo ligeramente distinto.
- [x] T014 [P] [US2] Replicar expansión de año → meses en `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx`.

**Checkpoint**: Vista N2 funcional. Años expandidos muestran sus meses.

---

## Phase 5: User Story 3 — Expandir Mes → Detalle (Priority: P2)

**Goal**: Al hacer clic en un mes, se despliega debajo el detalle N3: lista de ingresos efectivo, ingresos transferencia, egresos, servicios vendidos, bonos canjeados. Solo un mes expandido a la vez.

**Independent Test**: Expandir año, clic en mes → detalle N3 debajo. Clic en otro mes → el anterior se colapsa.

### Implementation for User Story 3

- [x] T015 [US3] Agregar estado `expandedMonth: string | null` en `apps/desktop/src/components/finance/CentralCash.tsx` — toggle mes expande/colapsa. Solo uno a la vez (si ya hay uno expandido, se colapsa antes de expandir el nuevo).
- [x] T016 [US3] Renderizar detalle N3 debajo del mes expandido en `apps/desktop/src/components/finance/CentralCash.tsx` — 5 secciones: 💰 Ingresos Efectivo (lista de `monthRow.cashIngresos`), 🏦 Ingresos Transferencia (lista de `monthRow.transferIngresos`), 📤 Egresos (lista de `monthRow.egresosDetalle`), 📊 Servicios Vendidos (lista de `monthRow.serviciosDetalle` con nombre + cantidad + $), 🎁 Bonos Canjeados (lista de `monthRow.bonosDetalle` con servicio + cliente + $). Cada sección en un mini-card con scroll interno si es necesario.
- [x] T017 [US3] Al colapsar un año, limpiar `expandedMonth` si el mes pertenece a ese año en `apps/desktop/src/components/finance/CentralCash.tsx`.
- [x] T018 [P] [US3] Replicar detalle N3 en `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` — mismo comportamiento que T015-T017.

**Checkpoint**: Tabla 3 niveles completa. Todo el feature funcional.

---

## Phase 6: Polish & Build Verification

**Purpose**: Builds finales, verificación visual, limpieza

- [x] T019 Ejecutar build desktop: `cd apps/desktop && npx vite build` — cero errores
- [x] T020 [P] Ejecutar build web: `cd apps/web && npx next build` — cero errores
- [x] T021 Verificar en `electron:dev`: tabla carga con años colapsados, expandir/colapsar funciona, Total General sticky, datos coinciden con modales existentes
- [x] T022 Limpiar imports no usados y código muerto de acordeones viejos en `apps/desktop/src/components/finance/CentralCash.tsx` y `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — verifica builds actuales
- **Foundational (Phase 2)**: Depende de Setup — BLOQUEA todos los user stories
- **US1 (Phase 3)**: Depende de Phase 2 — tabla base con años
- **US2 (Phase 4)**: Depende de US1 — expansión de meses
- **US3 (Phase 5)**: Depende de US2 — detalle del mes
- **Polish (Phase 6)**: Depende de US1+US2+US3

### User Story Dependencies

- **US1 (P1)**: Independiente — se puede testear solo con años + Total General
- **US2 (P1)**: Depende de US1 — se construye sobre la tabla de US1
- **US3 (P2)**: Depende de US2 — se construye sobre los meses de US2

### Within Each Phase

- T004 + T005 + T006 pueden ejecutarse en paralelo (distintas funciones en el hook)
- T009 + T012 (desktop y web US1) pueden ejecutarse en paralelo
- T013 + T014 (desktop y web US2) pueden ejecutarse en paralelo
- T016 + T018 (desktop y web US3) pueden ejecutarse en paralelo

### Parallel Opportunities

```text
Phase 2 (Hook):
  T004 [P] fetchBonosDataForMonth
  T005 [P] fetchVentasServiciosForMonth
  T006 [P] getAllMonthKeys
  ── todas funciones distintas, sin conflicto de archivo ──
  T007 depende de T004+T005+T006
  T008 depende de T007

Phase 3+4+5 (UI):
  Desktop y Web pueden implementarse en paralelo en cada fase
  T009 ↔ T012, T013 ↔ T014, T016 ↔ T018
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1: Setup ✅
2. Phase 2: Foundational (hook refactor) ✅
3. Phase 3: US1 — Tabla de años + Total General ✅
4. **STOP**: Vista de años funcional. Se puede deployar.

### Incremental Delivery

1. Hook refactor → datos multi-mes disponibles
2. US1 → Tabla con años + Total General (MVP!)
3. US2 → Expandir año → meses
4. US3 → Expandir mes → detalle N3
5. Cada historia agrega valor sin romper las anteriores

### MVP Scope

→ Phase 1 + Phase 2 + Phase 3 (9 tareas): Tabla de años con Total General funcional.

---

## Notes

- Sin migraciones SQL. Sin nuevas tablas. Sin RPC.
- Las cards "Bonos Entregados" y "Ventas Servicios" no se modifican.
- Los modales existentes (`BonosDetalleModal`, `VentasServiciosDetalleModal`) no se tocan.
- El `monthlyBreakdown` existente sigue igual — se usa como fuente de ingresos/egresos por mes.
- Los wrappers `fetchBonosData()` y `fetchVentasServiciosData()` se preservan para las cards del dashboard.
- El estado de expansión (qué años/meses están expandidos) es local — no persiste entre recargas.
