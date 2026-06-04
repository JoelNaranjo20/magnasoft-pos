# Modelo de Datos: Unificar Clientes Duplicados

**Funcionalidad**: `003-unificar-clientes` | **Fecha**: 2026-06-03

## Cambios en Entidades

### 1. `customers` — Extendido vía `metadata` JSONB

Sin nuevas columnas. La columna existente `metadata JSONB DEFAULT '{}'` gana nuevas claves.

**Nuevas claves de metadata en cliente fuente (unificado)**:

| Clave | Tipo | Descripción |
|---|---|---|
| `merged_into_id` | `string` (UUID) | ID del cliente que absorbió este registro |
| `merged_at` | `string` (ISO 8601) | Marca de tiempo de la operación de unificación |
| `merged_by` | `string` (UUID) | ID del usuario admin que ejecutó la unificación |

**Nuevas claves de metadata en cliente destino (sobreviviente)**:

| Clave | Tipo | Descripción |
|---|---|---|
| `merged_from` | `Array<{id: string, at: string, by: string}>` | Historial de clientes unificados dentro de este |

**Transiciones de estado**:

```
Cliente Activo ──[unificar como fuente]──> Cliente Unificado (tiene merged_into_id)
                                               │
                                               ├── No visible en búsquedas regulares
                                               ├── No seleccionable en POS
                                               ├── No seleccionable como destino de unificación
                                               └── Visible solo en vista Unificar (auditoría)
```

**Filtro de consulta para clientes activos**:
```sql
-- Solo clientes activos (no unificados)
WHERE metadata->>'merged_into_id' IS NULL
```

### 2. `sales` — Sin cambio de esquema

El FK `customer_id` se reasigna durante la unificación. Sin nuevas columnas.

**Restricción**: `sales_customer_id_fkey` referencia `customers(id)` sin `ON DELETE CASCADE` — el FK sobrevive después de la unificación ya que la fila del cliente fuente se preserva (solo se marca como unificado).

### 3. `customer_debts` — Sin cambio de esquema

El FK `customer_id` se reasigna durante la unificación. Sin nuevas columnas.

### 4. `vehicles` — Precaución: ON DELETE CASCADE

El `vehicles_customer_id_fkey` tiene `ON DELETE CASCADE`. Como los clientes nunca se eliminan (solo se marcan como unificados), esto no se dispara. Sin embargo, el RPC de unificación debe reasignar vehículos al cliente destino para mantener la integridad referencial.

### 5. Log de Auditoría — Almacenado en `customers.metadata`

Sin tabla de auditoría dedicada. El historial de unificación se registra en el array `metadata.merged_from` del cliente destino:

```json
{
  "loyalty_opt_out": false,
  "merged_from": [
    {
      "id": "uuid-fuente-1",
      "at": "2026-06-03T15:30:00Z",
      "by": "uuid-admin"
    },
    {
      "id": "uuid-fuente-2",
      "at": "2026-06-03T15:31:00Z",
      "by": "uuid-admin"
    }
  ]
}
```

## Nueva Función de Base de Datos

### `merge_customers`

**Propósito**: Unificar atómicamente uno o más registros de cliente en un cliente destino.

**Firma**:
```sql
FUNCTION public.merge_customers(
    p_target_id uuid,
    p_source_ids uuid[],
    p_performed_by uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
```

**Tipo de retorno**: `jsonb`
```json
{
  "success": true,
  "message": "2 cliente(s) unificados exitosamente",
  "transfers": {
    "sales": 5,
    "debts": 2,
    "vehicles": 1
  }
}
```

**Pasos de validación** (dentro de la función):
1. Verificar que `p_target_id` no está en `p_source_ids`
2. Verificar que `p_target_id` no está ya unificado (`metadata->>'merged_into_id' IS NULL`)
3. Verificar que todos los `p_source_ids` pertenecen al mismo `business_id` que el target (aislamiento de tenant)
4. Reasignar `sales.customer_id`, `customer_debts.customer_id`, `vehicles.customer_id` de cada fuente al target
5. Actualizar el `metadata` de cada fuente con `merged_into_id`, `merged_at`, `merged_by`
6. Agregar entradas de unificación al `metadata.merged_from` del target
7. Retornar contadores de transferencias

## Nuevas Utilidades Compartidas

### `normalizePhone(phone: string): string`

- Ubicación: `apps/shared/lib/normalizePhone.ts`
- Elimina todo carácter no numérico
- Retorna string vacío si la entrada es vacía/nula/indefinida
- Ejemplo: `"(809) 555-1234"` → `"8095551234"`

### `normalizeName(name: string): string`

- Ubicación: `apps/shared/lib/normalizeName.ts`
- Normalización Unicode NFKD (elimina acentos)
- Minúsculas, trim, colapsa espacios múltiples
- Elimina puntuación común: `. , ; : - _`
- Retorna string vacío si la entrada es vacía/nula/indefinida
- Ejemplo: `"  María  José-Rodríguez. "` → `"maria jose rodriguez"`
