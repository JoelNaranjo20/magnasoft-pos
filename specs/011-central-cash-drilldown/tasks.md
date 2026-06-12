# Tasks: Modales Drill-Down de Caja Central

**Input**: Design documents from `specs/011-central-cash-drilldown/`

**Prerequisites**: plan.md ✅, spec.md ✅ (clarified), research.md ✅, data-model.md ✅

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup — Verificación

**Purpose**: Confirmar que el dashboard base (`010-central-cash-dashboard`) está implementado y compila.

- [x] T001 Verificar build desktop: `cd apps/desktop && npx vite build` — debe compilar sin errores
- [x] T002 [P] Verificar build web: `cd apps/web && npx next build` — debe compilar sin errores

**Checkpoint**: Ambos builds pasan. Dashboard base funcional.

---

## Phase 2: Foundational — Extender hook `useCentralCash`

**Purpose**: Agregar al hook compartido los datos computados que alimentan los nuevos modales. Sin esto, ningún modal puede renderizarse. BLOQUEA US1-US3.

- [x] T003 Agregar `cashMovementsDelMes` en `apps/shared/hooks/useCentralCash.ts` — `useMemo` que filtra `movements` por `payment_method === 'cash'` y mes en curso. Retorna `{ ingresos: DetailItem[], egresos: DetailItem[], neto: number }`.
- [x] T004 [P] Agregar `transferMovementsDelMes` en `apps/shared/hooks/useCentralCash.ts` — `useMemo` que filtra `movements` por `payment_method IN ('transfer', 'card')` y mes en curso. Retorna `{ ingresos: DetailItem[], egresos: DetailItem[], neto: number }`.
- [x] T005 [P] Agregar `nominaAsalariados` en `apps/shared/hooks/useCentralCash.ts` — `useMemo` o fetch que obtiene `workers` activos con `salary > 0`. Retorna `TrabajadorAsalariado[]` + total + `semanas: SemanaNomina[]`.
- [x] T006 [P] Agregar `liquidacionesComisionistas` en `apps/shared/hooks/useCentralCash.ts` — fetch que consulta `worker_commissions` con `status = 'paid'` del mes, filtra solo trabajadores cuyo `salary = 0 OR NULL`, agrupa por `worker_id`. Retorna `ComisionistaDiario[]` + total.
- [x] T007 [P] Agregar `carteraDetalle` en `apps/shared/hooks/useCentralCash.ts` — fetch que consulta `customer_debts` con `remaining_amount > 0` + join a `customers(name)`. Retorna `CarteraItem[]` ordenados por monto descendente.
- [x] T008 [P] Agregar `recuperacionEfectivoDetalle` en `apps/shared/hooks/useCentralCash.ts` — fetch que consulta `debt_payments` del mes con `payment_method = 'cash'` + join a `customers(name)`. Retorna `CarteraItem[]`.
- [x] T009 [P] Agregar `recuperacionTransferenciaDetalle` en `apps/shared/hooks/useCentralCash.ts` — fetch que consulta `debt_payments` del mes con `payment_method IN ('transfer', 'card')` + join a `customers(name)`. Retorna `CarteraItem[]`.
- [x] T010 Agregar todos los nuevos campos al return del hook y verificar que `apps/desktop/src/hooks/useCentralCash.ts` y `apps/web/app/hooks/useCentralCash.ts` no necesitan cambios (solo re-exportan).

**Checkpoint**: El hook expone todos los datos para los 6 modales nuevos.

---

## Phase 3: US1 — Drill-Down Efectivo/Transferencia (P1)

**Goal**: KPIs "Efectivo Disponible" y "Transferencia Disponible" abren modal con desglose de ingresos/egresos del mes filtrados por método de pago.

**Independent Test**: Clic en Efectivo Disponible → modal con secciones Ingresos/Egresos del mes en efectivo. Neto = KPI. Igual para Transferencia.

- [x] T011 [US1] Extender `CashDashboardDetailModal.tsx` en `apps/shared/components/modals/CashDashboardDetailModal.tsx` — agregar prop `showIncomes?: boolean`. Cuando true, el modal muestra secciones "Ingresos" (verde) y "Egresos" (rojo) con subtotales, y un footer con el neto. Mantener compatibilidad hacia atrás (default false = solo egresos como hoy).
- [x] T012 [US1] Conectar "Efectivo Disponible" en `apps/desktop/src/components/finance/CentralCash.tsx` — agregar `onClick` al KPI que abre `CashDashboardDetailModal` con `showIncomes=true`, `title="Efectivo - Mes en Curso"`, `items` de ingresos + egresos de `cashMovementsDelMes`.
- [x] T013 [US1] Conectar "Transferencia Disponible" en `apps/desktop/src/components/finance/CentralCash.tsx` — agregar `onClick` al KPI que abre `CashDashboardDetailModal` con `showIncomes=true`, `title="Transferencia - Mes en Curso"`, items de `transferMovementsDelMes`.
- [x] T014 [P] [US1] Conectar "Efectivo Disponible" en `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` — mismo que T012 adaptado a Next.js.
- [x] T015 [P] [US1] Conectar "Transferencia Disponible" en `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` — mismo que T013 adaptado a Next.js.

