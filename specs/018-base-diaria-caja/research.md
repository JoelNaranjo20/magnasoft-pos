# Phase 0 — Research: Base Diaria de Caja

## 1. Persistencia del ajuste — ¿migración necesaria?

**Decisión**: NO se necesita migración SQL. Se reutiliza la tabla `business_settings`
con una fila `setting_type = 'cash'`, `value = { daily_base: <number> }`.

**Rationale**:
- `business_settings` ya tiene `UNIQUE (business_id, setting_type)` (migración
  `20260207210000`) → soporta `upsert(..., { onConflict: 'business_id,setting_type' })`.
- Las políticas RLS (migración `20260207213000`) permiten `SELECT/INSERT/UPDATE` para
  cualquier `setting_type` mientras `business_id = (profiles.business_id de auth.uid())`.
  No hay restricción por tipo → `'cash'` funciona igual que `'security'`.
- `GeneralSettings.tsx` ya hace exactamente este patrón para `setting_type = 'security'`
  (líneas ~184-189: `upsert({ business_id, setting_type: 'security', value }, { onConflict: 'business_id,setting_type' })`).

**Alternativas consideradas**:
- *Columna nueva en `business` o clave en `business.config` (JSONB)*: `business.config`
  está tipado como `{ [key: string]: boolean }` en `useBusinessStore` y semánticamente es
  para feature flags de módulos. Meter un número ahí ensucia el contrato. Rechazado.
- *Tabla dedicada `cash_settings`*: viola YAGNI; `business_settings` ya resuelve el caso
  key-value por negocio. Rechazado.

## 2. Fórmula del cierre — cómo excluir la base sin descuadre

**Contexto del código actual** (`CloseSessionModal.tsx`, HEAD):
- `cashIngresos = sessionCashSales + cashAbonosTotal + sessionCashLoanPayments + sessionCashOther`
  → se inserta como `central_cash_movements` `type:'income'`, `payment_method:'cash'`.
  **No incluye `opening_balance`.**
- `transferIngresos = …` → `income` `payment_method:'transfer'`.
- `safeNextDayBase = max(0, min(nextDayBase, totalCounted))` → se inserta un
  `central_cash_movements` **`type:'expense'`** con descripción `💵 Base próximo día — Sesión #xxx`.
- `nextDayBase` se pre-rellena con `cashSession.opening_balance` y es editable.

**Diagnóstico del descuadre**:
Físicamente, la "base" que se queda para mañana es el `opening_balance` heredado del día
anterior. Como `cashIngresos` **nunca** contuvo `opening_balance`, la base ya está
excluida del ingreso a Caja Central. El egreso adicional `💵 Base próximo día` la vuelve
a restar → el total de Caja Central baja por el monto de la base **cada día**, aunque la
base jamás se sumó. Ese egreso es el único origen del descuadre y del "paso por Caja
Central" que el usuario quiere eliminar.

**Decisión (fórmula objetivo para 018)**:
1. **Eliminar** por completo el `INSERT` de `central_cash_movements` `type:'expense'` con
   descripción `💵 Base próximo día`.
2. **Mantener** el ingreso de efectivo a Caja Central como `cashIngresos` (sin cambios en
   su cálculo).
3. `nextDayBase` pasa a pre-rellenarse con `dailyCashBase` (config) en vez de
   `opening_balance`. Sigue editable (FR-005).
4. `safeNextDayBase` se conserva **solo** como:
   - dato informativo en la UI ("Se queda en la registradora para la apertura de mañana"),
   - y en `metadata.next_day_base` del movimiento de ingreso, para trazabilidad/reportes.
   No genera ningún movimiento.
5. Se mantiene el clamp `max(0, min(nextDayBase, totalCounted))` para que el valor
   mostrado/guardado nunca supere el efectivo contado (FR-009).

**Por qué funciona sin descuadre**:
- La `Apertura de Caja` pasa a proponer `dailyCashBase` como monto inicial (FR-004) →
  en operación normal `opening_balance == dailyCashBase` todos los días.
- Día N: se deposita `cashIngresos_N`; en la registradora queda `dailyCashBase`.
- Día N+1: abre con `opening_balance = dailyCashBase`; deposita `cashIngresos_{N+1}`.
- Total Caja Central = Σ `cashIngresos` = suma de depósitos reales. **Descuadre = 0.**

