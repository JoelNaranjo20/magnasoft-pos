# Módulo de Clientes — Gestión y Unificación

**Actualizado**: 2026-06-05

---

## Componentes del Módulo

| Componente | Archivo | Propósito |
|---|---|---|
| `CustomerManager` | `apps/desktop/src/components/admin/config/CustomerManager.tsx` | Tabla principal de gestión (CRUD, búsqueda, paginación) |
| `CustomerCreateModal` | `apps/desktop/src/components/admin/config/CustomerCreateModal.tsx` | Crear nuevo cliente |
| `CustomerEditModal` | `apps/desktop/src/components/admin/config/CustomerEditModal.tsx` | Editar cliente existente |
| `CustomerUnify` | `apps/desktop/src/components/admin/config/CustomerUnify.tsx` | **Unificar clientes duplicados** |
| `CustomerHistoryModal` | `apps/desktop/src/components/modals/CustomerHistoryModal.tsx` | Historial de ventas del cliente |
| `CustomerVehicleManagerModal` | `apps/desktop/src/components/admin/config/CustomerVehicleManagerModal.tsx` | Gestionar vehículos del cliente |
| `CustomerVehicleModal` | `apps/desktop/src/components/modals/CustomerVehicleModal.tsx` | Selección de cliente/vehículo en POS |
| `SimpleCustomerModal` | `apps/desktop/src/components/modals/SimpleCustomerModal.tsx` | Selección rápida de cliente en POS |

---

## Prevención de Duplicados

Desde la spec `004-fix-duplicados-pagos`, la creación de clientes verifica duplicados usando:

1. **Normalización de teléfono** ([`normalizePhone`](../../apps/shared/lib/normalizePhone.ts)): Elimina todo carácter no numérico
2. **Normalización de nombre** ([`normalizeName`](../../apps/shared/lib/normalizeName.ts)): Descompone Unicode NFKD, elimina diacríticos, minúsculas, colapsa espacios, elimina puntuación

Si un cliente nuevo coincide en teléfono o nombre normalizado con uno existente, el sistema **bloquea la creación** y muestra el cliente existente.

---

## Unificación de Clientes

### Flujo de Trabajo

1. **Búsqueda**: El admin escribe nombre o teléfono en el buscador de `CustomerUnify`
2. **Selección**:  
   - 🔘 Radio verde = **Principal** (se conserva, ID intacto)
   - ☑️ Checkbox rojo = **Secundario** (se eliminará)
3. **Vista Previa**: Modal que muestra:
   - 🟢 Cliente principal con valores después de la unificación
   - 🔴 Clientes a eliminar con datos a transferir (ventas, deudas $, puntos, visitas)
   - ✏️ Edición inline de datos del secundario (nombre, teléfono, email)
   - 📊 Resumen de transferencias
4. **Ejecución**: RPC `merge_customers` en PostgreSQL

### Detección Automática

El sistema también detecta duplicados automáticamente:
- **Pasada 1**: Agrupa por teléfono normalizado
- **Pasada 2**: Agrupa por nombre normalizado (clientes no asignados en pasada 1)
- **Fusión**: Grupos solapados se combinan en uno solo

Los grupos aparecen colapsados bajo el buscador con un botón "Usar este grupo".

### RPC `merge_customers`

**Archivo**: [`supabase/migrations/20260603_merge_customers_function.sql`](../../supabase/migrations/20260603_merge_customers_function.sql)

**Parámetros**: `p_target_id` (UUID del cliente principal), `p_source_ids` (UUID[] de clientes a eliminar)

**Proceso atómico** (todo en una transacción PL/pgSQL):

| Paso | Operación |
|---|---|
| 1. Validación | Verifica que target ≠ sources, target existe, mismo `business_id` |
| 2. Transferencia | Suma `loyalty_points` y `total_visits` de sources al target |
| 3. Reasignación FK | `UPDATE sales.customer_id`, `UPDATE customer_debts.customer_id`, `UPDATE vehicles.customer_id` → target |
| 4. Verificación | Confirma que CERO filas quedan huérfanas en sales, debts, vehicles |
| 5. Eliminación | `DELETE FROM customers WHERE id = ANY(p_source_ids)` |
| 6. Retorno | `{ success, message, transfers: { sales, debts, vehicles } }` |

**Seguridad**:
- `SECURITY DEFINER` — se ejecuta con privilegios del owner
- Tenant isolation: valida que todos los sources pertenezcan al mismo `business_id` que el target
- Sin `auth.uid()` — el frontend ya valida que solo admins accedan al botón UNIFICAR

### Datos Transferidos

| Dato | Método |
|---|---|
| Ventas (`sales`) | UPDATE `customer_id` → target |
| Deudas (`customer_debts`) | UPDATE `customer_id` → target |
| Vehículos (`vehicles`) | UPDATE `customer_id` → target |
| Puntos de lealtad | SUM al target |
| Visitas totales | SUM al target |
| Pagos de deudas | Cascada desde `customer_debts` (ya reasignadas) |

### Riesgo de CASCADE

`vehicles` y `customer_debts` tienen `ON DELETE CASCADE` hacia `customers`. Si no se reasignan antes del DELETE, se pierden. El RPC **verifica explícitamente** después de cada UPDATE que cero filas quedan huérfanas. Si encuentra alguna, aborta y retorna error.

---

## CustomerManager — Gestión General

**Archivo**: [`apps/desktop/src/components/admin/config/CustomerManager.tsx`](../../apps/desktop/src/components/admin/config/CustomerManager.tsx)

Funcionalidades:
- Tabla paginada (10 por página) con búsqueda por nombre, teléfono o email
- Columnas: nombre (con avatar inicial), contacto (teléfono + email), fidelización (puntos + visitas), acciones
- Acciones: vehículos, editar, historial, eliminar
- Botones superiores: NUEVO CLIENTE, UNIFICAR (solo admin)
- Delete con confirmación y manejo de error FK (si tiene deudas/ventas/vehículos)
