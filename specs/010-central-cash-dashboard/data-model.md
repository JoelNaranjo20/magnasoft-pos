# Data Model: Dashboard Financiero de Caja Central

**Feature**: `010-central-cash-dashboard`
**Date**: 2026-06-12

## Entities (existing DB tables, no new migrations)

### central_cash_movements
| Field | Type | Used For |
|-------|------|----------|
| `id` | UUID PK | — |
| `business_id` | UUID FK → business | Tenant scoping |
| `type` | `'income' \| 'expense'` | Balances, Egresos |
| `amount` | DECIMAL(10,2) | Todos los KPIs de balance |
| `description` | TEXT | Clasificación (abono, base próximo día, comisión) |
| `payment_method` | `'cash' \| 'transfer' \| 'card' \| 'mixed' \| null` | Balances por método |
| `session_id` | UUID FK → cash_sessions | Conteo de sesiones, Total Servicios |
| `metadata` | JSONB | Desglose detallado |
| `created_at` | TIMESTAMPTZ | Filtro por mes |
| `user_id` | UUID FK → auth.users | Trazabilidad |

### sales
| Field | Type | Used For |
|-------|------|----------|
| `id` | UUID PK | Join con sale_items |
| `business_id` | UUID FK → business | Tenant scoping |
| `session_id` | UUID FK → cash_sessions | Filtrar por sesiones cerradas |
| `total_amount` | DECIMAL(10,2) | Total Servicios |
| `status` | `'completed' \| 'cancelled'` | Solo completed |
| `payment_method` | TEXT | — |
| `created_at` | TIMESTAMPTZ | Filtro por mes |

### sale_items
| Field | Type | Used For |
|-------|------|----------|
| `id` | UUID PK | — |
| `business_id` | UUID FK → business | Tenant scoping |
| `sale_id` | UUID FK → sales | Join con sales |
| `service_id` | UUID FK → services | Agrupación por servicio |
| `product_id` | UUID FK → products | Agrupación por producto |
| `quantity` | INTEGER | Multiplicador para total |
| `unit_price` | DECIMAL(10,2) | `unit_price × quantity = total` |

### customer_debts
| Field | Type | Used For |
|-------|------|----------|
| `id` | UUID PK | — |
| `business_id` | UUID FK → business | Tenant scoping |
| `remaining_amount` | DECIMAL(10,2) | Cartera Total (SUM where > 0) |
| `customer_id` | UUID FK → customers | — |

### debt_payments
| Field | Type | Used For |
|-------|------|----------|
| `id` | UUID PK | — |
| `business_id` | UUID FK → business | Tenant scoping |
| `amount` | DECIMAL(10,2) | Recuperación Efectivo/Transferencia |
| `payment_method` | TEXT (`'cash' \| 'transfer' \| 'card'`) | Agrupación por método |
| `created_at` | TIMESTAMPTZ | Filtro por mes |

### worker_commissions
| Field | Type | Used For |
|-------|------|----------|
| `id` | UUID PK | — |
| `business_id` | UUID FK → business | Tenant scoping |
| `commission_amount` | DECIMAL(10,2) | Liquidaciones |
| `status` | `'paid' \| 'pending'` | Solo paid para el mes |
| `paid_at` | TIMESTAMPTZ | Filtro por mes (fecha de pago) |

### workers
| Field | Type | Used For |
|-------|------|----------|
| `id` | UUID PK | — |
| `business_id` | UUID FK → business | Tenant scoping |
| `salary` | DECIMAL(10,2) | Total Nómina |
| `status` | TEXT (`'active' \| 'inactive'`) | Solo activos |
| `name` | TEXT | — |

### cash_sessions
| Field | Type | Used For |
|-------|------|----------|
| `id` | UUID PK | Join con sales |
| `business_id` | UUID FK → business | Tenant scoping |
| `status` | `'open' \| 'closed'` | Solo cerradas |
| `closed_at` | TIMESTAMPTZ | Filtro por mes |

## TypeScript Interfaces (new/extended)

### DashboardData (new)
```typescript
interface DashboardData {
    // Columna izquierda (ya existen en el hook)
    cashBalance: number;
    transferBalance: number;
    totalBalance: number;

    // Columna derecha — Resumen Operativo (nuevos en el hook)
    totalServicios: number;
    totalServiciosLoading: boolean;
    egresosDelMes: number;
    liquidacionesDelMes: number;

    // Columna derecha — Cartera (nuevos en el hook)
    carteraTotal: number;
    carteraTotalLoading: boolean;
    recuperacionEfectivo: number;
    recuperacionTransferencia: number;

    // Columna derecha — Nómina (nuevo en el hook)
    nominaTotal: number;
    nominaTotalLoading: boolean;
}
```

### CentralCashHistoryModal Props (new)
```typescript
interface CentralCashHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    movements: CentralMovement[];
    monthlySummary: MonthlySummaryEntry[];
    loading: boolean;
    // Para analytics
    categorySales: CategorySalesData[];
    categorySalesLoading: boolean;
    fetchCategorySales: (monthKey: string) => Promise<CategorySalesData[]>;
}
```

### CentralCashMovementModal Props (new, desktop)
```typescript
interface CentralCashMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    addMovement: (type: 'income' | 'expense', amount: number, description: string, paymentMethod: 'cash' | 'transfer') => Promise<{ success: boolean; error?: any }>;
}
```

### CashDashboardDetailModal Props (new, shared)
```typescript
interface CashDashboardDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: DetailItem[];
    loading: boolean;
}

interface DetailItem {
    label: string;
    amount: number;
    date?: string;
    description?: string;
}
```

## Relationships

```
cash_sessions ──< sales ──< sale_items ──< services ──< categories
                                        ──< products ──< categories

cash_sessions ──< debt_payments
cash_sessions ──< central_cash_movements

customer_debts ──< debt_payments

workers ──< worker_commissions
workers ──< cash_sessions (worker_id)
```

## Data Flow (Dashboard Load)

```
useEffect(businessId) →
  Promise.allSettled([
    fetchMovements(),           // → cashBalance, transferBalance, totalBalance, monthlySummary
    fetchTotalServicios(),      // → totalServicios (sales + sale_items de sesiones cerradas)
    fetchCarteraTotal(),        // → carteraTotal (SUM remaining_amount)
    fetchRecuperacion(),        // → recuperacionEfectivo, recuperacionTransferencia
    fetchLiquidaciones(),       // → liquidacionesDelMes
    fetchNomina(),              // → nominaTotal
    fetchCategorySales(month),  // → categorySales (para modal de Total Servicios)
  ])
```
