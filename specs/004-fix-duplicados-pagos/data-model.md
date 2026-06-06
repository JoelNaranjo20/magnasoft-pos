# Modelo de Datos: Corregir Duplicados y Pagos a Caja Central

**Funcionalidad**: `004-fix-duplicados-pagos` | **Fecha**: 2026-06-04

## Cambios en Entidades

### 1. `customers` — Simplificación: sin metadata de merge

Se elimina el uso de `metadata.merged_into_id`, `metadata.merged_at`, `metadata.merged_by` y `metadata.merged_from` introducidos en `003-unificar-clientes`.

**Nueva lógica**: Los clientes duplicados se **eliminan físicamente** (DELETE) durante la unificación. No se marcan. Solo existe el cliente principal.

**Cleanup de datos residuales**: Los clientes que ya fueron marcados como unificados en `003` mantienen sus metadatos. Son ignorados (ya estaban filtrados por `.is('metadata->>merged_into_id', null)` en todas las queries). No afectan el nuevo comportamiento.

### 2. `debt_payments` — `cash_session_id` siempre null para clientes

| Columna | Antes | Ahora |
|---|---|---|
| `cash_session_id` | Podía ser UUID de sesión diaria o null | **Siempre null** para pagos de deudas de cliente |

Los pagos de préstamos de trabajadores (`worker_loan_payments`) mantienen su `cash_session_id` sin cambios.

### 3. `central_cash_movements` — Recibe todos los pagos

Cada pago de deuda de cliente inserta un registro:

| Columna | Valor |
|---|---|
| `business_id` | Del negocio actual |
| `type` | `'income'` |
| `amount` | Monto del abono |
| `description` | "Abono a deuda de [nombre cliente] - RD$[monto]" |
| `user_id` | ID del usuario que registró el pago |
| `created_at` | now() |

### 4. `vehicles` — Precaución: ON DELETE CASCADE

El orden de operaciones en `merge_customers` es crítico:

```
Paso 1: UPDATE vehicles SET customer_id = target WHERE customer_id IN (sources)
Paso 2: DELETE FROM customers WHERE id IN (sources)
```

Si se ejecutara DELETE antes de UPDATE, los vehículos se perderían por `ON DELETE CASCADE`.

## Función RPC Actualizada

### `merge_customers` (reemplaza la versión 003)

**Cambios respecto a v1**:
- **Elimina**: pasos de escritura en `metadata` (merged_into_id, merged_from)
- **Agrega**: DELETE de clientes fuente al final
- **Orden garantizado**: ventas → deudas → vehículos → DELETE clientes
- **Retorno**: mismo formato JSON `{success, message, transfers: {sales, debts, vehicles}}`

```sql
CREATE OR REPLACE FUNCTION public.merge_customers(
    p_target_id uuid,
    p_source_ids uuid[],
    p_performed_by uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
-- Validaciones: mismo business, target != source
-- UPDATE sales, customer_debts, vehicles
-- DELETE FROM customers WHERE id IN (p_source_ids)
-- RETURN transfer counts
```

## Queries que se simplifican

Al eliminar el concepto de "marcar como unificado", se remueve el filtro `.is('metadata->>merged_into_id', null)` de estas queries:

| Archivo | Query |
|---|---|
| `CustomerManager.tsx` | `fetchCustomers` |
| `POSCart.tsx` | `handleQuickSearch` |
| `SimpleCustomerModal.tsx` | `handleSearch` |
| `CustomerVehicleModal.tsx` | `handleSearch` |

Ya no es necesario filtrar porque no existen clientes "marcados" — solo existen clientes vivos.
