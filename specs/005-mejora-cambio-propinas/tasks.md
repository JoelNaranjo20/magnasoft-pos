# Tasks: Mejora del Sistema de Cambio y Propinas en POS

**Input**: Design documents from `/specs/005-mejora-cambio-propinas/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: No se solicitó test suite automatizada. Validación manual con quickstart.md.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths in all descriptions

---

## Phase 1: Setup (Tipos Compartidos)

**Purpose**: Extender la interfaz `SaleMetadata` con todos los campos nuevos que usarán las 3 user stories. Esto es el contrato de datos que toda fase subsecuente leerá/escribirá.

- [x] T001 Extender SaleMetadata con campos de propina (`tip_amount`, `tip_worker_id`, `tip_payment_method`, `tip_percentage`, `tip_distribution`) y cambio cruzado (`cross_change`) en `apps/desktop/src/types/pos.ts`

**Checkpoint**: `SaleMetadata` completo — todos los tipos necesarios para US1, US2, US3 están definidos.

---

## Phase 2: User Story 1 — Cambio Cruzado en Punto de Cobro (Priority: P1) 🎯 MVP

**Goal**: Permitir al cajero registrar cambio cruzado directamente en el modal de pago sin crear movimientos manuales separados.

**Independent Test**: Crear venta de $2,000 con pago "transferencia". Ingresar monto recibido $3,500. Seleccionar "Dar cambio en efectivo: $1,500". Verificar: venta registra transferencia $3,500, cash_movement expense por $1,500 creado, cierre de caja refleja -$1,500 en efectivo.

### 2A — Estado y UI de cambio cruzado

- [x] T002 [US1] Agregar estado local en PaymentModal: `crossChangeEnabled`, `crossChangeToMethod`, `crossChangeAmount` en `apps/desktop/src/components/modals/PaymentModal.tsx`
- [x] T003 [US1] En método transfer/card: mostrar toggle "¿Dar cambio en efectivo?" cuando `receivedAmount > total` en `apps/desktop/src/components/modals/PaymentModal.tsx`
- [x] T004 [US1] En método cash: mostrar toggle "¿Dar cambio por transferencia?" cuando `receivedAmount > total` en `apps/desktop/src/components/modals/PaymentModal.tsx`

### 2B — Validaciones

- [x] T005 [US1] Validar que `crossChangeAmount <= receivedAmount - total` y mostrar error si se excede en `apps/desktop/src/components/modals/PaymentModal.tsx`
- [x] T006 [US1] Validar saldo en caja para cambio en efectivo: warning si el saldo de sesión es insuficiente (no bloqueante) en `apps/desktop/src/components/modals/PaymentModal.tsx`

### 2C — Persistencia

- [x] T007 [US1] En `handleConfirm`: después de crear la venta, insertar `cash_movement` tipo `expense` con `payment_method = crossChangeToMethod` y `description = 'Cambio cruzado - Venta #XXX'` en `apps/desktop/src/components/modals/PaymentModal.tsx`
- [x] T008 [US1] Guardar `cross_change` en `sale.metadata` con `from_method`, `to_method`, `amount` en `apps/desktop/src/components/modals/PaymentModal.tsx`

**Checkpoint**: Cambio cruzado funcional. Probar con quickstart.md escenarios 3-4. Pago con transferencia + cambio en efectivo funciona end-to-end.

---

## Phase 3: User Story 2 — Sistema de Propinas Mejorado (Priority: P2)

**Goal**: Agregar porcentajes rápidos de propina, distribución entre múltiples trabajadores y método de pago independiente de la venta.

**Independent Test**: Crear venta de $5,000. Presionar botón 15% → $750. Asignar 50% a Trabajador A y 50% a B. Pagar con tarjeta, marcar propina en efectivo. Verificar: sale.card_amount = $5,000 (sin propina), dos commissions de $375 cada uno, metadata.tip_payment_method = 'cash'.

### 3A — Porcentajes rápidos

- [x] T009 [P] [US2] Agregar botones [10%] [15%] [20%] junto al input de propina, calculando `Math.round(total * % / 100)` en `apps/desktop/src/components/modals/PaymentModal.tsx`
- [x] T010 [US2] Mejorar visibilidad del botón "Dejar cambio como propina" (ícono más grande, texto más claro) en `apps/desktop/src/components/modals/PaymentModal.tsx`

### 3B — Split de propinas entre trabajadores

- [x] T011 [US2] Agregar botón "Repartir propina" que muestre filas dinámicas: selector de trabajador + input de monto por cada fila en `apps/desktop/src/components/modals/PaymentModal.tsx`
- [x] T012 [US2] Validar que la suma de splits = `tipAmount` y mostrar advertencia si no coincide en `apps/desktop/src/components/modals/PaymentModal.tsx`
- [x] T013 [US2] En `handleConfirm`: guardar `tip_distribution` en `sale.metadata` y crear múltiples registros en `worker_commissions` con `service_type = 'tip_split'` en `apps/desktop/src/components/modals/PaymentModal.tsx`

### 3C — Método de pago de propina independiente

- [x] T014 [US2] Agregar selector "Método de propina" (efectivo/transferencia/tarjeta) visible cuando hay propina en `apps/desktop/src/components/modals/PaymentModal.tsx`
- [x] T015 [US2] Si `tip_payment_method !== payment_method`: NO sumar propina al `cash_amount`/`transfer_amount`/`card_amount` de la venta, solo registrar en metadata en `apps/desktop/src/components/modals/PaymentModal.tsx`

**Checkpoint**: Propinas mejoradas funcional. Probar con quickstart.md escenarios 5-6. Porcentajes, split y método independiente funcionan.

---

## Phase 4: User Story 3 — Visualización en Ventas y Movimientos (Priority: P3)

**Goal**: Mostrar cambio cruzado y propinas en el detalle de venta, historial de sesiones, y resumen de cierre de caja.

**Independent Test**: Realizar venta con cross-change y propina. Abrir detalle en historial: ver badge de cambio, badge de propina con trabajador. Abrir cierre de caja: ver cambios entregados separados por método.

### 4A — SaleDetailsModal (2 archivos, paralelo)

- [x] T016 [P] [US3] Leer `metadata.cross_change` y mostrar badge "🔀 Cambio: $X devuelto en [método]" en `apps/desktop/src/components/modals/SaleDetailsModal.tsx`
- [x] T017 [P] [US3] Leer `metadata.tip_amount`, `tip_percentage`, `tip_worker_id`, `tip_distribution` y mostrar badge "💰 Propina: $X (Y%) → Trabajador(es)" en `apps/desktop/src/components/modals/SaleDetailsModal.tsx`
- [x] T018 [P] [US3] Misma lógica de cross-change + tip en `apps/shared/components/modals/SaleDetailsModal.tsx`
- [x] T019 [US3] Si `tip_payment_method !== payment_method`: mostrar indicador "Propina pagada en [método]" en ambos `SaleDetailsModal.tsx`

### 4B — CloseSessionModal

- [x] T020 [US3] Sumar cambios entregados por método desde `cash_movements` con "Cambio cruzado" en descripción y mostrar en columna de resumen en `apps/desktop/src/components/modals/CloseSessionModal.tsx`

### 4C — Sales.tsx reconciliación

- [x] T021 [P] [US3] Respetar `tip_payment_method` al separar tips en efectivo vs digital en reconciliación en `apps/shared/features/sales/Sales.tsx`

### 4D — SessionHistory badge

- [x] T022 [P] [US3] Mejorar badge de propinas en tabla de comisiones: distinguir `tip` (ícono corazón) y `tip_split` (ícono grupo) en `apps/desktop/src/components/admin/sessions/SessionHistory.tsx`

**Checkpoint**: Toda la visualización funciona. Historial de ventas, cierre de caja y sesiones muestran cross-change y tips correctamente.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validación final, build, y ajustes de consistencia.

- [x] T023 Validar flujo completo según quickstart.md: cash, transfer, card, mixed, con cross-change, con propina, con ambos
- [x] T024 Ejecutar `pnpm build` y corregir errores de compilación si existen
- [x] T025 Verificar que CloseSessionModal sigue mostrando totales correctos con cambios cruzados (no regresión en cierre de caja normal)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — ejecutar primero. Bloquea todas las fases.
- **US1 (Phase 2)**: Depende de Phase 1. Sin dependencias de otras stories.
- **US2 (Phase 3)**: Depende de Phase 1. Independiente de US1 (tocan secciones distintas de PaymentModal).
- **US3 (Phase 4)**: Depende de Phase 1. Idealmente después de US1+US2 para tener datos reales, pero puede empezar en paralelo con mocks.
- **Polish (Phase 5)**: Depende de US1+US2+US3 completas.

### User Story Dependencies

- **US1 (P1)**: Independiente — solo toca PaymentModal + cash_movements.
- **US2 (P2)**: Independiente — toca PaymentModal (secciones de propinas). Puede implementarse en paralelo con US1 si son distintos desarrolladores.
- **US3 (P3)**: Semi-independiente — lee `sale.metadata` que US1/US2 escriben. Puede avanzar con estructura de datos mockeada.

### Within PaymentModal (US1 + US2)

US1 y US2 modifican el mismo archivo `PaymentModal.tsx` pero en secciones distintas:
- US1: sección de montos recibidos + cambio cruzado (líneas ~1270-1350)
- US2: sección de propinas (líneas ~1060-1120)

**Si es un solo desarrollador**: Completar US1 primero, luego US2 (evitar conflictos de merge).
**Si son dos desarrolladores**: US1 y US2 pueden trabajarse en paralelo con cuidado de no modificar las mismas líneas.

### Parallel Opportunities

```bash
# Fase 1: Un solo archivo, secuencial
Task: "T001 Extender SaleMetadata en apps/desktop/src/types/pos.ts"

