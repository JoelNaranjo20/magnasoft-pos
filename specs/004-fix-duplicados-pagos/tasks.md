# Tareas: Corregir Duplicados y Pagos a Caja Central

**Entrada**: Documentos de diseño de `specs/004-fix-duplicados-pagos/`

**Organización**: Tareas agrupadas por historia de usuario.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: Se puede ejecutar en paralelo (archivos distintos)
- **[Historia]**: US1 (bloquear duplicados), US2 (DELETE real), US3 (pagos a caja central)

---

## Fase 1: Historia 1 — Bloquear creación de duplicados (P1) 🛡️

**Objetivo**: Imposibilitar la creación de clientes duplicados. Quitar "Crear de todos modos".

- [x] T001 [US1] Actualizar `apps/desktop/src/components/admin/config/CustomerCreateModal.tsx`: reemplazar diálogo de 2 botones por lista de coincidencias con solo botón "Usar existente" (sin opción de crear)
- [x] T002 [P] [US1] Actualizar `apps/desktop/src/components/modals/SimpleCustomerModal.tsx`: ídem, quitar `handleCreateAnyway` y botón "Crear de todos modos"
- [x] T003 [P] [US1] Actualizar `apps/desktop/src/components/modals/CustomerVehicleModal.tsx`: ídem, quitar `handleCreateCustomer(true)` y botón "Crear de todos modos"

---

## Fase 2: Historia 2 — DELETE real en unificación (P1) 🗑️

**Objetivo**: Reescribir RPC para DELETE físico + actualizar frontend.

- [x] T004 Reescribir `supabase/migrations/20260603_merge_customers_function.sql`: reemplazar lógica de metadata por DELETE físico después de reasignar relaciones
- [x] T005 [P] Actualizar `apps/desktop/src/components/admin/config/CustomerUnify.tsx`: vista previa advierte "Se eliminarán permanentemente N clientes. Esta acción NO se puede deshacer."
- [x] T006 [P] Quitar filtro `.is('metadata->>merged_into_id', null)` en `apps/desktop/src/components/admin/config/CustomerManager.tsx`
- [x] T007 [P] Quitar filtro `.is('metadata->>merged_into_id', null)` en `apps/desktop/src/components/pos/POSCart.tsx`
- [x] T008 [P] Quitar filtro `.is('metadata->>merged_into_id', null)` en `apps/desktop/src/components/modals/SimpleCustomerModal.tsx`
- [x] T009 [P] Quitar filtro `.is('metadata->>merged_into_id', null)` en `apps/desktop/src/components/modals/CustomerVehicleModal.tsx`

---

## Fase 3: Historia 3 — Pagos a Caja Central siempre (P1) 💰

**Objetivo**: Todos los abonos a deudas de cliente van a `central_cash_movements`. Sin selector UI. Sin requisito de caja abierta.

- [x] T010 [US3] Actualizar `apps/desktop/src/components/finance/CarteraHub.tsx`: `goToCentral = true` para deudas de cliente, eliminar selector `cashTarget`, eliminar requisito `cashSession` para botón de pago
- [x] T011 [P] [US3] Actualizar `apps/desktop/src/components/finance/CreditManagement.tsx`: `goToCentral = true`, eliminar selector `cashTarget`, eliminar validación `!cashSession`
- [x] T012 [P] [US3] Actualizar `apps/web/app/components/modals/RegisterAbonoModal.tsx`: `goToCentral = true`, eliminar selector, eliminar requisito `!activeSession`

---

## Fase 4: Pulido y Validación

- [x] T013 Ejecutar `pnpm build` desde raíz — debe pasar en los 3 paquetes sin errores
- [x] T014 Subir RPC actualizada a Supabase con `npx supabase db push --linked`
