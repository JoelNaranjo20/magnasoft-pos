# Feature Specification: Mejora del Sistema de Cambio y Propinas en POS

**Feature Branch**: `005-mejora-cambio-propinas`

**Created**: 2026-06-05

**Status**: Draft

**Input**: "mejoremos el sistema de cambio. Es decir, si a mí me entregan un valor mayor al precio a cobrar en transferencia y me piden que dé retos efectivos o viceversa, ya tengo una opción manual para eso, pero analicemos si es mejor ponerla también en el punto de cobro del post. También mejoraremos el sistema de propinas en el pos. También mejoraremos la visualización de estos cambios en el módulo de ventas o movimientos."

---

## User Scenarios & Testing

### User Story 1 — Cambio cruzado en punto de cobro (Priority: P1)

El cajero está cobrando una venta en el punto de cobro. El cliente paga con transferencia/QR un monto mayor al total de la venta y solicita recibir el excedente en efectivo como cambio (o viceversa: paga en efectivo un monto mayor y pide que el cambio se le devuelva por transferencia). El sistema debe permitir registrar esto directamente en el modal de pago, sin necesidad de crear movimientos manuales separados, reflejando correctamente los montos en cada método de pago y el movimiento de caja correspondiente.

**Why this priority**: Es la funcionalidad nueva más crítica. Actualmente requiere pasos manuales separados (crear movimiento de caja manualmente) que consumen tiempo, son propensos a error y no quedan trazados correctamente en la venta. Los negocios que operan con transferencias (restaurantes, comercios) enfrentan esta situación varias veces al día.

**Independent Test**: Crear una venta por $2,000. Seleccionar pago mixto. Registrar transferencia por $3,000 y marcar que $1,000 se devuelven como efectivo. Verificar que la venta registra $2,000 como monto real, $3,000 recibidos por transferencia, $1,000 de egreso en efectivo como cambio, y que en caja central y movimientos aparece correctamente trazado.

**Acceptance Scenarios**:

1. **Given** una venta por $2,500 con método de pago "transferencia", **When** el cajero ingresa un monto recibido de $4,000 y selecciona "Dar cambio en efectivo: $1,500", **Then** el sistema registra la venta por $2,500, un ingreso de $4,000 en transferencia, y un egreso de $1,500 en efectivo como cambio al cliente. La sesión de caja refleja -$1,500 en movimientos de efectivo. También, cuando se elija modo transferencia o pago bancario con tarjeta, que se escriba el monto en el modal de pago. 

2. **Given** una venta por $1,800 con método de pago "efectivo", **When** el cajero ingresa un monto recibido de $2,000 y selecciona "Dar cambio por transferencia: $200", **Then** el sistema registra la venta por $1,800, un ingreso de $2,000 en efectivo, y un egreso de $200 por transferencia. El cambio queda trazado en la venta.

3. **Given** una venta por $3,000 con método de pago "mixto" (efectivo $1,000 + transferencia $2,500), **When** el cajero registra que $500 del excedente en transferencia se devuelven en efectivo, **Then** el sistema crea automáticamente los movimientos de caja compensatorios y la venta refleja correctamente los montos netos por cada método.

4. **Given** una venta ya cobrada sin cambio cruzado, **When** el administrador revisa los movimientos de caja de la sesión, **Then** no aparece ningún movimiento de cambio cruzado, solo los movimientos normales de la venta.

---

### User Story 2 — Sistema de propinas mejorado en POS (Priority: P2)

El cajero puede agregar propinas de forma más flexible durante el cobro: propina fija en monto, propina por porcentaje del total, o propina por "dejar el cambio". La propina se asigna a uno o varios trabajadores y queda registrada en la venta y en comisiones. El sistema sugiere automáticamente porcentajes comunes (10%, 15%, 20%) y permite elegir si la propina se paga en efectivo, transferencia o tarjeta (independiente del método de pago de la venta).

**Why this priority**: Mejora la experiencia existente. El sistema ya tiene propinas pero con UX limitada (solo monto manual). Agregar porcentajes rápidos y la opción de distribuir entre múltiples trabajadores reduce fricción y errores. Además, la propina debe poder registrarse independientemente del método de pago de la venta (ej. venta con tarjeta, propina en efectivo).