**Checkpoint**: Efectivo y Transferencia abren modal con detalle del mes. Neto = KPI.

---

## Phase 4: US2 — Detalle de Nómina y Liquidaciones (P1)

**Goal**: KPI "Total Nómina" abre modal con Nómina Semanal (asalariados) + Liquidaciones Diarias (comisionistas). Total General = ambos.

**Independent Test**: Clic en Total Nómina → modal con Total General = Semanal + Diarias. Sección Semanal muestra semanas correctas + trabajadores asalariados. Sección Diarias muestra comisionistas.

- [x] T016 [US2] Crear `NominaDetailModal.tsx` en `apps/shared/components/modals/NominaDetailModal.tsx` — modal con:
  - Header: Total General = nómina semanal + liquidaciones diarias
  - Sección "Nómina Semanal": tabla con semanas del mes (Semana 1-N), cada una con subtotal (total ÷ N). Al expandir semana, lista de trabajadores asalariados con nombre y salario.
  - Sección "Liquidaciones Diarias": lista de comisionistas con nombre, monto total, cantidad de comisiones.
  - Estados: loading spinner, vacío descriptivo por sección.
- [x] T017 [US2] Conectar "Total Nómina" en `apps/desktop/src/components/finance/CentralCash.tsx` — agregar `onClick` que abre `NominaDetailModal` con datos de `nominaAsalariados`, `liquidacionesComisionistas`, `semanas`, `nominaTotal`.
- [x] T018 [P] [US2] Conectar "Total Nómina" en `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` — mismo que T017 adaptado a Next.js.

**Checkpoint**: Modal de Nómina muestra panorama completo de pagos a trabajadores.

---

## Phase 5: US3 — Drill-Down Cartera (P2)

**Goal**: KPIs "Cartera Total", "Recuperación Efectivo", "Recuperación Transferencia" abren modal con detalle de clientes/abonos.

**Independent Test**: Clic en Cartera Total → lista de clientes con deuda. Clic en Recuperación → lista de abonos con cliente/monto/fecha.

- [x] T019 [US3] Crear `CarteraDetailModal.tsx` en `apps/shared/components/modals/CarteraDetailModal.tsx` — modal genérico con prop `mode: 'total' | 'recuperacion-efectivo' | 'recuperacion-transferencia'`:
  - `total`: lista de clientes con `remaining_amount`, orden descendente.
  - `recuperacion-efectivo`: lista de abonos en efectivo (cliente, monto, fecha).
  - `recuperacion-transferencia`: lista de abonos transferencia (cliente, monto, fecha).
  - Estados: loading, vacío ("Sin deudas" / "Sin abonos este mes").
- [x] T020 [US3] Conectar KPIs de Cartera en `apps/desktop/src/components/finance/CentralCash.tsx` — agregar `onClick` a "Cartera Total" → `mode='total'`, "Recup. Efectivo" → `mode='recuperacion-efectivo'`, "Recup. Transfer" → `mode='recuperacion-transferencia'`.
- [x] T021 [P] [US3] Conectar KPIs de Cartera en `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` — mismo que T020 adaptado a Next.js.

**Checkpoint**: Los 3 KPIs de Cartera abren su modal con detalle correcto.

---

## Phase 6: Polish & Build

- [x] T022 Ejecutar build desktop: `cd apps/desktop && npx vite build` — verificar cero errores
- [x] T023 [P] Ejecutar build web: `cd apps/web && npx next build` — verificar cero errores
- [x] T024 Verificar no regresión en `apps/desktop/src/components/modals/CloseSessionModal.tsx` — cierre de sesión intacto
- [x] T025 [P] Verificar quickstart: seguir `specs/011-central-cash-drilldown/quickstart.md` y confirmar todos los checkboxes

---

## Dependencies & Execution Order

- **Phase 1** → Sin dependencias
- **Phase 2** → Depende de Phase 1. BLOQUEA US1-US3.
- **Phase 3 (US1)** → Depende de Phase 2. Independiente de US2/US3.
- **Phase 4 (US2)** → Depende de Phase 2. Independiente de US1/US3.
- **Phase 5 (US3)** → Depende de Phase 2. Independiente de US1/US2.
- **Phase 6** → Depende de US1+US2+US3.

### Parallel Opportunities

| Grupo | Tareas |
|-------|--------|
| Setup | T001 + T002 |
| Hook queries | T003 + T004 + T005 + T006 + T007 + T008 + T009 |
| Desktop + Web connect | T012+T013 + T014+T015, T017+T018, T020+T021 |
| Builds | T022 + T023 |

### MVP Scope

→ **Phase 1 + 2 + 3** (15 tareas): Efectivo/Transferencia drill-down funcionando.

---

## Notes

- Sin migraciones SQL. Solo SELECTs sobre tablas existentes.
- Hook extendido mantiene compatibilidad hacia atrás.
- `CashDashboardDetailModal` extendido con `showIncomes` — Egresos y Liquidaciones siguen usándolo sin cambios (`showIncomes=false` es el default).
- `NominaDetailModal`: las semanas se calculan con `Math.ceil(daysInMonth / 7)`.
- `CarteraDetailModal`: un solo componente con 3 modos vía prop `mode`.
