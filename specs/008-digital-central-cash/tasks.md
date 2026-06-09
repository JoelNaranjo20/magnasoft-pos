# Tasks: Ingresos Completos a Caja Central con Trazabilidad

**Input**: Design documents from `specs/008-digital-central-cash/`

**Prerequisites**: plan.md âœ…, spec.md âœ… (v3), research.md âœ…, data-model.md âœ…, contracts/ âœ…

**Tests**: No automatizados. VerificaciÃ³n visual en `pnpm electron:dev`.

**Organization**: 4 user stories en orden de prioridad (P1, P1, P1, P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: User story correspondiente (US1, US2, US3, US4)
- Las rutas son relativas a la raÃ­z del monorepo

---

## Phase 1: Setup â€” MigraciÃ³n de Schema

**Purpose**: Preparar la base de datos con las 3 nuevas columnas y la RPC de backfill.

- [X] T001 Crear migraciÃ³n SQL en `supabase/migrations/20260609_add_session_id_metadata_central_cash.sql` â€” agregar columnas `payment_method TEXT` con CHECK constraint, `session_id UUID FK REFERENCES cash_sessions(id) ON DELETE SET NULL`, `metadata JSONB`, e Ã­ndices en `session_id`, `payment_method`, `created_at`
- [X] T002 Agregar RPC `backfill_central_cash_sessions(p_business_id UUID)` en `supabase/migrations/20260609_add_session_id_metadata_central_cash.sql` â€” lÃ³gica PL/pgSQL: migrar legacy `payment_method = 'cash'` donde NULL, iterar sesiones cerradas sin movimiento asociado, calcular metadata desde `sales`/`debt_payments`/`worker_loans`/`cash_movements`, insertar movimiento `mixed` con session_id y metadata, idempotente
- [X] T003 Ejecutar `supabase db push` para aplicar la migraciÃ³n

**Checkpoint**: Schema listo. Columnas `payment_method`, `session_id`, `metadata` disponibles. RPC desplegada.

---

## Phase 2: Foundational â€” Tipos y Hook

**Purpose**: Actualizar tipos TypeScript y el hook `useCentralCash` para que todos los user stories consuman los nuevos campos.

**âš ï¸ CRITICAL**: Sin esta fase, los componentes no pueden leer `payment_method`, `session_id` ni `metadata`.

- [X] T004 Actualizar interfaz `CentralCashMovement` en `apps/desktop/src/types/supabase.ts` â€” agregar campos `payment_method: 'cash' | 'transfer' | 'card' | 'mixed' | null`, `session_id: string | null`, `metadata: CentralCashMetadata | null`
- [X] T005 Agregar tipo `CentralCashMetadata` en `apps/desktop/src/types/supabase.ts` â€” interfaz con 11 campos: `cash_sales`, `transfer_sales`, `card_sales`, `cash_abonos`, `transfer_abonos`, `card_abonos`, `cash_loan_payments`, `transfer_loan_payments`, `cash_other`, `transfer_other`, `commissions_paid`
- [X] T006 [P] Actualizar hook `useCentralCash` en `apps/desktop/src/hooks/useCentralCash.ts` â€” la query debe incluir los nuevos campos `payment_method`, `session_id`, `metadata`; agregar JOIN opcional con `cash_sessions` para obtener `closed_at` cuando `session_id` no es null
- [X] T007 [P] Agregar funciones helper en `apps/desktop/src/hooks/useCentralCash.ts` â€” `getCashBalance()` calcula balance de efectivo, `getTransferBalance()` calcula balance de transferencia, `getTotalBalance()` suma ambos, `getMonthlySummary()` agrupa movimientos por mes con entradas/gastos/neto categorizados
- [X] T008 [P] Agregar funciÃ³n `backfillSessions()` en `apps/desktop/src/hooks/useCentralCash.ts` â€” llama `supabase.rpc('backfill_central_cash_sessions', { p_business_id })` y retorna `{ processed, skipped }`

**Checkpoint**: Tipos y hook listos. Los componentes pueden consumir datos.

---

## Phase 3: User Story 1 â€” Movimiento Unificado al Cerrar Turno (Priority: P1) ðŸŽ¯ MVP

**Goal**: Al cerrar turno, se crea UN solo movimiento `income` con `payment_method = 'mixed'`, `amount = total`, `session_id`, y `metadata` JSONB con desglose completo.

**Independent Test**: Abrir turno, hacer ventas en efectivo + transferencia, cerrar turno. Verificar en Supabase que `central_cash_movements` tiene 1 fila con `payment_method = 'mixed'` y metadata completa.

### Implementation for User Story 1

- [X] T009 [US1] Modificar `handleConfirmClose` en `apps/desktop/src/components/modals/CloseSessionModal.tsx` â€” construir objeto `metadata` con los 11 campos desde las variables ya calculadas (`cashSalesTotal`, `digitalSalesTotal`, `cashAbonosTotal`, `digitalAbonosTotal`, etc.)
- [X] T010 [US1] Reemplazar el INSERT actual de solo efectivo en `apps/desktop/src/components/modals/CloseSessionModal.tsx` por un solo INSERT con `type: 'income'`, `payment_method: 'mixed'`, `amount: totalGeneral`, `session_id: cashSession.id`, `metadata: metadataObj`
- [X] T011 [US1] Verificar que `netToTransfer` y el INSERT legacy en `apps/desktop/src/components/modals/CloseSessionModal.tsx` se eliminan correctamente â€” el nuevo movimiento reemplaza completamente la lÃ³gica anterior de efectivo a Caja Central

**Checkpoint**: Cada cierre de turno produce un movimiento `mixed` con metadata completa.

---

## Phase 4: User Story 2 â€” Vistas de Efectivo y Transferencia (Priority: P1)

**Goal**: Caja Central tiene tabs para alternar entre vista de Efectivo Disponible y Transferencia Disponible, cada una con su balance y movimientos agrupados por dÃ­a.

**Independent Test**: Abrir Caja Central, cambiar entre tabs Efectivo y Transferencia, verificar balances correctos y movimientos agrupados por dÃ­a.

### Implementation for User Story 2

- [X] T012 [US2] Agregar estado de tabs en `apps/desktop/src/components/finance/CentralCash.tsx` â€” `activeTab: 'cash' | 'transfer' | 'total'`, `expandedDays: Set<string>`
- [X] T013 [US2] Implementar barra de 3 tabs en `apps/desktop/src/components/finance/CentralCash.tsx` â€” botones `[ðŸ’° Efectivo] [ðŸ¦ Transferencia] [ðŸ“Š Total General]` con badge de monto pequeÃ±o, tab activo con `bg-primary text-white`
- [X] T014 [P] [US2] Implementar vista "Efectivo Disponible" en `apps/desktop/src/components/finance/CentralCash.tsx` â€” hero card con balance cash, lista de movimientos filtrados por parte efectivo, agrupados por dÃ­a con acordeones colapsables, badge "Turno"/"Manual"
- [X] T015 [P] [US2] Implementar vista "Transferencia Disponible" en `apps/desktop/src/components/finance/CentralCash.tsx` â€” hero card con balance transferencia, lista de movimientos filtrados por parte transferencia, misma estructura de acordeones que la vista efectivo
- [X] T016 [US2] Agregar selector de `payment_method` obligatorio en el formulario de movimiento manual en `apps/desktop/src/components/finance/CentralCash.tsx` â€” toggle `[ðŸ’° Efectivo] [ðŸ¦ Transferencia]`, el mÃ©todo seleccionado se envÃ­a en el INSERT

**Checkpoint**: Cambiar entre tabs Efectivo y Transferencia muestra balances y listas correctas.

---

## Phase 5: User Story 3 â€” Total General con Resumen Mensual (Priority: P1)

**Goal**: El tab Total General muestra balance combinado + resumen mensual con entradas categorizadas y gastos categorizados (comisiones, salarios, otros egresos). Meses expandibles para ver detalle.

**Independent Test**: Ir a tab Total General, ver hero card con balance total, ver lista de meses con entradas/gastos/neto, expandir un mes para ver detalle categorizado.

### Implementation for User Story 3

- [X] T017 [US3] Implementar vista "Total General" en `apps/desktop/src/components/finance/CentralCash.tsx` â€” hero card con balance total (`efectivo + transferencia`), subtÃ­tulos mostrando cada componente
- [X] T018 [US3] Implementar secciÃ³n de resumen mensual en `apps/desktop/src/components/finance/CentralCash.tsx` â€” agrupar movimientos por mes usando `date-fns format(created_at, 'yyyy-MM')`, cada mes muestra: nombre (ej. "Junio 2026"), entradas totales, gastos totales, balance neto, acordeÃ³n colapsable
- [X] T019 [P] [US3] Implementar sub-secciÃ³n "Entradas del Mes" expandible en `apps/desktop/src/components/finance/CentralCash.tsx` â€” mostrar: "Cierres de Turno (N sesiones) $X.XM" con subtotal efectivo/transferencia, "Ingresos Manuales (N) $X.XM"
- [X] T020 [P] [US3] Implementar sub-secciÃ³n "Gastos del Mes" expandible en `apps/desktop/src/components/finance/CentralCash.tsx` â€” categorizados: "Comisiones Pagadas a Trabajadores âˆ’$X.XM", "Salarios / Adelantos / PrÃ©stamos âˆ’$X.XM", "Otros Egresos Manuales âˆ’$X.XM", usando `description ILIKE` o metadata para categorizar
- [X] T021 [US3] Asegurar consistencia de datos entre tabs â€” al cambiar de tab, los cÃ¡lculos de balance deben ser consistentes; `totalGeneral === cashBalance + transferBalance`

**Checkpoint**: Tab Total General muestra resumen mensual completo con entradas y gastos categorizados.

---

## Phase 6: User Story 4 â€” Backfill de Sesiones HistÃ³ricas (Priority: P2)

**Goal**: Ejecutar backfill desde la UI para procesar sesiones cerradas histÃ³ricas, creando movimientos `mixed` con metadata. El botÃ³n muestra progreso y resultado.

**Independent Test**: Ir a Caja Central (siendo admin), hacer clic en "Ejecutar Backfill", verificar progreso y resultado. Verificar en DB que las sesiones tienen su movimiento `mixed`.

### Implementation for User Story 4

- [X] T022 [US4] Agregar botÃ³n de backfill en `apps/desktop/src/components/finance/CentralCash.tsx` â€” visible solo para admin, card con descripciÃ³n "Sesiones histÃ³ricas sin registrar", botÃ³n `[Ejecutar Backfill]`, estado de progreso (`processing`, `result`)
- [X] T023 [US4] Implementar flujo de ejecuciÃ³n en `apps/desktop/src/components/finance/CentralCash.tsx` â€” al hacer clic: llama `backfillSessions()`, muestra spinner + "Procesando...", al finalizar muestra resultado "âœ… 48 sesiones procesadas, 2 ya existentes"
- [X] T024 [US4] Verificar idempotencia â€” ejecutar backfill dos veces, confirmar que el segundo intento reporta 0 procesadas y N saltadas, sin duplicados en DB

**Checkpoint**: Backfill funcional e idempotente desde la UI.

---

## Phase 7: Polish & VerificaciÃ³n

**Purpose**: Build final, verificaciÃ³n de regresiones, limpieza.

- [X] T025 Ejecutar `pnpm tsc -b` en `apps/desktop/` â€” verificar cero errores TypeScript
- [X] T026 Ejecutar `pnpm build` en `apps/desktop/` â€” verificar build exitoso
- [X] T027 Probar flujo completo en `electron:dev` â€” abrir turno, venta mixta (efectivo + transferencia), cerrar turno, verificar movimiento `mixed` en Caja Central, navegar 3 tabs, ejecutar backfill
- [X] T028 Verificar no regresiÃ³n en `apps/desktop/src/components/modals/CloseSessionModal.tsx` â€” conciliaciÃ³n, conteo de billetes, diferencia, cierre de caja existente sin cambios en esa lÃ³gica

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias â€” inicia inmediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 (schema listo) â€” BLOQUEA todos los user stories
- **US1 (Phase 3)**: Depende de Phase 2 â€” modifica CloseSessionModal
- **US2 (Phase 4)**: Depende de Phase 2 â€” modifica CentralCash (tabs cash/transfer)
- **US3 (Phase 5)**: Depende de Phase 4 (mismo componente CentralCash, construye sobre tabs)
- **US4 (Phase 6)**: Depende de Phase 2 + Phase 1 (RPC backfill ya deployada)
- **Polish (Phase 7)**: Depende de todas las fases anteriores

### User Story Dependencies

- **US1**: Independiente â€” solo depende de Phase 2
- **US2**: Independiente â€” solo depende de Phase 2
- **US3**: Depende de US2 (mismo componente, extiende la estructura de tabs)
- **US4**: Independiente â€” solo depende de Phase 1 (RPC) + Phase 2 (hook)

### Within Each User Story

- Tareas marcadas [P] pueden ejecutarse en paralelo
- Tareas sin [P] son secuenciales o integradoras

### Parallel Opportunities

- **Phase 2**: T006, T007, T008 pueden ejecutarse en paralelo (mismo archivo pero funciones independientes)
- **US2**: T014 y T015 pueden ejecutarse en paralelo (vistas independientes)
- **US3**: T019 y T020 pueden ejecutarse en paralelo (sub-secciones independientes)
- **US1 + US2**: Pueden ejecutarse en paralelo (archivos distintos: CloseSessionModal vs CentralCash)
- **US1 + US4**: Pueden ejecutarse en paralelo

---

## Parallel Example: US1 + US2 SimultÃ¡neos

```bash
# Paralelo (archivos distintos):
Task: "T009-T011 Modificar CloseSessionModal.tsx â€” movimiento unificado"
Task: "T012-T016 RediseÃ±ar CentralCash.tsx â€” tabs efectivo/transferencia"

# Luego US3 secuencial sobre CentralCash:
Task: "T017-T021 Total General con resumen mensual"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1: Setup â€” migraciÃ³n SQL (T001-T003)
2. Phase 2: Foundational â€” tipos y hook (T004-T008)
3. Phase 3: US1 â€” movimiento unificado al cerrar (T009-T011)
4. Phase 4: US2 â€” tabs efectivo/transferencia (T012-T016)
5. **STOP y VALIDAR**: Cerrar turno con ventas mixtas, verificar tabs
6. Build: `pnpm build`

### Incremental Delivery

1. Setup + Foundational â†’ Schema y datos listos
2. + US1 â†’ Cada cierre ya registra movimiento `mixed` con metadata
3. + US2 â†’ Caja Central ya muestra efectivo vs transferencia separados
4. + US3 â†’ Total General con resumen mensual gerencial
5. + US4 â†’ Backfill para sesiones histÃ³ricas
6. + Polish â†’ Build y smoke test

---

## Notes

- [P] = Archivos distintos o funciones independientes dentro del mismo archivo
- [Story] = Trazabilidad a user story del spec
- Cero cambios a la lÃ³gica de conciliaciÃ³n (conteo de billetes, diferencia, cierre)
- El metadata JSONB tiene estructura fija (11 campos) â€” nunca undefined, siempre 0 como default
- `payment_method` es obligatorio en movimientos nuevos (manuales y automÃ¡ticos)
- La RPC de backfill usa `SECURITY DEFINER` y estÃ¡ scoped por `business_id`
- Usar `date-fns` para formateo de meses en Total General