**Independent Test**: Crear una venta por $5,000. En el modal de pago, seleccionar propina del 15% ($750), asignar 50% al trabajador A y 50% al trabajador B. Completar el pago con tarjeta pero marcar la propina como "se paga en efectivo". Verificar que la venta registra $5,000 en tarjeta y las comisiones de $375 para cada trabajador.

**Acceptance Scenarios**:

1. **Given** una venta por $4,000 en el modal de pago, **When** el cajero presiona el botón de propina "15%", **Then** el sistema calcula y muestra $600 como propina sugerida. El cajero puede aceptarla tal cual o ajustarla manualmente.

2. **Given** una venta con propina de $500, **When** el cajero selecciona "Repartir propina" y asigna 60% a Trabajador A y 40% a Trabajador B, **Then** el sistema registra dos comisiones separadas: $300 para A y $200 para B.

3. **Given** una venta pagada con tarjeta por $3,000, **When** el cajero agrega una propina de $300 y la marca como "Propina en efectivo", **Then** la venta registra pago con tarjeta por $3,000 y la propina se registra como comisión pendiente de pago en efectivo (no afecta el monto de la venta).

4. **Given** un pago en efectivo de $10,000 para una venta de $8,500, **When** el cajero presiona "Dejar cambio como propina ($1,500)", **Then** el sistema asigna automáticamente $1,500 como propina y el cambio calculado queda en $0.

5. **Given** que el negocio no tiene trabajadores configurados, **When** el cajero intenta agregar una propina, **Then** el sistema permite ingresar el monto pero muestra una advertencia "No hay trabajador asignado — la propina no se registrará como comisión".

---

### User Story 3 — Visualización de cambios y propinas en ventas y movimientos (Priority: P3)

El administrador o cajero puede revisar cualquier venta pasada y ver claramente: el método de pago utilizado, si hubo cambio cruzado (cuánto y por qué método), si se dejó propina (monto, porcentaje, trabajador asignado), y cómo estos afectaron los movimientos de caja y caja central. La información se presenta de forma visual clara en el historial de ventas y en el módulo de movimientos.

**Why this priority**: Es la capa de transparencia y auditoría. Sin esto, los cambios cruzados y propinas quedan opacos. Pero se puede implementar después de que las funcionalidades base (US1, US2) estén operando.

**Independent Test**: Realizar una venta con cambio cruzado y propina. Navegar al historial de ventas, abrir el detalle de esa venta, y verificar que muestra: monto base, método(s) de pago, cambio cruzado (método origen → método destino, monto), propina (monto, porcentaje, trabajador). Navegar a movimientos/central cash y verificar que los movimientos generados son consistentes.

**Acceptance Scenarios**:

1. **Given** una venta pasada que tuvo cambio cruzado (transferencia $5,000, devolución efectivo $1,000), **When** el usuario abre el detalle de la venta, **Then** se muestra claramente: "Pago: Transferencia $5,000 | Cambio devuelto: Efectivo $1,000 | Neto venta: $4,000".

2. **Given** una venta con propina del 10% asignada a "María", **When** el usuario revisa el detalle, **Then** aparece un badge o ícono indicando "Propina: $500 (10%) → María" con un indicador visual distintivo.

3. **Given** múltiples ventas en una sesión de caja con cambios cruzados, **When** el administrador cierra la caja, **Then** el resumen de cierre muestra por separado: ventas netas, cambios entregados en efectivo, cambios entregados por transferencia, y propinas registradas.

---

### Edge Cases

