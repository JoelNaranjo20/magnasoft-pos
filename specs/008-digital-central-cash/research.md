# Research: Movimiento Unificado de Cierre en Caja Central

**Feature**: 008-digital-central-cash  
**Date**: 2026-06-09

## Decision 1: Un solo movimiento por sesión (1:1), no múltiples (1:N)

### Decisión
Cada sesión de caja cerrada produce exactamente UN movimiento `income` en `central_cash_movements` con el monto TOTAL. El desglose por método de pago y origen va en una columna `metadata` JSONB.

### Rationale
- **Simplicidad para el dueño**: Una línea por turno = un vistazo. Si hay 3 turnos en un día, hay 3 movimientos, no 6 o 9.
- **Balance correcto**: Sumar el balance de Caja Central es directo — no hay risk de contar doble.
- **Trazabilidad completa**: El metadata JSONB contiene todo el detalle. Si el dueño quiere saber cuánto fue transferencia vs efectivo, expande.
- **Relación 1:1 natural**: Una sesión produce una Transferencia a Caja Central. Tiene sentido conceptual.

### Alternativas consideradas
- **Múltiples movimientos por método (1:N)**: Rechazado por el usuario. Demasiado ruido visual, riesgo de inconsistencia si uno falla. La suma del total es frágil (depende de que todos los movimientos parciales se creen).
- **Una sola columna `amount` sin metadata**: Rechazado. Sin trazabilidad, el dinero en Caja Central es una bolsa negra.

---

## Decision 2: Metadata JSONB como estructura de desglose

### Decisión
Agregar columna `metadata JSONB` con estructura fija:

```json
{
  "cash_sales": 80000,
  "transfer_sales": 50000,
  "card_sales": 0,
  "cash_abonos": 30000,
  "transfer_abonos": 15000,
  "card_abonos": 0,
  "cash_loan_payments": 10000,
  "transfer_loan_payments": 0,
  "cash_other": 0,
  "transfer_other": 0,
  "commissions_paid": 5000
}
```

Todos los campos siempre presentes, con valor 0 si no hay ingresos de ese tipo. Esto hace el frontend predecible (no necesita `?.` ni null checks).

### Rationale
- JSONB es nativo de PostgreSQL, indexable, y flexible.
- El frontend solo lee — no escribe metadata arbitraria.
- Si en el futuro se agrega un nuevo origen (ej. "ingresos por delivery"), solo se agrega un campo al JSON sin migración de schema.

### Alternativas consideradas
- **Columnas dedicadas en la tabla**: Rechazado. Rigidez de schema — requiere migración por cada nuevo campo. JSONB es más flexible para metadata que es inherently "read-only detail".
- **Tabla separada `cash_movement_details`**: Rechazado. Overkill. El metadata solo se lee al expandir, no se consulta con WHERE.

---

## Decision 3: Backfill como RPC PL/pgSQL idempotente

### Decisión
Crear una función `backfill_central_cash_sessions(p_business_id UUID)` que:
1. Itera sobre `cash_sessions` cerradas (`status = 'closed'`) sin movimiento en `central_cash_movements` con ese `session_id`.
2. Para cada una, calcula los totales desde `sales`, `debt_payments`, `worker_loans`, `cash_movements`.
3. Inserta o actualiza el movimiento en `central_cash_movements`.
4. Es idempotente: si el movimiento ya existe, solo actualiza si el monto difiere.

### Rationale
- PL/pgSQL corre dentro de la DB — sin round-trips de red para 100+ sesiones.
- Atómico por sesión dentro de un loop con bloques `BEGIN...EXCEPTION`.
- El frontend solo llama `supabase.rpc('backfill_central_cash_sessions', { p_business_id })`.

---

## Decision 4: Agrupación por día en UI con colapsables

### Decisión
La UI de `CentralCash.tsx` agrupa movimientos por día (usando `created_at::date`). Cada grupo es un acordeón colapsable con:
- Encabezado: fecha, total de ingresos del día, total de egresos, balance neto.
- Body: lista de movimientos de ese día.
- Los movimientos de cierre (con `session_id`) tienen badge "Cierre" y son expandibles para ver metadata.

### Rationale
- La agrupación por día es el patrón mental natural para dueños de negocio: "¿cuánto entró hoy?"
- Colapsable mantiene la vista limpia sin perder detalle.
- No se necesita librería — se implementa con `useState` + Tailwind.