# Fase 2 (US1): Secuencial dentro de PaymentModal (mismo archivo)
Tasks: T002 → T003, T004 → T005, T006 → T007, T008

# Fase 3 (US2): Puede correr en paralelo con US1 si son 2 devs
Tasks: T009, T010, T011 → T012, T013 → T014, T015

# Fase 4 (US3): Alta paralelización — archivos distintos
Parallel: T016, T018, T021, T022  (4 archivos diferentes)
         ↓
         T019 (depende de T016 y T018)
         T020 (archivo independiente)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: T001 (SaleMetadata types)
2. Complete Phase 2: T002-T008 (Cross-change)
3. **STOP and VALIDATE**: Probar cambio cruzado con quickstart.md
4. Deploy/demo: "Ya puedes dar cambio en efectivo cuando te pagan por transferencia"

### Incremental Delivery

1. T001 → Tipos listos
2. T002-T008 → US1 funcional → **MVP!**
3. T009-T015 → US2 funcional → Propinas mejoradas
4. T016-T022 → US3 funcional → Todo visible en historial
5. T023-T025 → Polish → Listo para release

### Single Developer Strategy

```
T001 → T002→T003→T004→T005→T006→T007→T008 → T009→T010→T011→T012→T013→T014→T015 → T016→T018→T019→T020→T021→T022 → T023→T024→T025
└── Fase 1 ──└────── Fase 2 (US1) ──────────└────── Fase 3 (US2) ────────────└────────── Fase 4 (US3) ──────────────└─ F5 ─┘
```

### Tiempo estimado

| Phase | Tasks | Estimado |
|---|---|---|
| Phase 1 (Setup) | 1 | 5 min |
| Phase 2 (US1) | 7 | 2-3 horas |
| Phase 3 (US2) | 7 | 2-3 horas |
| Phase 4 (US3) | 7 | 2-3 horas |
| Phase 5 (Polish) | 3 | 1 hora |
| **Total** | **25** | **~8-10 horas** |

---

## Notes

- [P] tasks = different files, no dependencies
- [US1]/[US2]/[US3] label maps task to specific user story for traceability
- PaymentModal es el archivo más crítico (95KB) — cambios mínimos, sin refactor
- Sin migraciones SQL — todo se almacena en JSONB `sales.metadata`
- Validar con `pnpm build` al final de cada fase
- Sin test suite automatizada — validación manual con quickstart.md
