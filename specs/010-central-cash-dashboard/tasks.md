# Tasks: Dashboard Financiero de Caja Central

**Input**: Design documents from `specs/010-central-cash-dashboard/`

**Prerequisites**: plan.md ✅, spec.md ✅ (clarified), research.md ✅, data-model.md ✅

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup — Verificación de entorno

**Purpose**: Confirmar que el entorno de desarrollo está listo antes de tocar código.

- [x] T001 Verificar `pnpm install` al día en raíz del monorepo y `apps/shared/` compila sin errores con `pnpm build` o `tsc -b`
- [x] T002 Verificar que `apps/shared/components/modals/CategorySalesModal.tsx` existe y exporta correctamente `CategorySalesModal`

**Checkpoint**: Entorno listo. Sin cambios aún.

---

## Phase 2: Foundational — Extender hook `useCentralCash` en shared

**Purpose**: Agregar los nuevos campos al hook compartido. Sin esto, ninguna card del dashboard puede renderizar datos reales. BLOQUEA todas las fases siguientes.

- [x] T003 Extender `useCentralCash` en `apps/shared/hooks/useCentralCash.ts` con nuevos estados y funciones: `carteraTotal`, `carteraTotalLoading`, `recuperacionEfectivo`, `recuperacionTransferencia`, `liquidacionesDelMes`, `liquidacionesLoading`, `nominaTotal`, `nominaTotalLoading`, `totalServicios`, `totalServiciosLoading`, `egresosDelMes`, `fetchDashboardData()`. Cada campo es un `useState` con su propio loading. `fetchDashboardData()` ejecuta todas las queries en paralelo con `Promise.allSettled()`.
- [x] T004 [P] Agregar query de cartera en `apps/shared/hooks/useCentralCash.ts` — función `fetchCarteraData()`: consulta `customer_debts` (SUM `remaining_amount` WHERE > 0 global) + `debt_payments` del mes agrupados por `payment_method` para recuperación. Retorna `{ carteraTotal, recuperacionEfectivo, recuperacionTransferencia }`.
- [x] T005 [P] Agregar query de nómina en `apps/shared/hooks/useCentralCash.ts` — función `fetchNominaData()`: consulta `workers` con `status = 'active'`, SUM de `salary`.
- [x] T006 [P] Agregar query de liquidaciones en `apps/shared/hooks/useCentralCash.ts` — función `fetchLiquidacionesData()`: consulta `worker_commissions` con `status = 'paid'` filtrando por `paid_at` del mes en curso.
- [x] T007 [P] Agregar cálculo de `totalServicios` en `apps/shared/hooks/useCentralCash.ts` — exponer el grand total de `fetchCategorySales()` como estado `totalServicios` + `totalServiciosLoading`. No se modifica la lógica interna de `fetchCategorySales()`.
- [x] T008 Agregar cálculo de `egresosDelMes` en `apps/shared/hooks/useCentralCash.ts` — filtrar `central_cash_movements` del mes con `type = 'expense'` y sumar montos.
- [x] T009 Agregar `egresosDetail` y `liquidacionesDetail` en `apps/shared/hooks/useCentralCash.ts` — arrays con los movimientos individuales (id, description, amount, created_at) para alimentar los modales de detalle al hacer clic en Egresos/Liquidaciones.
- [x] T010 Actualizar exports del hook en `apps/shared/hooks/useCentralCash.ts` — agregar todos los nuevos campos al return del hook. Verificar que `apps/desktop/src/hooks/useCentralCash.ts` y `apps/web/app/hooks/useCentralCash.ts` no necesitan cambios (solo re-exportan).

**Checkpoint**: El hook expone todos los datos del dashboard. Se puede hacer `console.log` de cada campo nuevo.

---

## Phase 3: US1 — Vista General de Caja Central (Priority: P1)

**Goal**: Dashboard 2 columnas con Balance Total, Efectivo, Transferencia, Resumen Operativo, botones "+ Nuevo Movimiento" y "Ver Historial". Cada KPI cliqueable abre modal. El formulario de ingreso/egreso se abre en modal.

**Independent Test**: Abrir Caja Central → ver KPIs principales cargados en <3s → clic en cada KPI abre su modal correspondiente → clic en "+ Nuevo Movimiento" abre formulario → clic en "Ver Historial" abre acordeones mensuales.

