# Especificación de Funcionalidad: Corregir Duplicados y Pagos a Caja Central

**Rama**: `004-fix-duplicados-pagos` | **Fecha**: 2026-06-04

**Status**: Draft

**Input**: "- el sistema me esta dejando crear clientes repetidos / - al momento de unificar clientes repetido no quiero que se unifique y ya, quiero borrarlos todo y dejar solo uno, con el mismo ID, para que concuerden las deudas y demas metadatos de los clientes / - los pagos a creditos se iran caja central siempre"

---

## Historias de Usuario

### Historia 1 — Bloquear creación de clientes duplicados en todos los casos (Prioridad: P1)

El sistema debe impedir de forma absoluta la creación de un cliente que ya existe, sin excepciones. Actualmente la verificación de duplicados permite que se filtren clientes iguales en ciertos casos (ej. cuando el cajero ignora la advertencia y elige "Crear de todos modos", o cuando la verificación no detecta la coincidencia). El resultado debe ser que sea imposible crear un cliente con el mismo nombre normalizado o el mismo teléfono normalizado que un cliente activo existente.

**Why this priority**: Es la raíz del problema. Si no se pueden crear duplicados, no hay nada que unificar después. Prevenir es más importante que corregir.

**Independent Test**: Intentar crear un cliente con el mismo teléfono o nombre que uno existente desde cualquier formulario. El sistema debe rechazar la creación y mostrar los clientes existentes que coinciden, sin ofrecer opción de "Crear de todos modos".

**Acceptance Scenarios**:

1. **Dado** que ya existe un cliente "Juan Pérez" con teléfono "809-555-1234", **Cuando** un cajero intenta crear un nuevo cliente con el mismo nombre y teléfono desde cualquier formulario (gestión de clientes, POS, modal de vehículos), **Entonces** el sistema muestra una alerta indicando que el cliente ya existe con un enlace al cliente existente, y **no permite** la creación bajo ninguna circunstancia.

2. **Dado** que ya existe un cliente "María Rodríguez" sin teléfono, **Cuando** un cajero intenta crear "Maria Rodriguez" (sin tilde, misma fonética) también sin teléfono, **Entonces** el sistema detecta la coincidencia de nombre normalizado y muestra el cliente existente, sin permitir crear el duplicado.

3. **Dado** que ya existe un cliente con teléfono "8095551234", **Cuando** un cajero intenta crear otro cliente con teléfono "(809) 555-1234" (mismo número, distinto formato), **Entonces** el sistema normaliza ambos teléfonos, detecta la coincidencia exacta, y bloquea la creación.

---

### Historia 2 — Eliminar duplicados dejando un solo cliente real (Prioridad: P1)

Al unificar clientes duplicados, el sistema debe transferir todas las ventas, deudas y vehículos al cliente principal, y luego **eliminar permanentemente** los registros duplicados de la base de datos. No debe quedar ningún rastro de los clientes fusionados como registros independientes. Solo debe existir un cliente con su ID original, y todos los metadatos (ventas, deudas, vehículos, puntos de fidelización) deben apuntar a ese único ID.

**Why this priority**: Es la corrección del comportamiento actual. El sistema actual solo "marca" los duplicados como unificados pero los mantiene en la base de datos. Esto causa confusión y no resuelve el problema real de tener múltiples registros del mismo cliente.

**Independent Test**: Tener 3 clientes duplicados con ventas y deudas registradas, ejecutar la unificación seleccionando uno como principal, y verificar que: (a) solo existe un cliente en la lista, (b) todas las ventas y deudas de los eliminados ahora pertenecen al cliente sobreviviente, (c) los IDs de los clientes eliminados ya no aparecen en ninguna consulta.

**Acceptance Scenarios**:

1. **Dado** que existen los clientes "Juan Pérez" (ID: A, 10 ventas), "Juan Perez" (ID: B, 3 ventas, 1 deuda) y "Juan P." (ID: C, 2 vehículos), **Cuando** el admin selecciona a "Juan Pérez" (A) como principal y ejecuta la unificación, **Entonces**: (a) el cliente A ahora tiene 13 ventas, 1 deuda y 2 vehículos, (b) los clientes B y C ya no existen en la base de datos, (c) el ID A es el único que permanece y todos los registros relacionados apuntan a él.

