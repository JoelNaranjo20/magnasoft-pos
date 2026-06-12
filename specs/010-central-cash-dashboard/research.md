# Research: Dashboard Financiero de Caja Central

**Feature**: `010-central-cash-dashboard`
**Date**: 2026-06-12

## 1. Cálculo de Total de Servicios

### Decision

Consultar `sales` + `sale_items` para sesiones cerradas del mes en curso. No usar `central_cash_movements` para este KPI.

### Rationale

El usuario especificó que Total de Servicios debe reflejar ventas reales de la tabla `sales`, no los ingresos de Caja Central. La tabla `sales` es la fuente canónica de ventas. Filtrando por sesiones cerradas (`cash_sessions.status = 'closed'`) garantiza que solo se cuentan ventas de turnos finalizados.

**Query plan**:
1. `SELECT id FROM cash_sessions WHERE business_id = X AND status = 'closed' AND closed_at >= startOfMonth AND closed_at < endOfMonth`
2. `SELECT id FROM sales WHERE business_id = X AND status = 'completed' AND session_id IN (...) AND created_at >= startOfMonth AND created_at < endOfMonth`
3. `SELECT * FROM sale_items WHERE business_id = X AND sale_id IN (...)`
4. Agrupar por `service_id`/`product_id` → categoría → servicio, sumando `unit_price * quantity`

Este enfoque reutiliza la lógica existente de `fetchCategorySales()`.

### Alternatives considered

- **Usar `central_cash_movements` con `session_id`**: Rechazado porque no distingue ventas de abonos, préstamos ni otros ingresos.
- **Join anidado con `!inner`**: Rechazado — falló en el pasado (007-central-cash-analytics). Las queries separadas son más confiables con PostgREST.
- **Stored procedure/RPC**: Considerado pero descartado — la lógica de agrupación con datos de `services`/`products`/`categories` es más flexible en JS.

## 2. Consulta de Cartera

### Decision

Dos queries independientes:
- **Cartera Total (global)**: `SELECT SUM(remaining_amount) FROM customer_debts WHERE business_id = X AND remaining_amount > 0`
- **Recuperación (mes en curso)**: `SELECT amount, payment_method FROM debt_payments WHERE business_id = X AND created_at >= startOfMonth AND created_at < endOfMonth`, luego agrupar por `payment_method` en JS.

### Rationale

La separación global vs mes refleja la naturaleza de cada métrica: la cartera total es un saldo vivo (todo lo pendiente, sin importar antigüedad), mientras que la recuperación mide actividad del período. `debt_payments` ya tiene `payment_method` (validado en migraciones previas).

### Alternatives considered

- **Todo global**: Rechazado — no permite ver qué se recuperó este mes.
- **Todo del mes**: Rechazado — Cartera Total perdería deudas antiguas.

## 3. Integración con Sistema de Módulos

### Decision

Usar `useModule(moduleKey)` para cada card condicional:
- `module_customers` → Card de Cartera
- `module_commissions` → "Liquidaciones" en Resumen Operativo
- `module_payroll` → Card de Nómina

### Rationale

El sistema de módulos (`apps/shared/store/useModuleStore.ts`) ya expone `useModule(key)` que consulta `business.config` (JSONB). No se requiere nueva lógica. La constitución prohíbe condicionales por `business_type` — esto lo cumple al 100%.

### Implementation note

`useModule` retorna `boolean`. El componente del dashboard lo usa así:
```tsx
const hasCartera = useModule('customers');
const hasCommissions = useModule('commissions');
const hasPayroll = useModule('payroll');
```

Las cards condicionales se renderizan con `{hasCartera && <CarteraCard />}`.

## 4. Estrategia de Migración

### Decision

Reemplazar completamente `CentralCash.tsx` (desktop) y `finanzas/page.tsx` (web) con el nuevo dashboard. El historial mensual actual se extrae a `CentralCashHistoryModal.tsx` en shared. El formulario de ingreso/egreso se extrae a `CentralCashMovementModal.tsx` en desktop.

### Rationale

- **Reemplazo completo** (no complemento): El usuario confirmó esta opción en clarify Q1.
- **Extracción a modales**: Los acordeones mensuales y el formulario son componentes autocontenidos que pueden vivir en modales sin pérdida de funcionalidad. Esto libera espacio en el dashboard para los KPIs.
- **Preservación de lógica**: `CentralCashHistoryModal` reutiliza el 90% del JSX actual de la vista Total General (acordeones, analytics, CategorySalesModal).
- **Shared donde tenga sentido**: El modal de historial es idéntico en desktop y web → va en `apps/shared/components/modals/`. El modal de formulario tiene diferencias (web tiene su propio layout) → cada plataforma el suyo.

### Migration flow

```
CentralCash.tsx actual (900 líneas)
  ├── Hero card + Tabs        → Reemplazado por dashboard layout (nuevo)
  ├── Form (siempre visible)  → CentralCashMovementModal.tsx (nuevo, desktop)
  ├── Monthly accordions      → CentralCashHistoryModal.tsx (nuevo, shared)
  ├── Analytics section       → Se mantiene dentro del modal de historial
  └── Backfill button         → Eliminado (clarify Q1)
```

### Alternatives considered

- **Agregar dashboard como 4ta pestaña**: Rechazado por el usuario (clarify Q1).
- **Dashboard arriba + vista actual abajo**: Rechazado — scroll excesivo, UI redundante.

## 5. Estados de Carga y Error

### Decision

Cada KPI maneja su propio estado de carga (skeleton). Errores de query individuales no bloquean el resto del dashboard.

### Rationale

Con ~10 queries paralelas al cargar el dashboard, es probable que alguna falle o tarde más. Un diseño resiliente muestra skeletons individuales y no un spinner global que bloquee toda la pantalla.

### Implementation

```tsx
// Cada card recibe su propio loading/error state
<CarteraCard total={carteraTotal} loading={carteraLoading} error={carteraError} />
```

Los datos se cargan en un solo `useEffect` con `Promise.allSettled()` (no `Promise.all()`) para que un fallo no tumbe las demás queries.

## 6. Reutilización de fetchCategorySales

### Decision

`fetchCategorySales()` existente se reutiliza sin cambios para el KPI "Total de Servicios". El modal de detalle al hacer clic en Total de Servicios es el `CategorySalesModal` existente.

### Rationale

La función ya consulta `sales` → `sale_items` → `services`/`products`/`categories` y agrupa correctamente. El único cambio necesario es que también se retorne el grand total como valor principal del KPI.

### Implementation

El hook expondrá un nuevo campo `totalServicios` (el grand total del mes) que se calculará como subproducto de `fetchCategorySales()`. La función ya calcula `grandTotal` internamente — solo falta exponerlo como estado separado.
