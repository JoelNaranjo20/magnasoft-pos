# Guía Rápida: Corregir Duplicados y Pagos a Caja Central

**Funcionalidad**: `004-fix-duplicados-pagos` | **Fecha**: 2026-06-04

## Orden de Implementación

1. **RPC**: Actualizar `merge_customers` para hacer DELETE en vez de marcar metadata
2. **Bloqueo total**: Quitar "Crear de todos modos" en los 3 formularios
3. **Simplificar queries**: Remover filtros `.is('metadata->>merged_into_id', null)`
4. **Pagos a central**: Forzar `goToCentral = true` y quitar selector UI
5. **Validación**: `pnpm build` + `pnpm electron:dev`

## Archivos a Modificar

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260603_merge_customers_function.sql` | Reescribir RPC con DELETE en vez de metadata |
| `apps/desktop/src/components/admin/config/CustomerCreateModal.tsx` | Quitar "Crear de todos modos", solo mostrar lista de coincidencias + "Usar existente" |
| `apps/desktop/src/components/modals/SimpleCustomerModal.tsx` | Ídem |
| `apps/desktop/src/components/modals/CustomerVehicleModal.tsx` | Ídem |
| `apps/desktop/src/components/admin/config/CustomerUnify.tsx` | Vista previa advierte eliminación permanente |
| `apps/desktop/src/components/admin/config/CustomerManager.tsx` | Remover filtro `.is()` de fetchCustomers |
| `apps/desktop/src/components/pos/POSCart.tsx` | Remover filtro `.is()` de handleQuickSearch |
| `apps/desktop/src/components/finance/CarteraHub.tsx` | `goToCentral = true`, eliminar selector cashTarget, quitar requisito cashSession |
| `apps/desktop/src/components/finance/CreditManagement.tsx` | `goToCentral = true`, eliminar selector cashTarget, quitar requisito cashSession |
| `apps/web/app/components/modals/RegisterAbonoModal.tsx` | `goToCentral = true`, eliminar selector cashTarget, quitar requisito activeSession |

## Pruebas

- **Dev**: `pnpm electron:dev` desde `apps/desktop/`
- **Build**: `pnpm build` debe pasar en los 3 paquetes
- **Manual**:
  1. Intentar crear cliente duplicado → debe bloquear sin opción de override
  2. Unificar 2 clientes con ventas → debe borrar los fuente, solo queda el principal
  3. Unificar cliente con vehículos → los vehículos no se pierden
  4. Registrar abono a deuda sin caja abierta → funciona, aparece en Caja Central
  5. Registrar abono con caja abierta → va a Caja Central, no a la caja diaria