2. **Dado** que el admin inicia una unificación, **Cuando** se muestra la vista previa, **Entonces** el mensaje es claro: "Se eliminarán permanentemente 2 clientes. Sus 3 ventas, 1 deuda y 2 vehículos se transferirán a Juan Pérez. Esta acción NO se puede deshacer."

3. **Dado** que uno de los clientes a eliminar tiene vehículos asociados, **Cuando** se ejecuta la unificación, **Entonces** los vehículos se reasignan al cliente principal **antes** de eliminar los duplicados, evitando que el `ON DELETE CASCADE` de la tabla `vehicles` los borre accidentalmente.

4. **Dado** que ocurre un error durante la eliminación, **Cuando** la operación falla parcialmente, **Entonces** ningún dato se pierde: la operación es atómica (todo se completa o nada cambia).

---

### Historia 3 — Pagos de créditos siempre a Caja Central (Prioridad: P1)

Todo abono o pago de deudas de clientes debe registrarse exclusivamente en Caja Central, sin importar si hay una sesión de caja diaria abierta o no. El usuario no necesita elegir el destino del pago — siempre va a la caja central del negocio.

**Why this priority**: Es un cambio de regla de negocio solicitado explícitamente. Unifica el flujo de caja y simplifica la operación diaria.

**Independent Test**: Abrir una caja diaria, registrar un abono a una deuda de cliente, y verificar que el pago aparece en Caja Central (`central_cash_movements`) y no vinculado a la sesión de caja diaria (`cash_sessions`).

**Acceptance Scenarios**:

1. **Dado** que hay una caja diaria abierta y existe una deuda de cliente pendiente, **Cuando** el cajero registra un abono a esa deuda, **Entonces** el pago se registra en `central_cash_movements` como ingreso (`type: 'income'`) y NO se vincula a ninguna `cash_sessions`.

2. **Dado** que NO hay una caja diaria abierta, **Cuando** el admin registra un abono desde la sección de finanzas, **Entonces** el sistema permite el pago sin exigir una sesión de caja activa, y lo registra directamente en Caja Central.

3. **Dado** que el cajero está en la pantalla de abonos, **Cuando** revisa las opciones de destino del pago, **Entonces** ya no aparece el selector "Caja Diaria / Caja Central" — solo se muestra un texto informativo: "Este pago se registrará en Caja Central".

4. **Dado** que un pago de préstamo de trabajador es diferente a un pago de deuda de cliente, **Cuando** se registra un pago de préstamo de trabajador, **Entonces** este sigue funcionando como antes (vinculado a la caja diaria si hay una abierta). Solo cambian los pagos de deudas de clientes.

---

### Casos Límite

- **Cliente a eliminar es referenciado por una venta con `customer_id` + datos en `metadata`**: La venta se reasigna al cliente principal. El `metadata` de la venta no se modifica. Si la venta referenciaba al cliente eliminado por nombre en `quick_sale_name`, ese campo histórico se preserva.
- **Eliminar cliente que es el único registro**: El sistema debe impedir "unificar" un cliente consigo mismo o seleccionar cero clientes fuente.
- **Cliente "Público General"**: No puede ser eliminado ni unificado. Es el cliente anónimo por defecto del sistema.
- **Pago de deuda de hoy vs de días anteriores**: Ya no hay diferencia — todos los pagos de deudas de clientes van a Caja Central sin importar la fecha del crédito.
- **Pago sin sesión de caja abierta**: El sistema debe permitir el pago igualmente. La validación `!cashSession` que bloquea el botón de pago debe eliminarse para deudas de clientes.
- **Vehículos con ON DELETE CASCADE**: El orden de operaciones en la unificación es crítico: primero se reasignan los vehículos al cliente principal, luego se eliminan los duplicados. Si se hiciera al revés, los vehículos se perderían por el CASCADE.

---

## Requerimientos Funcionales

