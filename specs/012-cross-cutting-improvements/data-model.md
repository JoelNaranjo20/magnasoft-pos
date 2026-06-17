# Data Model: Mejoras Transversales

**Feature**: `012-cross-cutting-improvements` | **Date**: 2026-06-15

## New Entity: customer_loyalty_points

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | gen_random_uuid() |
| `business_id` | UUID FK → business | Tenant scoping |
| `customer_id` | UUID FK → customers | UNIQUE, un registro por cliente |
| `points` | INTEGER | DEFAULT 0 |
| `last_activity_at` | TIMESTAMPTZ | DEFAULT now() |
| `status` | TEXT | 'active' \| 'expired', DEFAULT 'active' |

**Migration**: `supabase/migrations/20260615_add_loyalty_points.sql`

**Lifecycle**:
- **Acumular**: INSERT o UPDATE con `points += nuevos_puntos`, `last_activity_at = now()`
- **Canjear**: UPDATE `points -= canjeados`, `last_activity_at = now()`. Si `points < 0` → error.
- **Expirar**: Si `last_activity_at < now() - 6 months` → `status = 'expired'`, `points = 0`.
- **Reactivar**: Si el cliente vuelve a acumular puntos después de expiración → `status = 'active'`, `last_activity_at = now()`.

## Existing Entities Affected

### inventory_movements
Ya existe. Se usa para calcular costo promedio ponderado:
```sql
SELECT COALESCE(SUM(unit_cost * quantity) / NULLIF(SUM(quantity), 0), 0) AS avg_cost
FROM inventory_movements
WHERE product_id = $1 AND type = 'purchase' AND business_id = $2
```

### cash_movements
Ya existe. Nuevo insert desde consumo interno:
```typescript
{
    business_id, session_id, type: 'expense',
    amount: avgCost * quantity,
    payment_method: 'cash',
    description: 'Consumo interno: Aceite 20W50 (3 un.)'
}
```

### products
Ya existe. Se usa `price` como fallback si no hay historial de compras.

## New Interfaces

```typescript
// Consumo interno
interface ProductoConsumoInterno {
    productId: string;
    name: string;
    stock: number;
    avgCost: number;       // costo promedio ponderado
    sellPrice: number;     // precio de venta (solo informativo)
}
```

## Data Flow — Consumo Interno

```
InventoryManager → botón "Consumo Interno"
  → InventoryInternalConsumptionModal
    → calcular avgCost (RPC o query)
    → confirmar cantidad
    → INSERT cash_movements (type='expense', amount=avgCost*qty)
    → INSERT inventory_movements (type='consumption', quantity=-qty, unit_cost=avgCost)
    → UPDATE products.stock -= qty
```

## Data Flow — Puntos

```
Compra completada → INSERT/UPDATE customer_loyalty_points
  → points += ganados, last_activity_at = now()

Canje de premio → UPDATE customer_loyalty_points
  → points -= canjeados, last_activity_at = now()

Carga de perfil / Intento de canje → SELECT customer_loyalty_points
  → si last_activity_at < now() - 6 months → status='expired', points=0
```
