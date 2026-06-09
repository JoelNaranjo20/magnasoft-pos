# Research: Mejora del Sistema de Cambio y Propinas en POS

**Feature**: [spec.md](./spec.md) | **Date**: 2026-06-05

---

## R1: ¿Cómo implementar el cambio cruzado en PaymentModal?

**Decision**: Agregar campos de cambio cruzado en el metadata de la venta y generar cash_movements compensatorios automáticamente.

**Rationale**:
- PaymentModal ya soporta pago mixto (split entre cash/transfer/card/credit) con campos `receivedAmount`, `transferAmount`, `cardAmount`.
- Para cambio cruzado, se extiende el modelo existente: si el cajero recibe $X por método A y la venta es $Y (X > Y), el excedente puede marcarse como "cambio a devolver por método B".
- Se genera automáticamente un `cash_movement` de tipo `expense` en el método destino (el que recibe el cambio) por el monto excedente, asociado al `session_id` activo y a la venta en `metadata`.
- Se registra en `sale.metadata.cross_change`: `{ from: 'transfer', to: 'cash', amount: 1500 }`.

**Alternatives considered**:
- Crear una tabla separada `cross_changes`: Descartado — excesivo. El metadata JSONB es más flexible y ya almacena datos similares (tip_amount).
- Usar movimientos de caja manuales (existente): Rechazado — no está trazado a la venta, no escala.

---

## R2: ¿Cómo extender la interfaz de propinas con porcentajes rápidos?

**Decision**: Agregar botones predefinidos (10%, 15%, 20%) que calculan `total * porcentaje` y lo asignan a `tipAmount`.

**Rationale**:
- Propinas con porcentaje es estándar en POS (Square, Toast, Clover lo hacen así).
- No requiere nueva estructura de datos — solo UX.
- El cálculo es `Math.round(total * percentage / 100)` para evitar decimales excesivos.
- El cajero puede ajustar manualmente después de presionar el porcentaje.

**Alternatives considered**:
- Modal separado para propinas: Descartado — añade fricción. Mejor inline como está ahora pero con los botones de %.
- Configurar porcentajes por negocio: Posible para v2, fuera del scope actual.

---

## R3: ¿Cómo distribuir propinas entre múltiples trabajadores?

**Decision**: Permitir repartir el monto total de propina entre N trabajadores vía selector dinámico de filas (trabajador + porcentaje/monto).

**Rationale**:
- Actualmente solo soporta un `tipWorkerId`. Se extiende a `tipWorkerIds: [{ workerId, amount }]`.
- Se almacena en `sale.metadata.tip_distribution` como JSONB array.
- Cada entrada del split genera su propio registro en `worker_commissions` con `service_type = 'tip_split'`.
- Si se usa un solo trabajador, el comportamiento es idéntico al actual (backward compatible).

**Alternatives considered**:
- Mantener un solo trabajador y forzar splits manuales: Descartado — resta valor a la feature.
- Porcentajes predefinidos de split: Descartado — demasiado rígido. Mejor monto libre por trabajador.

---

## R4: ¿Cómo almacenar la propina con método de pago independiente de la venta?

**Decision**: Agregar campo `tip_payment_method` en el metadata de la venta y NO incluirlo en los montos de pago de la venta cuando es diferente.

**Rationale**:
- Actualmente la propina se suma al monto del método de pago (ej. `cash_amount = total + tip`).
- Para soportar "venta con tarjeta, propina en efectivo", la propina NO debe sumarse al `card_amount`.
- En su lugar, se registra en metadata: `{ tip_amount, tip_payment_method: 'cash' }`.
- El cierre de caja y la conciliación leen este campo para separar correctamente.
- `CloseSessionModal` ya lee `metadata.tip_amount` — se ajusta para considerar `tip_payment_method`.

**Alternatives considered**:
- Crear una tabla `tips`: Descartado — overkill para lo que es esencialmente un atributo de la venta.
- Forzar que la propina siempre use el mismo método: Rechazado — no satisface el requisito.

---

## R5: ¿Cómo mejorar la visualización en historial de ventas y movimientos?

**Decision**: Extender `SaleDetailsModal` con secciones dedicadas a cambio cruzado y propinas. Agregar resumen en `CloseSessionModal`.

