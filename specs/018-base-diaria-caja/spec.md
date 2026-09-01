# Feature Specification: Base Diaria de Caja Configurable

**Feature Branch**: `018-base-diaria-caja`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "Actualmente, el dinero total de la venta del día baja a la caja central, pero no quiero que el dinero que se usará para abrir la caja al día siguiente se vaya a la caja central y se sume en el total. Que se quede en la caja diaria del día siguiente como base predeterminada. Este siempre será un monto diario. Así que permite configurar la base diaria que siempre se usará, sin que pase a caja central y se sume."

---

## Contexto

Al cerrar la caja del día, el efectivo recaudado se registra como ingreso en la Caja
Central del negocio. Hoy el efectivo que el negocio deja apartado para abrir la caja
al día siguiente se maneja con un campo manual ("Base Próximo Día") que se digita en
cada cierre y que además genera un movimiento de **egreso** en la Caja Central para
descontarlo. Esto tiene tres problemas:

1. No existe un monto de base **fijo y configurable**; se teclea a mano cada vez.
2. La base **pasa por la Caja Central** (como egreso), en lugar de simplemente no entrar.
3. El cierre descuenta la base del total central **cada día**, aunque la base nunca se
   sumó, lo que puede generar un descuadre acumulado.

El negocio quiere que la base diaria sea un valor único configurado una sola vez, que
la apertura del día siguiente lo use por defecto, y que ese dinero **nunca** entre ni
se sume en la Caja Central.

---

## Clarifications

### Session 2026-08-31

- Q: Si el turno se abrió con un monto ≠ Base Diaria, ¿con qué valor se pre-llena "Base Próximo Día" en el Cierre? → A: Siempre la Base Diaria configurada (monto fijo), sin importar el `opening_balance`.
- Q: Al editar el monto de la base en Apertura o Cierre, ¿se pide PIN? → A: Sí — se solicita el PIN Maestro del negocio ya configurado (`business.pin`, mismo de `SecurityPinModal`).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar la Base Diaria de Caja (Priority: P1)

Como administrador del negocio, quiero definir una sola vez el monto en efectivo que
siempre se deja en la registradora como base de apertura, para no tener que calcularlo
ni digitarlo cada día.

**Why this priority**: Es el habilitador de todo el feature. Sin un valor configurado,
la apertura y el cierre no tienen de dónde tomar la base.

**Independent Test**: Entrar a Configuración en el POS de escritorio, ingresar un monto
de Base Diaria (ej. $100.000), guardar, cerrar y reabrir Configuración, y verificar que
el monto persiste.

**Acceptance Scenarios**:

1. **Given** que soy administrador en el panel de Configuración, **When** ingreso un
   monto de Base Diaria de Caja y guardo, **Then** el valor queda persistido para el
   negocio y se muestra al volver a abrir Configuración.
2. **Given** que el negocio nunca configuró una Base Diaria, **When** abro
   Configuración, **Then** el campo aparece en cero (sin base).
3. **Given** que cambio la Base Diaria de $100.000 a $150.000 y guardo, **When** abro la
   siguiente sesión de caja, **Then** la apertura propone $150.000.

---

### User Story 2 - La base no entra ni se suma en la Caja Central (Priority: P1)

Como dueño del negocio, quiero que el dinero que se queda como base para el día
siguiente no aparezca ni se sume en el total de la Caja Central, para que la Caja
Central refleje solo el dinero que realmente se acumuló.

**Why this priority**: Es el objetivo central del requerimiento del usuario.

**Independent Test**: Con una Base Diaria de $100.000 configurada (y sesión abierta con
`opening_balance` = $100.000), cerrar una caja con $500.000 de ventas en efectivo y
verificar en el dashboard de Caja Central que el Balance Total aumentó en $500.000 (el
efectivo del día depositado), **no** en $600.000 ni en $400.000, y que **no** aparece
ningún movimiento etiquetado "Base próximo día".

**Acceptance Scenarios**:

1. **Given** una Base Diaria configurada, **When** cierro la caja, **Then** la Caja
   Central recibe únicamente el efectivo del día que efectivamente se deposita, sin la
   base.
2. **Given** que cierro la caja, **When** reviso los movimientos de Caja Central,
   **Then** no existe ningún movimiento de egreso "Base próximo día".
3. **Given** el turno se abrió con `opening_balance` distinto de la Base Diaria, **When**
   abro el Cierre, **Then** "Base Próximo Día" se pre-llena con la Base Diaria
   configurada (no con el `opening_balance`).
4. **Given** intento editar el monto de "Base Próximo Día" en el Cierre, **When** cambio
   el valor, **Then** el sistema solicita el PIN Maestro; con PIN correcto se aplica el
   cambio, con PIN incorrecto o cancelado el valor vuelve a la Base Diaria.
