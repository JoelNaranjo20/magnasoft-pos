# Investigación: Corregir Duplicados y Pagos a Caja Central

**Funcionalidad**: `004-fix-duplicados-pagos` | **Fecha**: 2026-06-04

## Decisión 1: Bloqueo total de duplicados — eliminar opción "Crear de todos modos"

**Decisión**: Eliminar completamente la opción de override (`duplicate_override`) en los 3 formularios de creación. Si hay coincidencia por nombre normalizado o teléfono normalizado, bloquear la creación sin excepción y mostrar los clientes existentes.

**Justificación**:
- El usuario explícitamente pide que no se puedan crear duplicados bajo ninguna circunstancia.
- La opción "Crear de todos modos" introducida en `003-unificar-clientes` permitía al cajero ignorar la advertencia — esto perpetúa el problema.
- Con la normalización de nombre/teléfono ya implementada en `003`, la detección es robusta. El único cambio necesario es quitar el botón "Crear de todos modos" y que `checkDuplicates` retorne las coincidencias sin opción de bypass.

**Archivos a modificar**:
- `CustomerCreateModal.tsx` — reemplazar diálogo de 2 botones por alerta informativa con lista de coincidencias y botón "Usar existente"
- `SimpleCustomerModal.tsx` — ídem
- `CustomerVehicleModal.tsx` — ídem

**Alternativas consideradas**:
- Mantener el override con flag de auditoría — rechazado: el usuario no quiere ningún duplicado nuevo, punto.
- UNIQUE constraint en BD — rechazado: el teléfono es nullable, y el nombre puede tener variaciones que solo la normalización detecta.

## Decisión 2: DELETE físico en vez de "marcar como unificado"

**Decisión**: Reescribir `merge_customers` RPC para que haga DELETE de los clientes fuente después de reasignar todas sus relaciones. Eliminar el uso de `metadata.merged_into_id` y `metadata.merged_from`.

**Justificación**:
- El usuario quiere un solo cliente con un solo ID. El enfoque actual de "marcar" deja los duplicados en la BD como registros zombie.
- Las deudas y metadatos deben apuntar al mismo ID real, no a un cliente marcado como "unificado".
- El orden de operaciones en la nueva RPC: (1) reasignar `sales.customer_id`, (2) reasignar `customer_debts.customer_id`, (3) reasignar `vehicles.customer_id`, (4) DELETE de los clientes fuente, (5) retornar conteo de transferencias.
- El paso 3 antes del paso 4 es crítico: `vehicles` tiene `ON DELETE CASCADE` sobre `customer_id`. Si se borra el cliente antes de reasignar, los vehículos se pierden.

**Nueva RPC `merge_customers_v2`** (o reemplazar la existente):
```sql
-- Orden de operaciones:
-- 1. Validar mismo business_id
-- 2. Validar target != source
-- 3. UPDATE sales SET customer_id = target WHERE customer_id IN (sources)
-- 4. UPDATE customer_debts SET customer_id = target WHERE customer_id IN (sources)
-- 5. UPDATE vehicles SET customer_id = target WHERE customer_id IN (sources)
-- 6. DELETE FROM customers WHERE id IN (sources)
-- 7. RETURN conteos
```

**Alternativas consideradas**:
- Soft-delete con flag `status = 'deleted'` — rechazado: el usuario quiere eliminación real, no marcar.
- Mantener `metadata` y filtrar en queries — rechazado: ya implementado en `003` y el usuario explícitamente pide borrar, no filtrar.

## Decisión 3: Simplificar UI de unificación

**Decisión**: Eliminar el concepto de "marcar como unificado" del frontend. Simplificar `CustomerUnify.tsx` para reflejar eliminación permanente.

**Justificación**:
- Si la RPC hace DELETE, el frontend no necesita mostrar estados "Unificado", ni `merged_into_id`, ni trazabilidad de merge chain.
- La vista previa debe advertir claramente: "Se eliminarán permanentemente N clientes. Esta acción NO se puede deshacer."
- Después de la unificación, los clientes eliminados simplemente desaparecen de todas las listas (ya no existen en BD).
- Se elimina el filtro `.is('metadata->merged_into_id', null)` de las queries porque ya no habrá clientes marcados — solo existen clientes activos.

**Archivos a modificar**:
- `CustomerUnify.tsx` — simplificar vista previa y overlay de éxito
- `CustomerManager.tsx` — quitar filtro `.is()` (ya no necesario)
- `POSCart.tsx` — quitar filtro `.is()` (ya no necesario)
- `SimpleCustomerModal.tsx` — quitar filtro `.is()`
- `CustomerVehicleModal.tsx` — quitar filtro `.is()`

**Alternativas consideradas**:
- Mantener el filtro por si acaso — rechazado: si la RPC hace DELETE, el filtro es código muerto. YAGNI.

## Decisión 4: Pagos a Caja Central siempre

**Decisión**: Forzar `goToCentral = true` para todos los pagos de deudas de clientes. Eliminar el selector UI de destino. Eliminar la dependencia de `cashSession` para permitir abonos sin caja abierta.

**Justificación**:
- Regla de negocio explícita del usuario: todos los pagos de créditos van a Caja Central.
- Simplifica la operación: el cajero no tiene que elegir destino.
- Permite pagos incluso si no hay caja diaria abierta (útil para admin en finanzas).
- Los pagos de préstamos de trabajadores NO se modifican (FR-010).

**Cambios por archivo**:

`CarteraHub.tsx`:
- `goToCentral` siempre `true` para deudas de cliente
- Quitar selector UI de `cashTarget`
- Eliminar `cashSession` como requisito para el botón de pago
- Pasar `p_cash_session_id: null` al RPC

`CreditManagement.tsx`:
- `goToCentral` siempre `true`
- Quitar selector UI de `cashTarget`
- Eliminar validación `!cashSession` que bloquea el botón

`RegisterAbonoModal.tsx` (web):
- `goToCentral` siempre `true`
- Quitar selector UI
- Eliminar validación `!activeSession`

**Alternativas consideradas**:
- Mantener opción para créditos de hoy — rechazado: el usuario quiere todos a central sin excepción.
- Crear una "sesión de caja central" — rechazado: no existe ese concepto en el schema y crearlo sería sobre-ingeniería.

## Decisión 5: No modificar préstamos de trabajadores

**Decisión**: Los pagos de `worker_loan_payments` mantienen su lógica actual (requieren `cashSession`).

**Justificación**:
- FR-010 explícitamente lo excluye.
- Los préstamos a trabajadores son un flujo distinto con su propia tabla y RPC.
- El usuario solo mencionó "pagos a créditos" (deudas de clientes).

## Decisión 6: Migración de BD

**Decisión**: Reescribir `merge_customers` con `CREATE OR REPLACE`. Sin nueva migración — se actualiza el archivo existente `20260603_merge_customers_function.sql`.

**Justificación**:
- La función ya existe en Supabase. `CREATE OR REPLACE` la actualiza atómicamente.
- No se necesitan nuevas columnas ni tablas.
- Al eliminar clientes (no marcarlos), los campos `merged_into_id` y `merged_from` en metadata dejan de usarse — pero no causan errores si quedan residuales en clientes ya marcados. Se puede agregar un cleanup opcional.
