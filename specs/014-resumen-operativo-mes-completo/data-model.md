# Data Model: Resumen Operativo Completo por Mes

**Feature**: 014-resumen-operativo-mes-completo
**Date**: 2026-06-18

## Entities (TypeScript interfaces)

### MonthlyTableRow

Fila de nivel 2 (Mes) en la tabla.

| Field | Type | Description |
|-------|------|-------------|
| `monthKey` | `string` | Clave única `"YYYY-MM"` (ej. `"2026-06"`) |
| `monthLabel` | `string` | Nombre del mes en español (ej. `"Junio"`) |
| `year` | `number` | Año calendario (ej. `2026`) |
| `ingresos` | `number` | Total ingresos (efectivo + transferencia) del mes |
| `egresos` | `number` | Total egresos del mes |
| `neto` | `number` | `ingresos - egresos` |
| `bonos` | `number` | Valor total ($) de canjes de fidelidad del mes |
| `servicios` | `number` | Total facturado en servicios del mes |
| `cashIngresos` | `DetailItem[]` | Lista de ingresos en efectivo (para N3) |
| `transferIngresos` | `DetailItem[]` | Lista de ingresos por transferencia (para N3) |
| `egresosDetalle` | `DetailItem[]` | Lista de egresos (para N3) |
| `serviciosDetalle` | `DetailItem[]` | Servicios vendidos con cantidad y total (para N3) |
| `bonosDetalle` | `DetailItem[]` | Bonos canjeados con cliente y servicio (para N3) |

### YearGroup

Agrupación de nivel 1 (Año).

| Field | Type | Description |
|-------|------|-------------|
| `year` | `number` | Año calendario |
| `months` | `MonthlyTableRow[]` | Meses de este año (ordenados cronológicamente) |
| `totalIngresos` | `number` | Suma de ingresos de todos los meses |
| `totalEgresos` | `number` | Suma de egresos de todos los meses |
| `totalNeto` | `number` | Suma de neto de todos los meses |
| `totalBonos` | `number` | Suma de bonos de todos los meses |
| `totalServicios` | `number` | Suma de servicios de todos los meses |

### GeneralTotal

Fila fija al pie de la tabla.

| Field | Type | Description |
|-------|------|-------------|
| `ingresos` | `number` | Suma de todos los años |
| `egresos` | `number` | Suma de todos los años |
| `neto` | `number` | Suma de todos los años |
| `bonos` | `number` | Suma de todos los años |
| `servicios` | `number` | Suma de todos los años |

## Data Flow

```
Supabase (sales + sale_items + services + central_cash_movements)
        │
        ▼
useCentralCash.fetchAllMonthsData()
        │
        ├─→ fetchMovements() → monthlyBreakdown (ya existe)
        ├─→ fetchBonosDataAllMonths() → Map<monthKey, bonos>
        └─→ fetchVentasServiciosAllMonths() → Map<monthKey, servicios>
                │
                ▼
        computeMonthlyTable() → { yearGroups: YearGroup[], generalTotal: GeneralTotal }
                │
                ▼
        CentralCash.tsx → Tabla 3 niveles
```

## Source Tables (read-only, no changes)

| Table | Used For |
|-------|----------|
| `sales` | Filtrar ventas completadas por mes, obtener `customer.name` |
| `sale_items` | `unit_price > 0` → servicios facturados; `unit_price = 0` → bonos canjeados |
| `services` | `name`, `price` para etiquetas y valor de bonos |
| `central_cash_movements` | Ingresos/egresos por mes (ya existe en `monthlyBreakdown`) |

## State Ownership

| State | Owner | Persisted? |
|-------|-------|-----------|
| `yearGroups`, `generalTotal` | `useCentralCash` hook (derived state) | No, calculado en cada carga |
| `expandedYears` | `CentralCash.tsx` (local `useState`) | No |
| `expandedMonth` | `CentralCash.tsx` (local `useState`) | No |