5. **Given** que cierro caja durante varios días seguidos con la misma Base Diaria,
   **When** comparo el total de Caja Central con la suma de los depósitos reales,
   **Then** coinciden (no hay descuadre acumulado por la base).
6. **Given** que la Base Diaria configurada es $0, **When** cierro la caja, **Then** el
   comportamiento es el de "no se retiene base" y todo el efectivo del día baja a la
   Caja Central.

---

### User Story 3 - Apertura de caja con base predeterminada (Priority: P2)

Como cajero administrador, quiero que al abrir la caja el monto inicial ya venga
propuesto con la Base Diaria configurada, pudiendo ajustarlo si ese día es distinto,
para agilizar la apertura y evitar errores de digitación.

**Why this priority**: Mejora de usabilidad y consistencia; el feature funciona sin
esto pero pierde gran parte de su valor práctico.

**Independent Test**: Con una Base Diaria de $100.000, abrir el modal de Apertura de
Caja y verificar que el campo "Monto Inicial en Efectivo" ya muestra $100.000, que se
puede editar con el teclado numérico, y que la sesión se abre con el valor mostrado.

**Acceptance Scenarios**:

1. **Given** una Base Diaria configurada mayor que cero, **When** abro el modal de
   Apertura de Caja, **Then** el monto inicial aparece pre-cargado con ese valor.
2. **Given** el monto pre-cargado, **When** intento modificarlo, **Then** el sistema
   solicita el PIN Maestro; tras PIN correcto puedo editarlo con el teclado numérico y
   la sesión se abre con el valor que quedó en pantalla (no con el valor configurado).
3. **Given** que cancelo el PIN o lo ingreso mal, **When** vuelvo al modal de Apertura,
   **Then** el monto inicial permanece en la Base Diaria configurada.
4. **Given** una Base Diaria de $0 o sin configurar, **When** abro el modal de
   Apertura, **Then** el monto inicial arranca en cero como hoy (sin solicitar PIN si no
   hay PIN configurado).

---

### Edge Cases

- **Base mayor que el efectivo contado al cierre**: si la base configurada supera el
  efectivo físico disponible, el sistema debe evitar registrar un depósito negativo a
  Caja Central y advertir/limitar el monto retenido al efectivo disponible.
- **Admin edita la base en Apertura o Cierre**: el sistema pide el PIN Maestro antes de
  permitir la edición. El valor editado esa vez manda sobre el configurado, sin cambiar
  la configuración global.
- **Negocio sin PIN configurado (`business.pin` vacío)**: la edición del monto de la base
  se permite sin solicitud de PIN (no se puede exigir un secreto inexistente).
- **La Base Diaria cambia entre la apertura y el cierre del mismo turno**: tanto la
  Apertura como el Cierre usan el valor de la Base Diaria vigente al momento en que se
  abre cada modal (pre-cargado, editable con PIN), independientemente del `opening_balance`
  con que se abrió la sesión.
- **Primera sesión tras configurar la base**: no hay sesión previa; la apertura propone
  la base configurada igualmente.
- **Base configurada con decimales o valor no entero**: se normaliza al formato de
  moneda usado por el resto del POS (pesos sin decimales).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir a un administrador definir, en el panel de
  Configuración del POS de escritorio, un monto de "Base Diaria de Caja" en efectivo,
  único por negocio.
- **FR-002**: El sistema DEBE persistir la Base Diaria por negocio de forma que
  sobreviva al cierre de la aplicación y sea la misma en cualquier terminal del negocio.
- **FR-003**: Cuando un negocio no tiene Base Diaria configurada, el sistema DEBE
  tratarla como $0 (sin base retenida).
- **FR-004**: En la Apertura de Caja, el sistema DEBE pre-cargar el "Monto Inicial en
  Efectivo" con la Base Diaria configurada. El administrador PUEDE editarlo antes de
  confirmar (ver FR-012). La sesión se abre con el valor mostrado en pantalla.
- **FR-005**: En el Cierre de Caja, el sistema DEBE pre-cargar el monto de base a
  retener **siempre con la Base Diaria configurada**, con independencia del
  `opening_balance` con que se abrió la sesión. El administrador PUEDE editarlo esa vez
  (ver FR-012) sin alterar la configuración global.
- **FR-006**: Al cerrar la caja, el sistema NO DEBE registrar ningún movimiento en la
  Caja Central que represente la base retenida (se elimina el egreso "Base próximo día").
- **FR-007**: Al cerrar la caja, el ingreso de efectivo a la Caja Central DEBE
  corresponder al efectivo del día que efectivamente se deposita, es decir, sin incluir
  el monto de la base que permanece en la registradora, y sin restarlo dos veces.
