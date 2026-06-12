# Research: Modales Drill-Down Caja Central

**Feature**: `011-central-cash-drilldown` | **Date**: 2026-06-12

## 1. Datos para Modal Efectivo/Transferencia

### Decision

Filtrar `central_cash_movements` del hook por `payment_method` + mes en curso (`currentMonthRange()`). Separar en ingresos (type='income') y egresos (type='expense'). El neto debe coincidir con el KPI (`cashBalance` / `transferBalance` para el mes).

### Rationale

Los KPIs actuales (`cashBalance`, `transferBalance`) son globales. Pero el usuario pidió drill-down del **mes en curso** (clarify Q1). La solución: usar `useMemo` sobre `movements` para computar ingresos/egresos del mes filtrados por método. El modal recibe ese array precalculado.

**Query plan (sin queries nuevas — todo desde `movements` ya en memoria)**:
```ts
const cashMovementsDelMes = useMemo(() => movements.filter(m =>
  (m.payment_method === 'cash' || m.payment_method === null) &&
  m.created_at >= startOfMonth && m.created_at < endOfMonth
), [movements]);
```

### Alternatives
- **Nuevas queries a DB**: Descartado — innecesario, ya tenemos `movements` en el hook.
- **RPC**: Overkill para un filtro simple.

## 2. Modal de Nómina — Separación Asalariados vs Comisionistas

### Decision

Dos queries en paralelo:
1. `workers` con `status='active'` → separar en `salary > 0` (asalariados) y `salary = 0 OR NULL` (comisionistas diarios)
2. `worker_commissions` con `status='paid'` en el mes → filtrar solo para `worker_id` de comisionistas

### Rationale

No hay flag `payment_type` en workers. La heurística `salary > 0 = asalariado` es el mejor proxy disponible. Si un trabajador tiene ambas cosas (salario + comisiones), aparece en las dos secciones (edge case documentado en spec).

**Semanas del mes**: `Math.ceil(daysInMonth / 7)` → 4 o 5. Cada semana = total ÷ semanas. Es una estimación — no hay tabla de pagos reales.

## 3. Modal de Cartera — 3 modos en 1 componente

### Decision

Un solo `CarteraDetailModal` con prop `mode: 'total' | 'recuperacion-efectivo' | 'recuperacion-transferencia'`.

- `total`: `customer_debts` con `remaining_amount > 0` + join a `customers(name)`. Orden: mayor deuda primero.
- `recuperacion-efectivo`: `debt_payments` del mes con `payment_method='cash'` + join a `customers(name)` + `customer_debts`.
- `recuperacion-transferencia`: igual con `payment_method='transfer'|'card'`.

### Rationale

Las 3 vistas comparten estructura (lista de items con nombre, monto, fecha). Un solo componente con switch interno evita duplicar ~150 líneas de JSX de modal (header, footer, scroll, estados vacíos).

## 4. Extensión de CashDashboardDetailModal

### Decision

Agregar prop `showIncomes` (boolean, default false). Cuando es true, el modal muestra secciones "Ingresos" y "Egresos" en vez de solo egresos. Usado por el drill-down de Efectivo/Transferencia.

### Alternatives
- **Crear modal nuevo**: Descartado — 90% del JSX es idéntico (header, lista, footer). Solo cambian los datos.
- **Pasar items mixtos**: Descartado — pierde la separación visual ingresos vs egresos.

## 5. Estrategia de integración

Los modales nuevos se conectan a los KPIs existentes en `CentralCash.tsx` y `page.tsx` agregando `onClick` handlers donde no existían:

| KPI | Actualmente cliqueable? | Cambio |
|-----|:---:|---|
| Efectivo Disponible | ❌ | Agregar onClick → `EfectivoTransferenciaDetailModal` |
| Transferencia Disponible | ❌ | Agregar onClick → `EfectivoTransferenciaDetailModal` |
| Egresos | ✅ (ya) | Sin cambios |
| Liquidaciones | ✅ (ya) | Sin cambios en UI, datos ya vienen del hook |
| Total Nómina | ❌ | Agregar onClick → `NominaDetailModal` |
| Cartera Total | ❌ | Agregar onClick → `CarteraDetailModal mode='total'` |
| Recup. Efectivo | ❌ | Agregar onClick → `CarteraDetailModal mode='recuperacion-efectivo'` |
| Recup. Transferencia | ❌ | Agregar onClick → `CarteraDetailModal mode='recuperacion-transferencia'` |