- [x] T011 [US1] Crear `CashDashboardDetailModal.tsx` en `apps/shared/components/modals/CashDashboardDetailModal.tsx` — modal genérico que recibe `{ isOpen, onClose, title, items: DetailItem[], loading }`. Renderiza lista de movimientos con descripción, fecha y monto. Usado por Egresos y Liquidaciones.
- [x] T012 [P] [US1] Crear `CentralCashHistoryModal.tsx` en `apps/shared/components/modals/CentralCashHistoryModal.tsx` — modal que recibe `{ isOpen, onClose, movements, monthlySummary, loading, categorySales, categorySalesLoading, fetchCategorySales }`. Contiene los acordeones mensuales con Entradas/Gastos/Neto (mismo diseño que existe hoy en `CentralCash.tsx`). Incluye el botón "Cargar analytics" y la vista compacta de top 5 categorías + "Ver detalle completo →" que abre `CategorySalesModal`.
- [x] T013 [P] [US1] Crear `CentralCashMovementModal.tsx` en `apps/desktop/src/components/finance/CentralCashMovementModal.tsx` — modal con formulario de ingreso/egreso manual: selector de tipo (Ingreso/Egreso), monto numérico, método de pago (Efectivo/Transferencia), descripción, botón de submit. Usa `addMovement` del hook.
- [x] T014 [US1] Reescribir `CentralCash.tsx` en `apps/desktop/src/components/finance/CentralCash.tsx` — reemplazar completamente el contenido actual (~900 líneas) por el nuevo dashboard 2 columnas:
  - **Columna izquierda**: Card "Caja Central" con Balance Total (KPI grande, texto 3xl, centrado), dos sub-cards paralelas de Efectivo y Transferencia (KPIs pequeños con icono y monto), botón "+ Nuevo Movimiento" que abre `CentralCashMovementModal`.
  - **Columna derecha**: Card "Resumen Operativo" con Total Servicios (cliqueable → `CategorySalesModal`), Egresos (cliqueable → `CashDashboardDetailModal`), Liquidaciones (cliqueable → `CashDashboardDetailModal`), botón "📋 Ver Historial" que abre `CentralCashHistoryModal`. Card "Cartera" con Cartera Total, Recuperación Efectivo, Recuperación Transferencia (condicional: `useModule('customers')`). Card "Nómina" con Total Nómina (condicional: `useModule('payroll')`).
  - **Layout**: `flex-col lg:flex-row`, responsive. Columna izquierda `lg:w-[380px]`, derecha `flex-1`. Gap 6 (24px). Fondo `bg-slate-50 dark:bg-[#0a0f14]`.
  - **Estados**: Skeleton pulse para cada KPI mientras carga. "$0" si no hay datos. Sin botón de backfill.
- [x] T015 [US1] Reescribir `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` — mismo dashboard que desktop adaptado a Next.js. Usar los mismos componentes shared (`CategorySalesModal`, `CentralCashHistoryModal`, `CashDashboardDetailModal`). Crear un `CentralCashMovementModal` específico para web (o reutilizar el patrón del modal desktop). Layout idéntico: 2 columnas, mismas cards, mismos KPIs cliqueables.
- [x] T016 [US1] Agregar `useModule` para condicionalidad en `apps/desktop/src/components/finance/CentralCash.tsx` — importar `useModule` de `@shared/store/useModuleStore`. Card de Cartera se renderiza solo si `useModule('customers') === true`. "Liquidaciones" en Resumen Operativo solo si `useModule('commissions') === true`. Card de Nómina solo si `useModule('payroll') === true`.
- [x] T017 [US1] Agregar `useModule` para condicionalidad en `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` — mismas condiciones que T016 adaptadas al entorno Next.js.

**Checkpoint**: Dashboard completamente funcional en desktop y web. Todos los KPIs cargan datos reales. Modales abren y cierran correctamente.

---

## Phase 4: US2 — Resumen de Cartera y Recuperación (Priority: P2)

**Goal**: La Card de Cartera muestra datos correctos de deuda pendiente global + recuperación del mes por método de pago. Verificar independientemente del dashboard.

**Independent Test**: Crear una deuda en cartera → verificar que Cartera Total refleja el saldo. Registrar un abono en efectivo → verificar Recuperación Efectivo. Registrar abono por transferencia → verificar Recuperación Transferencia.

- [x] T018 [US2] Verificar query de cartera en `apps/shared/hooks/useCentralCash.ts` — confirmar que `carteraTotal` suma correctamente `customer_debts.remaining_amount` global (sin filtrar por mes). Probar con negocio que tiene deudas activas.
- [x] T019 [US2] Verificar query de recuperación en `apps/shared/hooks/useCentralCash.ts` — confirmar que `recuperacionEfectivo` y `recuperacionTransferencia` filtran por mes en curso y agrupan por `payment_method` correctamente desde `debt_payments`.

**Checkpoint**: Cartera card muestra datos precisos. Recuperación desglosada por método de pago coincide con los abonos reales del mes.

---

## Phase 5: US3 — Nómina Mensual (Priority: P3)