- **FR-008**: El resultado del cierre NO DEBE producir descuadre acumulado en el total
  de la Caja Central por concepto de la base a lo largo de días consecutivos.
- **FR-009**: Si el monto de base a retener supera el efectivo físico contado al cierre,
  el sistema DEBE limitar el monto retenido al efectivo disponible y no generar un
  depósito negativo a la Caja Central.
- **FR-010**: El feature DEBE aplicar únicamente al POS de escritorio (`apps/desktop` y
  lógica compartida en `apps/shared`); el portal web no se modifica.
- **FR-011**: La documentación `docs/features/cash-flow.md` DEBE actualizarse para
  reflejar el nuevo flujo de apertura (base predeterminada) y cierre (base excluida de
  Caja Central, sin movimiento "Base próximo día").
- **FR-012**: Editar el monto de la base —tanto el "Monto Inicial en Efectivo" en la
  Apertura como "Base Próximo Día" en el Cierre— DEBE requerir el PIN Maestro del negocio
  ya configurado (validado contra `business.pin`, el mismo mecanismo que `SecurityPinModal`
  usa para acciones protegidas del POS). Si el PIN es incorrecto o se cancela, el campo
  conserva la Base Diaria configurada. Si el negocio no tiene PIN configurado, la edición
  se permite sin solicitud. No se introduce un nuevo módulo protegido ni un toggle de
  configuración para esto.

### Key Entities *(include if feature involves data)*

- **Base Diaria de Caja (ajuste de negocio)**: monto en efectivo, uno por negocio.
  Ausencia = 0. Se administra desde Configuración del POS de escritorio. Se consume en
  Apertura y Cierre de Caja.
- **Sesión de Caja**: su balance de apertura (`opening_balance`) se origina por defecto
  de la Base Diaria; queda registrado con el valor real con que se abrió (editable con
  PIN Maestro, ver FR-012).
- **Movimiento de Caja Central**: al cerrar caja deja de recibir el egreso que
  representaba la base del día siguiente; solo recibe el/los ingreso(s) por el efectivo y
  transferencias efectivamente depositados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador configura la Base Diaria en menos de 1 minuto desde que
  abre el panel de Configuración.
- **SC-002**: En el 100% de las aperturas de caja con Base Diaria configurada (> 0), el
  monto inicial aparece pre-cargado con ese valor sin intervención del cajero.
- **SC-003**: Tras cerrar caja, el Balance Total de la Caja Central no incluye el monto
  de la base retenida y no existe ningún movimiento "Base próximo día".
- **SC-004**: En 5 cierres de días consecutivos con la misma Base Diaria, el total de la
  Caja Central iguala exactamente la suma de los depósitos reales (descuadre = $0 por
  concepto de base).
- **SC-005**: El efectivo que queda en la registradora al cerrar iguala la Base Diaria
  configurada (o el valor editado por el administrador ese día).

## Assumptions

- El ajuste se persiste en la tabla `business_settings` con `setting_type = 'cash'` y
  `value = { daily_base: <número> }`, siguiendo el mismo patrón (upsert por
  `business_id,setting_type`) que el ajuste `security`. Ausencia del registro = base 0.
- El valor se expone en la store compartida `useBusinessStore` (`apps/shared`),
  siguiendo el patrón del fetch de `security` settings dentro de `fetchBusinessProfile`.
  Se añade como propiedad nueva sin cambiar firmas existentes.
- Solo administradores pueden abrir/cerrar caja y acceder a Configuración (regla ya
  vigente); no se añaden nuevos roles ni permisos.
- El "PIN Maestro" es `business.pin`, el mismo que valida `SecurityPinModal` para
  acciones protegidas del POS. No se añade un toggle de módulo protegido para la base:
  su edición siempre pide PIN cuando hay PIN configurado.
- No hay migración ni backfill: el usuario borrará todos los datos del negocio y el
  sistema arranca de cero, por lo que no existen movimientos "Base próximo día"
  históricos que reconciliar.
- Fórmula del cierre (resuelta en el Plan): el ingreso de efectivo a Caja Central sigue
  siendo el efectivo que entró en la sesión (`cashIngresos`), que **ya excluye** el
  `opening_balance`; basta con **eliminar el movimiento de egreso "Base próximo día"**
  para que la base no entre ni se reste dos veces. Con Apertura y Cierre proponiendo
  ambos la Base Diaria, `opening_balance == Base Diaria` en operación normal y el total
  de Caja Central = suma de depósitos reales (descuadre = 0). El monto de base retenida
  se conserva sólo como dato (`metadata.next_day_base`), sin generar movimiento.
- El formato de moneda es pesos colombianos sin decimales, consistente con el resto del
  POS.
- No se introduce lógica condicionada por `business_type`; la Base Diaria aplica a
  cualquier tipo de negocio.
