---
description: "Task list for Base Diaria de Caja Configurable"
---

# Tasks: Base Diaria de Caja Configurable

**Input**: Design documents from `/specs/018-base-diaria-caja/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: El proyecto no tiene framework de tests. Validación manual vía `pnpm build` + `electron:dev` siguiendo [quickstart.md](./quickstart.md). No se generan tareas de test automatizado.

**Organization**: Tareas agrupadas por user story. Cada story es implementable y verificable de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: US1 / US2 / US3 (mapea a las user stories del spec)
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Monorepo pnpm: `apps/shared/` (store compartida), `apps/desktop/src/` (POS Electron), `docs/` (raíz). Sin `apps/web`, sin `supabase/migrations/`.

---

## Phase 1: Setup (verificación de terreno)

**Purpose**: Confirmar supuestos del plan antes de tocar código. Sin cambios de código.

- [X] T001 Verificar en el esquema Supabase que `business_settings` tiene `UNIQUE (business_id, setting_type)` y políticas RLS `SELECT/INSERT/UPDATE` por `business_id` sin filtrar por `setting_type` (ref: `supabase/migrations/20260207210000_refactor_business_settings.sql` y `20260207213000_fix_business_settings_rls.sql`). Confirmar que NO se requiere migración. → Confirmado en planificación: `UNIQUE (business_id, setting_type)`, RLS por `business_id` sin filtro de tipo. Sin migración.
- [X] T002 Releer los 3 archivos objetivo y anotar los números de línea vigentes: `apps/shared/store/useBusinessStore.ts` (`fetchBusinessProfile`, bloque fetch de `security`), `apps/desktop/src/components/modals/CloseSessionModal.tsx` (prefill `nextDayBase` ~L54, bloque egreso `💵 Base próximo día` ~L366-381 en `handleConfirmClose`), `apps/desktop/src/components/modals/OpenSessionModal.tsx` (estado `amount` ~L12, `handleOpenSession` ~L123).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Exponer `dailyCashBase` en la store compartida. US1 lo escribe; US2 y US3 lo leen.

**⚠️ CRITICAL**: Ninguna user story puede completarse hasta terminar esta fase.

- [X] T003 En `apps/shared/store/useBusinessStore.ts`: añadir `dailyCashBase: number` a la interfaz `BusinessStore` y al estado inicial del `create(...)` con valor `0`. No modificar ninguna propiedad ni firma existente.
- [X] T004 En `apps/shared/store/useBusinessStore.ts`, dentro de `fetchBusinessProfile` (después del bloque que lee `business_settings` `setting_type='security'`): añadir un `SELECT value FROM business_settings WHERE business_id = currentId AND setting_type = 'cash'` con `.maybeSingle()`, y `set({ dailyCashBase: Number(data?.value?.daily_base ?? 0) || 0 })`. (El cuerpo de `fetchBusinessProfile` ya está en un try/catch único.)

**Checkpoint**: `useBusinessStore.getState().dailyCashBase` disponible (0 si no hay ajuste). Las 3 user stories pueden arrancar en paralelo.

---

## Phase 3: User Story 1 - Configurar la Base Diaria de Caja (Priority: P1) 🎯 MVP

**Goal**: Un administrador define una sola vez el monto de base en el panel de Configuración del POS de escritorio y queda persistido por negocio.

**Independent Test**: Configuración → sección Caja → ingresar `100000` → guardar → reabrir el panel y ver `100000`; confirmar fila `business_settings` `setting_type='cash'`, `value={ "daily_base": 100000 }`.

### Implementation for User Story 1

- [X] T005 [P] [US1] En `apps/desktop/src/components/admin/config/GeneralSettings.tsx`: añadir estado `dailyCashBase` (number) y una sección "Caja" con un input numérico "Base Diaria de Caja" (formato de moneda COP sin decimales, mínimo 0). Cargar el valor inicial en `fetchBusinessData` desde `business_settings` `setting_type='cash'` (`value.daily_base`), con fallback a `0` (FR-003) — mismo patrón que la carga de `security`.
- [X] T006 [US1] En `apps/desktop/src/components/admin/config/GeneralSettings.tsx`, en el guardado: `upsert` a `business_settings` con `{ business_id, setting_type: 'cash', value: { daily_base: <number> } }` y `{ onConflict: 'business_id,setting_type' }` (mismo patrón que el `upsert` de `security`, ~líneas 184-189). Tras éxito, `useBusinessStore.setState({ dailyCashBase: <number> })` para refresco optimista sin re-fetch.
- [X] T007 [US1] Validación de entrada en `GeneralSettings.tsx`: coerción a entero ≥ 0; valor vacío/`NaN` se guarda como `0`. Feedback visual de guardado consistente con el resto del formulario.

**Checkpoint**: US1 funcional e independiente — el ajuste persiste y `useBusinessStore.dailyCashBase` refleja el valor guardado.

---

## Phase 4: User Story 2 - La base no entra ni se suma en Caja Central (Priority: P1)

**Goal**: Al cerrar caja, el monto de base para el día siguiente no genera ningún movimiento en la Caja Central y no altera su total (sin descuadre entre días).

**Independent Test**: Con Base Diaria `100.000` y `500.000` de ventas efectivas, cerrar caja contando `600.000`; el Balance Total de Caja Central sube exactamente `500.000`, no aparece ningún movimiento "Base próximo día", y repetir 5 días seguidos no genera deriva (SC-003, SC-004).

### Implementation for User Story 2

- [X] T008 [P] [US2] En `apps/desktop/src/components/modals/CloseSessionModal.tsx`, efecto `fetchTotals`: cambiar el prefill de `nextDayBase` de `cashSession.opening_balance` a `useBusinessStore.getState().dailyCashBase` (fallback `0`), **siempre** (FR-005, aclaración 2026-08-31). Mantener el input editable.
- [X] T009 [US2] En `apps/desktop/src/components/modals/CloseSessionModal.tsx`, `handleConfirmClose`: **eliminar** por completo el bloque `if (safeNextDayBase > 0) { ... INSERT central_cash_movements type:'expense' description: '💵 Base próximo día …' ... }`. NO tocar los `INSERT` de ingreso efectivo/transferencia.
- [X] T010 [US2] En `apps/desktop/src/components/modals/CloseSessionModal.tsx`: conservar el cálculo `safeNextDayBase = Math.max(0, Math.min(nextDayBase, totalCounted))` y seguir incluyendo `next_day_base: safeNextDayBase` en el `metadata` del movimiento de ingreso en efectivo (trazabilidad). Verificar que ninguna otra rama dependa del egreso eliminado.
- [X] T011 [US2] En `apps/desktop/src/components/modals/CloseSessionModal.tsx`, tarjeta "Base Próximo Día": quitar el texto "Se descuenta de Caja Central"; cambiar el texto de ayuda a "Se queda en la registradora para la apertura de mañana". Mantener input, clamp y el mensaje `Se dejarán {monto} en caja para el próximo turno`.
- [X] T012 [US2] En `apps/desktop/src/components/modals/CloseSessionModal.tsx`: gate de PIN al editar "Base Próximo Día" (FR-012). Importar `SecurityPinModal`; al primer intento de cambiar el valor (o al enfocar el input) y si el negocio tiene `business.pin`, mostrar `<SecurityPinModal title="Editar base" description="Ingrese el PIN Maestro para cambiar la base." onSuccess={() => setBaseUnlocked(true)} onCancel={...} />`; hasta desbloquear, el input queda `readOnly` con el valor de `dailyCashBase`. Si no hay PIN configurado, editable directo. `onCancel` / PIN incorrecto → el valor vuelve a `dailyCashBase`.
- [X] T013 [US2] Revisar `handleConfirmClose` (y el nuevo estado del gate de PIN) en busca de shadowing de variables introducido por los cambios (riesgo TDZ con Vite en build de producción — Constitución V).

**Checkpoint**: US2 funcional e independiente — cerrar caja no crea el egreso de base, el total de Caja Central no pierde el monto de la base, y editar la base pide PIN.

---

## Phase 5: User Story 3 - Apertura de caja con base predeterminada (Priority: P2)

**Goal**: Al abrir caja, el "Monto Inicial en Efectivo" ya viene propuesto con la Base Diaria configurada; editarlo pide PIN.

**Independent Test**: Con Base Diaria `100.000`, abrir el modal de Apertura y ver `100.000` pre-cargado; intentar editar → pide PIN; con PIN correcto cambiar a `120.000` y confirmar → `cash_sessions.opening_balance = 120000`. Con Base Diaria `0` → arranca en `0` sin pedir PIN (US3 #1-#4).

### Implementation for User Story 3

- [X] T014 [P] [US3] En `apps/desktop/src/components/modals/OpenSessionModal.tsx`: inicializar el estado `amount` con la Base Diaria — `useEffect` que haga `setAmount(String(useBusinessStore.getState().dailyCashBase || 0))` cuando el valor esté disponible, sin pisar una edición manual en curso. `'0'` cuando la base es 0/indefinida.
- [X] T015 [US3] En `apps/desktop/src/components/modals/OpenSessionModal.tsx`: gate de PIN al editar el monto (FR-012). Importar `SecurityPinModal`; si el negocio tiene `business.pin`, bloquear numpad + input hasta desbloquear con PIN (`<SecurityPinModal title="Editar base" ... onSuccess={() => setAmountUnlocked(true)} />`); sin PIN configurado, editable directo. Cancelar / PIN incorrecto → `amount` vuelve a `dailyCashBase`. `handleOpenSession` sigue usando `parseFloat(amount)` (el valor en pantalla), no la base configurada.

**Checkpoint**: Las 3 user stories funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T016 [P] Actualizar `docs/features/cash-flow.md`: (a) Apertura — el monto inicial se pre-carga con la Base Diaria configurada (editar pide PIN); (b) Cierre — la base ya no baja a Caja Central y no se inserta el movimiento "Base próximo día"; (c) tabla "Caja Central (useCentralCash)" — quitar la fila `CloseSessionModal | expense | Base del día siguiente`; (d) nota del nuevo ajuste `business_settings` `setting_type='cash'` y del gate de PIN.
- [X] T017 [P] (Limpieza opcional, no bloqueante) En `apps/shared/hooks/useCentralCash.ts`, `monthlySummary`: marcar o retirar las ramas inertes `isBaseProximoDia` / `nextDayBaseExpenses` (ya no habrá movimientos que coincidan). Si se retira, verificar que ningún consumidor de `monthlySummary` lea `nextDayBaseExpenses`.
- [X] T018 `pnpm build` en `apps/desktop` y `apps/shared` sin errores de `tsc -b`. Verificar que `apps/web` sigue compilando (código compartido de `useBusinessStore`).
- [ ] T019 (PENDIENTE — validación manual del usuario en `electron:dev`) Ejecutar la validación completa de [quickstart.md](./quickstart.md) en `electron:dev`: SC-001 a SC-005 + los edge cases (incl. gate de PIN y negocio sin PIN) + no regresión de `PaymentModal.tsx` (venta efectivo/transferencia/mixta) y de abrir/cerrar caja repetido.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. **BLOQUEA** las 3 user stories (todas usan `dailyCashBase`).
- **User Stories (Phase 3-5)**: dependen de Foundational. Entre sí son independientes (archivos distintos: `GeneralSettings.tsx` / `CloseSessionModal.tsx` / `OpenSessionModal.tsx`). `SecurityPinModal.tsx` se reutiliza sin modificar.
- **Polish (Phase 6)**: depende de las user stories que se quieran entregar.

### User Story Dependencies

- **US1 (P1)** — escribe `dailyCashBase`. Independiente de US2/US3.
- **US2 (P1)** — lee `dailyCashBase` (funciona con `0` si US1 aún no está). Independiente de US1/US3.
- **US3 (P2)** — lee `dailyCashBase`. Independiente de US1/US2.

### Within Each User Story

- Tareas del mismo archivo → secuenciales.
- Sin modelos/servicios/endpoints (feature de frontend); orden = estado/carga → lógica/persistencia → UI/textos → gate de PIN.

### Parallel Opportunities

- T003 y T004 son el mismo archivo → **secuenciales**.
- Tras Foundational: US1 (T005-T007), US2 (T008-T013) y US3 (T014-T015) pueden ir **en paralelo** (archivos distintos). Los `[P]` marcan la tarea de arranque de cada stream.
- T016 y T017 en paralelo (archivos distintos) durante Polish.

---

## Parallel Example: tras completar Phase 2

```
# Tres streams en paralelo (un dev por stream):
Stream A (US1): T005 → T006 → T007   en apps/desktop/src/components/admin/config/GeneralSettings.tsx
Stream B (US2): T008 → T009 → T010 → T011 → T012 → T013   en apps/desktop/src/components/modals/CloseSessionModal.tsx
Stream C (US3): T014 → T015   en apps/desktop/src/components/modals/OpenSessionModal.tsx
```

---

## Implementation Strategy

### MVP (User Stories P1: US1 + US2)

1. Phase 1 Setup → Phase 2 Foundational (store).
2. US1 (configurar la base) + US2 (que no entre a Caja Central, editar pide PIN).
3. **STOP y VALIDAR**: quickstart §1 y §3. En este punto el requerimiento central del usuario está cubierto.

### Incremental

4. Añadir US3 (apertura con base predeterminada + PIN) → validar quickstart §2.
5. Polish: doc `cash-flow.md`, build, quickstart completo.

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes.
- `CloseSessionModal.tsx` y `OpenSessionModal.tsx` son `// @ts-nocheck` — no se introduce deuda nueva, pero sí verificación anti-shadowing (T013).
- `SecurityPinModal` se reutiliza tal cual (`apps/desktop/src/components/modals/SecurityPinModal.tsx`, props `onSuccess`/`onCancel`/`title`/`description`, valida contra `business.pin`).
- No tocar `PaymentModal.tsx`. No tocar `apps/web`. Sin migración SQL.
- Commit por tarea o por grupo lógico; mensajes Conventional Commits (`feat(caja)`, `feat(shared)`, `docs(caja)`).