- **FR-001**: El sistema DEBE impedir la creación de un cliente cuyo nombre normalizado (sin tildes, minúsculas, sin puntuación, espacios colapsados) coincida exactamente con el de un cliente activo existente en el mismo negocio.
- **FR-002**: El sistema DEBE impedir la creación de un cliente cuyo teléfono normalizado (solo dígitos) coincida exactamente con el de un cliente activo existente, si ambos tienen teléfono registrado.
- **FR-003**: El sistema DEBE eliminar permanentemente los clientes duplicados de la base de datos al ejecutar una unificación, después de transferir todas sus relaciones (ventas, deudas, vehículos) al cliente principal.
- **FR-004**: El sistema DEBE transferir los vehículos al cliente principal ANTES de eliminar los clientes fuente, para evitar la pérdida de datos por la restricción `ON DELETE CASCADE` en la tabla `vehicles`.
- **FR-005**: El sistema DEBE ejecutar la unificación con eliminación de forma atómica: si alguna parte falla, toda la operación se revierte y ningún dato se pierde.
- **FR-006**: El sistema DEBE advertir explícitamente en la vista previa de unificación que los clientes fuente serán eliminados permanentemente y la acción no se puede deshacer.
- **FR-007**: El sistema DEBE registrar todos los pagos de deudas de clientes (`debt_payments`) en Caja Central (`central_cash_movements`) como ingresos, independientemente de si hay una sesión de caja diaria abierta.
- **FR-008**: El sistema DEBE permitir el registro de abonos a deudas de clientes incluso cuando no hay una sesión de caja diaria activa.
- **FR-009**: El sistema DEBE eliminar la opción de elegir entre "Caja Diaria" y "Caja Central" al registrar abonos — el texto debe indicar que el pago va a Caja Central automáticamente.
- **FR-010**: El sistema NO DEBE modificar el comportamiento de los pagos de préstamos de trabajadores (`worker_loan_payments`) — estos mantienen su funcionamiento actual.

---

## Criterios de Éxito

- **CE-001**: Es imposible crear un cliente duplicado desde cualquier formulario del sistema. 100% de las verificaciones de duplicados bloquean la creación exitosamente.
- **CE-002**: Después de una unificación, no existe ningún registro en la tabla de clientes con los IDs de los clientes eliminados. La eliminación es total y permanente.
- **CE-003**: El 100% de las ventas, deudas y vehículos de los clientes eliminados se conservan y quedan correctamente asociados al cliente principal tras la unificación.
- **CE-004**: Todos los pagos de deudas de clientes aparecen en Caja Central (`central_cash_movements`) con tipo `income`, sin excepciones.
- **CE-005**: El flujo de abonos funciona sin errores tanto con sesión de caja abierta como sin ella.
- **CE-006**: Las operaciones existentes (crear cliente no duplicado, editar cliente, eliminar cliente sin relaciones, abonos históricos) siguen funcionando sin regresiones.

---

## Entidades Clave

- **Cliente (`customers`)**: Los duplicados se **eliminan físicamente** (DELETE) durante la unificación, no se marcan. Solo permanece el cliente principal con su ID original.
- **Venta (`sales`)**: `customer_id` se reasigna al cliente principal antes de eliminar los duplicados.
- **Deuda (`customer_debts`)**: `customer_id` se reasigna al cliente principal antes de eliminar los duplicados.
- **Vehículo (`vehicles`)**: `customer_id` se reasigna al cliente principal antes de eliminar los duplicados. Tiene `ON DELETE CASCADE` — el orden de operaciones es crítico.
- **Pago de deuda (`debt_payments`)**: El `cash_session_id` será siempre `null` para pagos de deudas de clientes. El pago se replica en `central_cash_movements` como ingreso.
- **Movimiento de caja central (`central_cash_movements`)**: Recibe un registro `type: 'income'` por cada pago de deuda de cliente, con la descripción del abono.

---

## Supuestos

- Los pagos de préstamos de trabajadores NO cambian — solo se modifica el flujo de deudas de clientes.
- La eliminación física de clientes duplicados es aceptable porque el admin confirma explícitamente la acción en la vista previa, que advierte que es irreversible.
- El orden de reasignación (ventas → deudas → vehículos → eliminar clientes) garantiza que el `ON DELETE CASCADE` de `vehicles` no cause pérdida de datos.
- El cliente "Público General" se excluye de todas las operaciones de unificación y eliminación.
- La normalización de nombre y teléfono sigue la misma lógica ya implementada en `normalizeName` y `normalizePhone`.
- Los abonos a deudas de clientes son siempre ingresos a Caja Central (`type: 'income'`), nunca egresos.