**Goal**: La Card de Nómina muestra la suma de salarios de trabajadores activos.

**Independent Test**: Configurar salario a un trabajador activo → verificar Total Nómina. Marcar trabajador como inactivo → verificar que se descuenta.

- [x] T020 [US3] Verificar query de nómina en `apps/shared/hooks/useCentralCash.ts` — confirmar que `nominaTotal` suma `workers.salary` solo para `status = 'active'`. Probar con negocio que tiene trabajadores con y sin salario.
- [x] T021 [US3] Verificar condicionalidad de módulo `payroll` — la Card de Nómina solo se renderiza si `module_payroll` está activo en `business.config`. Probar activando/desactivando el módulo.

**Checkpoint**: Nómina card muestra el total correcto y respeta el feature flag.

---

## Phase 6: Polish & Build

- [x] T022 Ejecutar `pnpm build` en `apps/desktop/` — verificar cero errores de TypeScript y Vite. Prestar atención a shadowing de variables.
- [x] T023 [P] Ejecutar `pnpm build` en `apps/web/` — verificar cero errores de Next.js. Confirmar que la página `/dashboard/finanzas` está en el output de rutas estáticas.
- [x] T024 [P] Verificar no regresión en `apps/desktop/src/components/modals/CloseSessionModal.tsx` — el cierre de sesión sigue registrando 3 movimientos separados (ingreso efectivo, ingreso transferencia, egreso base) y no fue afectado por los cambios al hook.
- [x] T025 [P] Verificar no regresión en `apps/desktop/src/components/finance/CarteraHub.tsx` — los abonos a cartera siguen registrándose con `payment_method` correcto en `central_cash_movements`.
- [x] T026 [P] Verificar no regresión en `apps/web/app/components/modals/RegisterAbonoModal.tsx` — mismo check que T025 para web.
- [x] T027 Quickstart manual: seguir `specs/010-central-cash-dashboard/quickstart.md` y confirmar que todos los checkboxes pasan en desktop y web.

---

## Dependencies & Execution Order

- **Phase 1** → Sin dependencias. Verificación de entorno.
- **Phase 2** → Depende de Phase 1. BLOQUEA todo lo demás.
- **Phase 3 (US1)** → Depende de Phase 2. Independiente de US2 y US3.
- **Phase 4 (US2)** → Depende de Phase 2. Puede ejecutarse en paralelo con US1 (pero US1 ya incluye las cards).
- **Phase 5 (US3)** → Depende de Phase 2. Ídem.
- **Phase 6** → Depende de Phase 3 + 4 + 5 completadas.

### Parallel Opportunities

- **T004 + T005 + T006 + T007**: Paralelo (queries independientes en el mismo archivo, pero tocan distintas funciones)
- **T011 + T012 + T013**: Paralelo (3 modales en archivos distintos)
- **T014 + T015**: Pueden empezar en paralelo después de T011-T013 (desktop y web son independientes)
- **T018 + T019 + T020 + T021**: Paralelo (verificaciones en distintos features)
- **T022 + T023 + T024 + T025 + T026**: Paralelo (builds independientes + verificaciones en archivos distintos)

---

## Implementation Strategy

### MVP (US1 only)

1. Phase 1: Verificación (T001-T002)
2. Phase 2: Hook extension (T003-T010)
3. Phase 3: Dashboard + modales (T011-T017)
4. Build desktop y verificar KPIs principales

### Full Delivery

1. Phase 1 → Phase 2 → Phase 3 + Phase 4 + Phase 5 en paralelo → Phase 6
2. Build ambos, verificar quickstart

---

## Notes

- Sin migraciones SQL nuevas. Todas las queries son SELECT sobre tablas existentes.
- El hook `useCentralCash` mantiene compatibilidad hacia atrás: todos los campos existentes (`cashBalance`, `transferBalance`, `totalBalance`, `monthlySummary`, `addMovement`, `fetchCategorySales`, etc.) permanecen sin cambios de firma.
- `CentralCashHistoryModal` reutiliza ~80% del JSX actual de `CentralCash.tsx` (acordeones mensuales, analytics, CategorySalesModal). No se reescribe desde cero — se extrae y adapta.
- `CashDashboardDetailModal` es un componente genérico mínimo (~100 líneas). Recibe `items[]` y renderiza una lista estilizada.
- `CentralCashMovementModal` es el formulario actual de ingreso/egreso extraído a modal (~150 líneas).
- Desktop y web comparten 3 de 4 modales (`CategorySalesModal`, `CentralCashHistoryModal`, `CashDashboardDetailModal`). Solo el modal de formulario (`CentralCashMovementModal`) es específico por plataforma.