- ¿Qué pasa si el cajero ingresa un monto de cambio a devolver mayor que el excedente recibido? El sistema debe rechazar la operación y mostrar un mensaje claro: "El cambio a devolver ($X) no puede superar el monto excedente ($Y)".
- ¿Qué pasa si el negocio no tiene suficiente efectivo en caja para dar cambio? El sistema advierte "Saldo en caja insuficiente para dar este cambio" (basado en el saldo actual de la sesión).
- ¿Qué pasa si se devuelve cambio por transferencia y el negocio no tiene ese método configurado? El sistema muestra solo los métodos disponibles para devolución.
- ¿Qué pasa si se intenta dejar el cambio como propina pero no hay trabajador asignado? El sistema permite registrar la propina pero advierte que no se asignará a ningún trabajador.
- ¿Qué pasa si una venta tiene propina y luego se anula? La propina se revierte junto con la venta. Si la comisión ya fue pagada, se marca como "por recuperar".
- ¿Qué pasa si el monto de cambio a devolver es $0? No se genera ningún movimiento de cambio cruzado; el flujo es idéntico al actual.

---

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE permitir registrar un monto recibido superior al total de la venta en el método de pago usado (transferencia, tarjeta o efectivo).
- **FR-002**: El sistema DEBE permitir al cajero seleccionar que el excedente se devuelva como cambio en otro método de pago (efectivo, transferencia).
- **FR-003**: El sistema DEBE generar automáticamente el movimiento de egreso correspondiente en el método destino del cambio, asociado a la venta y a la sesión de caja activa.
- **FR-004**: El sistema DEBE validar que el cambio a devolver no supere el monto excedente recibido.
- **FR-005**: El sistema DEBE registrar en el metadata de la venta la información del cambio cruzado (monto, método origen, método destino).
- **FR-006**: El sistema DEBE ofrecer botones rápidos de porcentaje de propina: 10%, 15%, 20%, y opción de monto personalizado.
- **FR-007**: El sistema DEBE permitir que la propina se pague por un método distinto al método de pago de la venta (ej. venta con tarjeta, propina en efectivo).
- **FR-008**: El sistema DEBE permitir distribuir la propina entre múltiples trabajadores con porcentajes configurables.
- **FR-009**: El sistema DEBE mostrar en el detalle de venta la información de cambio cruzado y propinas de forma clara y visual.
- **FR-010**: El sistema DEBE reflejar correctamente los cambios cruzados en el cierre de caja (movimientos de egreso por cambio entregado).
- **FR-011**: El sistema DEBE mantener la opción existente de "Dejar cambio como propina" y mejorarla para que sea más visible.
- **FR-012**: El sistema DEBE advertir cuando el saldo en caja es insuficiente para dar el cambio solicitado en efectivo.

### Key Entities

- **Cambio Cruzado (CrossChange)**: Representa la devolución de excedente en un método distinto al de pago. Atributos: monto, método_origen, método_destino, venta_id, sesión_id. Se materializa como un cash_movement de egreso en el método destino.
- **Propina (Tip)**: Ya existe parcialmente como worker_commission con service_type='tip'. Se extiende para soportar distribución entre múltiples trabajadores y método de pago independiente.
- **Venta (Sale)**: Su metadata se enriquece con información estructurada de cambio cruzado y propinas para visualización en historial.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un cajero puede completar una operación de cambio cruzado en menos de 15 segundos (vs. 45+ segundos del proceso manual actual).
- **SC-002**: El 100% de las ventas con cambio cruzado quedan correctamente trazadas en el metadata de la venta y movimientos de caja.
- **SC-003**: Los errores de cuadre de caja por cambios mal registrados se reducen a cero.
- **SC-004**: Un cajero puede agregar propina con porcentaje predefinido en 2 toques (seleccionar % → confirmar).
- **SC-005**: El detalle de cualquier venta muestra en menos de 1 segundo la información completa de cambio cruzado y propinas.
- **SC-006**: El 95% de los cajeros logra completar una operación de cambio cruzado sin necesidad de asistencia del administrador.

---

## Assumptions

- Los métodos de pago disponibles (efectivo, transferencia, tarjeta) se mantienen como están actualmente en el sistema.
- La funcionalidad de movimientos de caja manuales se mantiene como alternativa para casos excepcionales no cubiertos por el cambio automático.
- La asignación de propinas a trabajadores usa el sistema de comisiones ya existente (worker_commissions).
- El módulo de ventas/movimientos ya tiene una vista de historial que puede extenderse con la nueva información visual.
- La moneda y formato de números se mantiene en pesos dominicanos (DOP) como en el resto del sistema.
