# Research: Mejoras Transversales

**Feature**: `012-cross-cutting-improvements` | **Date**: 2026-06-15

## 1. Consumo Interno — Costo Promedio Ponderado

### Decision

Calcular `SUM(unit_cost × quantity) / SUM(quantity)` de `inventory_movements` con `type='purchase'` para el producto. Registrar egreso en `cash_movements` (NO en `central_cash_movements` directamente) para que el cierre de sesión lo incluya en el flujo normal.

### Rationale

El costo promedio ponderado es el estándar contable para valuar inventario. Usar `cash_movements` (caja diaria) en vez de `central_cash_movements` mantiene el flujo actual: todo egreso de la sesión se traslada a Caja Central al cerrar caja.

**Query**:
```sql
SELECT SUM(unit_cost * quantity) / NULLIF(SUM(quantity), 0) as avg_cost
FROM inventory_movements
WHERE product_id = $1 AND type = 'purchase' AND business_id = $2
```

### Alternatives
- **Precio de venta (`products.price`)**: Rechazado — inflaría el gasto artificialmente.
- **Último costo de compra (LIFO)**: Rechazado — no refleja bien productos comprados a diferentes precios.
- **Insert directo a `central_cash_movements`**: Rechazado — rompe el flujo caja diaria → cierre → central.

## 2. Vencimiento de Puntos a 6 Meses

### Decision

Nueva tabla `customer_loyalty_points` con campos: `customer_id`, `points`, `last_activity_at`, `status` (active/expired). Trigger o lógica en frontend que al cargar los puntos del cliente verifica `last_activity_at > 6 months ago`. Si expiró → `status = 'expired'`, `points = 0`.

### Rationale

La tabla es mínima y específica. `last_activity_at` se actualiza en cada acumulación (INSERT desde `sales` trigger) y cada canje (UPDATE desde modal de premios). La verificación de vencimiento es O(1) por cliente (un solo campo de fecha).

**Esquema**:
```sql
CREATE TABLE customer_loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES business(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired')),
    UNIQUE(customer_id)
);
```

### Alternatives
- **Campo en `customers`**: Rechazado — mezcla datos de cliente con lógica de lealtad.
- **Tabla de transacciones de puntos**: Sobredimensionado para v1. Se puede migrar después.
- **Job programado (pg_cron)**: Considerado pero postergado — la verificación al cargar el perfil es suficiente.

## 3. Caja Central — Resumen 2 Columnas

### Decision

Reescribir `CentralCashHistoryModal` completamente. Eliminar acordeones mensuales. Nueva estructura:
- Header: totales (Ingresos Efectivo, Ingresos Transferencia, Egresos, Neto)
- Grid 2 columnas: Ingresos Efectivo (izq, fondo verde) + Ingresos Transferencia (der, fondo azul)
- Sección Egresos (full width abajo)
- Sección Ventas por Categoría (con progress bars)
- Sección Servicios Vendidos (cantidad, no monto)

### Rationale

Los acordeones mensuales eran útiles para ver varios meses, pero el administrador casi siempre consulta el mes en curso. La vista 2 columnas da más densidad de información en menos scroll. Las secciones de categorías y servicios ya existían pero estaban escondidas — ahora son parte integral del modal.

**Datos requeridos (ya disponibles en el hook)**:
- `cashMovementsDelMes.ingresos` → columna izq
- `transferMovementsDelMes.ingresos` → columna der
- `egresosDetail` → sección egresos
- `categorySales` → sección categorías (ya existe `fetchCategorySales`)
- **Nuevo**: `serviceSalesCount` — array de `{ name, quantity }` calculado desde `fetchCategorySales`

### Nueva prop para `CentralCashHistoryModal`

```typescript
interface CentralCashHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    cashIngresos: DetailItem[];
    transferIngresos: DetailItem[];
    egresos: DetailItem[];
    categorySales: CategorySalesData[];
    serviceSalesCount: { name: string; quantity: number }[];
    loading: boolean;
    // totales
    totalCash: number;
    totalTransfer: number;
    totalEgresos: number;
    neto: number;
}
```

**Nota**: `serviceSalesCount` se calcula aplanando `categorySales[].services[]` y sumando `quantity` por `serviceName`, ordenado descendente.