**Rationale**:
- `SaleDetailsModal` (desktop y shared) actualmente no muestra propinas ni cambios.
- Se agregan badges/etiquetas visuales:
  - 🔀 Cambio cruzado: "$1,500 devuelto en efectivo" (ámbar)
  - 💰 Propina: "$600 (15%) → María" (púrpura)
  - 🔀 + 💰 para ventas con ambos
- En `CloseSessionModal`, se agrega línea de "Cambios entregados" en el resumen.
- `SessionHistory` ya muestra comisiones con ícono de corazón para propinas — se mejora el badge.

**Alternatives considered**:
- Vista separada de propinas: Descartado — mejor integrado en el flujo existente.
- Reporte descargable: Posible para v2.

---

## R6: ¿Cómo manejar la validación de saldo insuficiente para cambio en efectivo?

**Decision**: Calcular el saldo actual de efectivo en la sesión y advertir si es menor que el cambio solicitado.

**Rationale**:
- El frontend ya tiene acceso a los movimientos de caja de la sesión vía `cash_movements`.
- Se suma: `opening_balance + cash_income - cash_expenses - cambios_ya_entregados`.
- Si `cambio_solicitado > saldo_efectivo`, mostrar warning con opción de:
  - "Registrar de todos modos" (saldo negativo — el admin lo resolverá después)
  - "Cancelar cambio" (el cajero busca otra forma de resolver)
- Esto es un warning, no un bloqueo duro. La decisión final es del cajero.

**Alternatives considered**:
- Bloquear completamente: Descartado — podría trabar una venta real. El cajero sabe si tiene efectivo extra no registrado.
- No validar: Rechazado — va contra FR-012.

---

## R7: ¿Qué pasa con el cierre de caja cuando hay cambios cruzados?

**Decision**: Los cambios cruzados generan `cash_movements` de tipo `expense` con `payment_method = método_destino`. El `CloseSessionModal` ya los procesa correctamente al sumar movimientos por método.

**Rationale**:
- Al devolver cambio en efectivo: `cash_movement { type: 'expense', amount: N, payment_method: 'cash', description: 'Cambio cruzado - Venta #XXX' }`.
- Esto reduce el efectivo esperado en el cierre (`cashMovementBalance` en CloseSessionModal línea 90: `cashMovementBalance += isIncome ? amt : -amt`).
- Al devolver cambio por transferencia: `cash_movement { type: 'expense', amount: N, payment_method: 'transfer', description: 'Cambio cruzado - Venta #XXX' }`.
- Ambas situaciones ya están cubiertas por la lógica de cierre existente — solo hay que crear los movimientos correctos.

---

## R8: ¿Es seguro modificar PaymentModal.tsx (95KB)?

**Decision**: Usar cambios mínimos focalizados. No refactorizar el componente completo. Extraer la lógica de propinas y cambio a hooks internos si crece demasiado.

**Rationale**:
- La constitución advierte: "cualquier cambio que lo afecte requiere revisión exhaustiva de no regresión."
- Se seguirá el patrón existente: las propinas y cambios se manejan en el mismo `handleConfirm` y se almacenan en `metadata`.
- Si los nuevos campos de UI añaden más de ~50 líneas, se extraen a componentes internos (`TipSection`, `CrossChangeSection`) dentro del mismo archivo para mantener legibilidad.
- Testing manual obligatorio para: cash, transfer, card, mixed, con propina, con cambio cruzado, con ambos.

---

## Resumen de Decisiones Técnicas

| # | Decisión | Impacto |
|---|---|---|
| R1 | Cambio cruzado vía metadata + cash_movement automático | Bajo — usa estructuras existentes |
| R2 | Botones de % propina (10/15/20) | Bajo — solo UX |
| R3 | Split de propinas vía `tip_distribution` JSONB + múltiples commissions | Medio — nuevo campo metadata + múltiples inserts |
| R4 | `tip_payment_method` independiente en metadata | Bajo — nuevo campo metadata, ajuste en CloseSessionModal |
| R5 | Extender SaleDetailsModal + CloseSessionModal | Bajo — vistas existentes con nuevas secciones |
| R6 | Warning por saldo insuficiente (no bloqueante) | Bajo — validación en frontend |
| R7 | cash_movement expense para cambios | Bajo — usa infraestructura existente |
| R8 | Cambios mínimos en PaymentModal, sin refactor | Control de riesgo |
