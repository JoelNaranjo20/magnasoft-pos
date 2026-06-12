# Data Model: Modales Drill-Down Caja Central

**Feature**: `011-central-cash-drilldown` | **Date**: 2026-06-12

## Entities (all existing, zero new tables/columns)

### Para Efectivo/Transferencia Drill-Down

Fuente: `central_cash_movements` (ya en memoria vía hook)

| Campo | Uso |
|-------|-----|
| `payment_method` | Filtrar `'cash'` vs `'transfer'\|'card'` |
| `type` | Separar ingresos de egresos |
| `amount` | Monto |
| `description` | Etiqueta en el modal |
| `session_id` | Marcar "Cierre de sesión" vs "Manual" |
| `created_at` | Filtro mes en curso, orden |
| `metadata` | Si es `mixed` legacy → ignorado en este modal |

### Para Nómina Semanal

Fuente: `workers`

| Campo | Uso |
|-------|-----|
| `id` | Join con commissions |
| `name` | Mostrar en lista |
| `salary` | `> 0` → asalariado (Nómina Semanal) |
| `status` | Solo `'active'` |

### Para Liquidaciones Diarias

Fuente: `worker_commissions`

| Campo | Uso |
|-------|-----|
| `worker_id` | Join con workers (filtrar solo NO asalariados) |
| `commission_amount` | Monto de la comisión |
| `status` | Solo `'paid'` |
| `paid_at` | Filtro mes en curso |

### Para Cartera

Fuentes: `customer_debts` + `debt_payments` + `customers`

| Campo | Tabla | Uso |
|-------|-------|-----|
| `remaining_amount` | customer_debts | Cartera Total |
| `amount` | debt_payments | Recuperación |
| `payment_method` | debt_payments | Separar efectivo/transferencia |
| `name` | customers (via FK) | Nombre del cliente |
| `created_at` | debt_payments | Filtro mes |

## Nuevas interfaces TypeScript

```typescript
// Para EfectivoTransferenciaDetailModal
interface MovimientoAgrupado {
    tipo: 'ingreso' | 'egreso';
    categoria: string;        // "Cierre de sesión", "Abono", "Préstamo", "Otro", "Base día siguiente"
    descripcion: string;
    monto: number;
    fecha: string;
}

// Para NominaDetailModal
interface TrabajadorAsalariado {
    id: string;
    name: string;
    salary: number;
}
interface ComisionistaDiario {
    id: string;
    name: string;
    totalComisiones: number;
    cantidadComisiones: number;
}
interface SemanaNomina {
    numero: number;
    label: string;           // "Semana 1 (1-7 Jun)"
    subtotal: number;
}
// Props: { isOpen, onClose, asalariados, comisionistas, semanas, totalNomina, loading }

// Para CarteraDetailModal
type CarteraMode = 'total' | 'recuperacion-efectivo' | 'recuperacion-transferencia';
// Props: { isOpen, onClose, mode, items: CarteraItem[], loading }
interface CarteraItem {
    cliente: string;
    monto: number;
    fecha?: string;          // solo para recuperación
}
```

## Queries nuevas en el hook

```typescript
// fetchDetalleEfectivo() — desde movements en memoria
// fetchDetalleTransferencia() — desde movements en memoria
// fetchNominaData() — extendido: workers + worker_commissions
// fetchCarteraDetalle(mode) — customer_debts + debt_payments + customers
```