**Alternativa considerada — Opción B (fórmula física robusta)**:
`ingreso_efectivo = max(0, totalCounted − nextDayBase − cashAbonosYaEnCentral)`.
- Ventaja: correcta aunque `opening_balance ≠ dailyCashBase` (apertura editada a mano o
  cambio de config a mitad de ciclo), y refleja sobrantes/faltantes en el depósito.
- Rechazada para 018: cambia la semántica del depósito (mezcla la diferencia de arqueo),
  toca el núcleo contable del cierre y depende de aclarar el manejo actual de abonos
  (los abonos a cliente se insertan en `central_cash_movements` en el momento del pago
  desde `CarteraHub`/`CreditManagement` con `cash_session_id = null`, por lo que **no**
  entran en el `debt_payments` filtrado por sesión del cierre — pero verificar caso por
  caso excede el alcance de este feature). Mayor riesgo de regresión en un POS en
  producción. Se documenta como posible endurecimiento contable futuro, separado.

**Alternativa considerada — mantener el egreso pero con el monto de config**: sigue
"pasando por Caja Central" (rechazado explícitamente por el usuario) y no elimina el
descuadre. Rechazada.

**Edge documentado, no bloqueante**: si un administrador abre con un monto ≠
`dailyCashBase`, o cambia la config a mitad de ciclo, `opening_balance` y la base
retenida divergen y el efectivo físico de la registradora vs. el libro de Caja Central
difieren por ese delta. Mitigación: Apertura y Cierre proponen ambos el mismo valor
configurado; la divergencia sólo ocurre por acción explícita del administrador.

## 3. Impacto en `useBusinessStore` (Constitución IV)

**Cambio**: añadir propiedad `dailyCashBase: number` (default `0`) y poblarla dentro de
`fetchBusinessProfile` con un bloque análogo al de `security` settings:

```
const { data: cashData } = await supabase
  .from('business_settings')
  .select('value')
  .eq('business_id', currentId)
  .eq('setting_type', 'cash')
  .maybeSingle();
set({ dailyCashBase: Number(cashData?.value?.daily_base ?? 0) });
```

**Búsqueda de consumidores** (`grep useBusinessStore` en `apps/desktop`, `apps/web`,
`apps/shared`): los consumidores usan `id`, `name`, `businessType`, `logoUrl`, `config`,
`isModuleEnabled`, `fetchBusinessProfile`, `protectedModules`, `subscribeToChanges`.
Ninguno se rompe al **añadir** una propiedad. No se modifica ninguna firma.

**Web**: `apps/web` importa `useBusinessStore`. El bloque de fetch nuevo se ejecutará
también en web; es una consulta `SELECT` de solo lectura sobre una tabla indexada, sin
efectos secundarios. `apps/web` no leerá `dailyCashBase`. Aceptable; no se añade guard
por plataforma para no introducir ramas por entorno en código compartido.

**Realtime**: `useBusinessStore` se suscribe a cambios de la tabla `business`, no de
`business_settings`. El ajuste se refresca al: (a) `fetchBusinessProfile` en el arranque
/ login, y (b) actualización optimista de la store desde `GeneralSettings` tras guardar
(`useBusinessStore.setState({ dailyCashBase })`). Suficiente para un negocio operando en
sus terminales; no se añade suscripción realtime nueva (YAGNI).

## 4. Ubicación del campo de configuración (desktop)

**Decisión**: añadir una sección **"Caja"** dentro de `GeneralSettings.tsx` con un único
input numérico "Base Diaria de Caja". Guardado junto con el resto del formulario (o con
su propio botón), usando `upsert` a `business_settings` `setting_type:'cash'`.

**Rationale**: `GeneralSettings.tsx` ya concentra datos del negocio, PIN, módulos
protegidos e impresora, y ya tiene el patrón de `upsert` a `business_settings`. Crear un
panel nuevo en `ConfigPage.tsx` sería mayor superficie sin beneficio. Rechazado un panel
dedicado por YAGNI.

## 5. Limpieza de código muerto en `useCentralCash`

`monthlySummary` detecta `isBaseProximoDia` (`description` contiene "base próximo día") y
acumula `nextDayBaseExpenses`. Tras 018 no se crean esos movimientos y —como el usuario
borrará los datos— tampoco existirán históricos.

**Decisión**: dejar ese código como está (inerte, sin coste). Eliminarlo es opcional y
se puede listar como tarea menor de limpieza en `tasks.md`, sin bloquear el feature.
