# Phase 1 — Data Model: Base Diaria de Caja

No hay cambios de esquema. Esta sección describe la forma de los datos y los cambios de
**comportamiento** sobre entidades existentes.

## Entidad: Ajuste de Caja del Negocio

**Almacenamiento**: fila en `business_settings` (tabla existente).

| Campo | Valor |
|---|---|
| `business_id` | UUID del negocio (RLS lo fuerza al negocio del perfil autenticado) |
| `setting_type` | `'cash'` (constante) |
| `value` | JSONB: `{ "daily_base": number }` |

**Reglas**:
- `daily_base` es un entero ≥ 0 (pesos colombianos, sin decimales).
- Ausencia de la fila ⇒ `daily_base` se interpreta como `0` (sin base retenida).
- Se escribe con `upsert(..., { onConflict: 'business_id,setting_type' })`.
- Una sola fila `cash` por negocio (garantizado por `UNIQUE (business_id, setting_type)`).

## Store: `useBusinessStore` (apps/shared)

**Propiedad nueva**:

| Propiedad | Tipo | Default | Origen |
|---|---|---|---|
| `dailyCashBase` | `number` | `0` | `business_settings` `setting_type='cash'` → `value.daily_base`, leído en `fetchBusinessProfile` |

**Sin cambios** en: `id`, `name`, `businessType`, `logoUrl`, `protectedModules`,
`config`, `isModuleEnabled`, `fetchBusinessProfile` (firma), `subscribeToChanges`,
`unsubscribeFromChanges`.

**Actualización**: `GeneralSettings.tsx` hace `useBusinessStore.setState({ dailyCashBase })`
tras un guardado exitoso (refresco optimista, sin re-fetch).

## Entidad existente: `cash_sessions`

Sin cambios de esquema.

| Campo | Cambio de comportamiento |
|---|---|
| `opening_balance` | Su valor **por defecto** al abrir pasa a originarse de `dailyCashBase` (antes: entrada manual desde `0`). Sigue siendo editable en la Apertura; se guarda el valor real con que se abrió. |

## Entidad existente: `central_cash_movements`

Sin cambios de esquema. Cambios de comportamiento en el **Cierre de Caja**:

| Movimiento | Antes | Después (018) |
|---|---|---|
| Ingreso efectivo (`type:'income'`, `payment_method:'cash'`) | `amount = cashIngresos`; `metadata.next_day_base` presente | **Igual** (`amount = cashIngresos`), `metadata.next_day_base` sigue presente para trazabilidad |
| Ingreso transferencia (`type:'income'`, `payment_method:'transfer'`) | `amount = transferIngresos` | **Igual, sin cambios** |
| Egreso "💵 Base próximo día" (`type:'expense'`, `payment_method:'cash'`) | Se insertaba con `amount = safeNextDayBase` | **ELIMINADO** — ya no se inserta ningún movimiento por la base |

**Invariante resultante**: el total de Caja Central (`Σ income − Σ expense`) deja de
verse afectado por la base. En días consecutivos con `opening_balance == dailyCashBase`,
`Σ income (efectivo)` = suma de depósitos reales ⇒ descuadre por base = 0.

## Hook existente: `useCentralCash` (apps/shared)

Sin cambios funcionales requeridos. Nota: `monthlySummary.nextDayBaseExpenses` y la
detección `isBaseProximoDia` quedan como ramas inertes (no habrá movimientos que
coincidan). Limpieza opcional, no bloqueante.

## Flujo de datos (resumen)

```
Configuración (GeneralSettings)
   │  upsert business_settings {setting_type:'cash', value:{daily_base}}
   │  + useBusinessStore.setState({ dailyCashBase })
   ▼
useBusinessStore.dailyCashBase ─┬─▶ OpenSessionModal: amount inicial = dailyCashBase (editable)
                                │        └─▶ cash_sessions.opening_balance = valor en pantalla
                                │
                                └─▶ CloseSessionModal: nextDayBase = dailyCashBase (editable)
                                         ├─▶ central_cash_movements income efectivo = cashIngresos
                                         │        metadata.next_day_base = safeNextDayBase (solo dato)
                                         └─▶ (NO se inserta egreso "Base próximo día")
```
