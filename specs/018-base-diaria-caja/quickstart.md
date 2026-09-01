# Phase 1 — Quickstart: Verificación manual de Base Diaria de Caja

Prerrequisito: `pnpm build` (desktop + shared) sin errores de tipo, y app corriendo con
`pnpm --filter magnasoft-pos electron:dev`.

## 1. Configurar la Base Diaria (US1 / SC-001)

1. Entrar como administrador → Configuración → sección **Caja**.
2. Verificar que "Base Diaria de Caja" arranca en `0` si nunca se configuró (FR-003).
3. Ingresar `100000`, guardar.
4. Salir de Configuración y volver a entrar → el valor sigue en `100000` (FR-002).
5. (DB) Confirmar fila en `business_settings`: `setting_type = 'cash'`,
   `value = { "daily_base": 100000 }`.

**Esperado**: guardado en < 1 min, persistente entre reaperturas del panel.

## 2. Apertura de Caja con base predeterminada (US3 / SC-002)

1. Con la caja cerrada, abrir el modal **Apertura de Caja**.
2. El campo "Monto Inicial en Efectivo" muestra `100.000` sin teclear nada (FR-004).
3. Editar con el numpad a `120000`, confirmar.
4. (DB) `cash_sessions.opening_balance = 120000` (se abre con el valor en pantalla, no
   con el configurado) — Acceptance US3 #2.
5. Repetir con Base Diaria = `0`: el monto inicial arranca en `0` como antes (US3 #3).

## 3. Cierre: la base no entra ni se suma a Caja Central (US2 / SC-003, SC-004, SC-005)

Escenario: Base Diaria `100.000`, sesión abierta con `opening_balance = 100.000`,
ventas en efectivo del día `500.000`, sin abonos ni movimientos manuales.

1. Anotar el **Balance Total** actual de Caja Central (dashboard Finanzas). Llamarlo `B0`.
2. Abrir **Cierre de Caja**. La tarjeta "Base Próximo Día" muestra `100.000`
   (= Base Diaria, no el `opening_balance`) y es editable (FR-005).
3. Contar `600.000` de efectivo físico (base + ventas). Confirmar cierre.
4. Revisar Caja Central:
   - **Balance Total = `B0 + 500.000`** (no `+600.000`, no `+400.000`) → SC-003.
   - En la lista de movimientos **NO** aparece ningún `💵 Base próximo día` → US2 #2.
   - El movimiento de ingreso en efectivo del cierre tiene
     `metadata.next_day_base = 100000` (trazabilidad).
5. El efectivo que queda en la registradora = `100.000` (SC-005).

### Sin descuadre en días consecutivos (SC-004)

Repetir el ciclo Apertura→Cierre 5 días seguidos con `500.000` de ventas efectivas cada
día y Base Diaria `100.000`:

- Tras 5 cierres, incremento del Balance Total de Caja Central = `2.500.000`
  (`5 × 500.000`), exactamente la suma de los depósitos reales.
- Diferencia por concepto de base = `0`.

## 4. Edge cases

| Caso | Acción | Esperado |
|---|---|---|
| Base > efectivo contado | Base Diaria `100.000`, contar solo `60.000` al cierre | El monto de base mostrado/guardado se limita a `60.000` (clamp); Caja Central no recibe un ingreso negativo (FR-009). |
| Edición puntual en cierre | Cambiar "Base Próximo Día" a `80.000` sólo esta vez | La config global sigue en `100.000`; el próximo cierre vuelve a proponer `100.000`. |
| Base = 0 | Base Diaria `0`, cerrar con `500.000` de ventas | Todo el efectivo del día (`500.000`) baja a Caja Central; comportamiento "sin base" (US2 #4). |
| Sin configurar | Nunca se tocó el ajuste | Apertura arranca en `0`; cierre propone `0`; Caja Central recibe el efectivo íntegro. |

## 5. No regresión

- `pnpm build` (desktop + shared) sin errores `tsc -b`.
- Búsqueda de shadowing de variables en `handleConfirmClose` de `CloseSessionModal`
  antes del build de producción (riesgo TDZ con Vite).
- `PaymentModal.tsx` sin cambios; venta normal en efectivo/transferencia/mixta funciona.
- `apps/web`: sin cambios; el portal admin sigue compilando y cargando.
- Abrir/cerrar caja varias veces seguidas sin errores en consola.
