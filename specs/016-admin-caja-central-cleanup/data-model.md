# Data Model: Limpieza de Caja Central

**Feature**: 016-admin-caja-central-cleanup
**Date**: 2026-06-25

## Entities

### central_cash_movements (existing, no schema change)

Tabla de movimientos de ingresos y egresos de la caja central. **No se modifica su estructura.**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| `business_id` | UUID | NOT NULL, FK → businesses | Tenant isolation |
| `type` | TEXT | NOT NULL, CHECK IN ('income','expense') | Tipo de movimiento |
| `amount` | DECIMAL(10,2) | NOT NULL | Monto en pesos |
| `description` | TEXT | NOT NULL | Motivo o descripción del movimiento |
| `payment_method` | TEXT | NULLABLE, CHECK IN ('cash','transfer','card','mixed') | Método de pago |
| `session_id` | UUID | NULLABLE, FK → cash_sessions | Sesión de caja asociada |
| `metadata` | JSONB | NULLABLE | Metadatos adicionales (ej. desglose mixed) |
| `user_id` | UUID | NULLABLE, FK → auth.users | Usuario que creó el movimiento |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Fecha de creación |

**RLS**: `business_id = get_my_business_id()` para operaciones normales. La RPC de limpieza usa `SECURITY DEFINER` para bypass.

### profiles (existing, read-only access)

Tabla de perfiles de usuario en schema `public`. Solo se lee para resolver `user_id` → `full_name`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK, FK → auth.users |
| `full_name` | TEXT | Nombre completo del usuario |
| `email` | TEXT | Email (fallback si full_name es NULL) |

### reset_business_data_modules (RPC modificada)

**Nuevo parámetro**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `p_delete_central_cash` | BOOLEAN | FALSE | Controla la limpieza de `central_cash_movements` |

**Cambio de comportamiento**:
- Antes: `central_cash_movements` se borraba dentro del bloque `IF p_delete_cash THEN`.
- Ahora: `central_cash_movements` se borra en su propio bloque `IF p_delete_central_cash THEN`.
- La eliminación de `central_cash_movements` se remueve del bloque `p_delete_cash`.

### CentralMovement (TypeScript interface, modificada)

**Nuevo campo**:

```typescript
export interface CentralMovement {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    payment_method: 'cash' | 'transfer' | 'card' | 'mixed' | null;
    session_id: string | null;
    metadata: CentralCashMetadata | null;
    created_at: string;
    user_id: string;
    user_name: string | null;  // NEW: resolved from profiles.full_name
}
```

### purgeBusinessData options (TypeScript, modificada)

**Nuevo campo**:

```typescript
{
    sales?: boolean;
    cash?: boolean;
    centralCash?: boolean;  // NEW
    customers?: boolean;
    workers?: boolean;
    products?: boolean;
    queue?: boolean;
}
```

## Relationships

```
central_cash_movements.user_id ──→ auth.users.id
                                       │
                                       └──→ profiles.id
                                            └── profiles.full_name (resolución en frontend)

reset_business_data_modules(p_delete_central_cash: TRUE)
    └── DELETE FROM central_cash_movements WHERE business_id = p_business_id
```

## State Transitions

No hay transiciones de estado en este feature. Las operaciones son:

1. **Consulta de perfiles**: Lectura de `profiles` filtrada por los `user_id` presentes en los movimientos.
2. **Limpieza de Caja Central**: DELETE directo de `central_cash_movements` por `business_id`.
3. **UI del checkbox**: Estado booleano local (no persistido).
