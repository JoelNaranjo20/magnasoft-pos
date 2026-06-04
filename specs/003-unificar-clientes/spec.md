# Especificación de Funcionalidad: Unificar Clientes Duplicados

**Rama**: `003-unificar-clientes` | **Fecha**: 2026-06-03

**Status**: Draft

**Input**: "quiero solucionar los clientes repetidos que tengas ventas o movimientos registrados, opcion de unificar clientes repetidos, agregar la opcion de identificar un cliente repetido por su numero o nombre, y que el sistema verifique si un cliente ya esta registrado usando nombre o numero de telefono para no dejar registrar duplicados"

---

## Historias de Usuario

### Historia 1 — Detectar clientes potencialmente duplicados (Prioridad: P1)

El administrador accede a una nueva sección "Unificar Clientes" dentro de la gestión de clientes y el sistema le muestra una lista de clientes que potencialmente están duplicados, agrupados por coincidencia de teléfono o similitud de nombre. Cada grupo muestra los clientes involucrados, su historial de actividad (ventas, deudas, vehículos) y permite seleccionar cuáles unificar.

**Why this priority**: Sin detección no hay acción posible. Es el punto de entrada para resolver duplicados. La detección por sí sola ya aporta valor al visibilizar el problema.

**Independent Test**: Se puede probar accediendo a la vista "Unificar Clientes" (que se encontrara en el modulo de cliente como una accion mas en la columna de acciones o en la barra superior) y verificando que aparecen agrupaciones de clientes con mismo teléfono o nombre muy similar, cada uno mostrando su conteo de ventas y movimientos.

**Acceptance Scenarios**:

1. **Dado** que existen 3 clientes con el mismo número de teléfono "809-555-1234" y cada uno tiene ventas registradas, **Cuando** el admin entra a "Unificar Clientes", **Entonces** el sistema muestra un grupo etiquetado "Coincidencia por teléfono: 809-555-1234" con los 3 clientes listados, cada uno con su nombre, cantidad de ventas, deudas activas y vehículos asociados.

2. **Dado** que existen clientes "Juan Pérez", "Juan Perez" y "Juan P." en la base de datos, **Cuando** el admin entra a "Unificar Clientes", **Entonces** el sistema sugiere un grupo "Posible duplicado por nombre" mostrando estos clientes con un indicador de similitud, ordenados del más activo al menos activo.

3. **Dado** que un cliente no tiene duplicados detectables (teléfono único y nombre sin coincidencias cercanas), **Cuando** el admin revisa la lista de grupos, **Entonces** ese cliente no aparece en ninguna agrupación.

4. **Dado** que el negocio tiene 200+ clientes, **Cuando** el admin entra a "Unificar Clientes", **Entonces** los grupos de duplicados se cargan y muestran en menos de 3 segundos.

---

### Historia 2 — Unificar clientes duplicados (Prioridad: P1)

El administrador selecciona dos o más clientes de un grupo de duplicados, designa cuál es el cliente "principal" (el que se conservará) y ejecuta la unificación. El sistema reasigna todas las ventas, deudas, vehículos y demás registros relacionados al cliente principal, marca los clientes fusionados como "unificados", y registra la operación para auditoría.

**Why this priority**: Es la acción central que resuelve el problema. Sin unificar, la detección no sirve de nada.

**Independent Test**: Se puede probar seleccionando 2 clientes duplicados, ejecutando la unificación, y verificando que todas las ventas y deudas del cliente fusionado ahora aparecen bajo el cliente principal.

**Acceptance Scenarios**:

1. **Dado** que el admin selecciona al "Cliente B" (3 ventas, 1 deuda) para unificar dentro del "Cliente A" (10 ventas, 0 deudas) como principal, **Cuando** confirma la operación, **Entonces** el "Cliente A" pasa a tener 13 ventas y 1 deuda, el "Cliente B" queda marcado como "unificado", y se muestra un mensaje de éxito con el resumen de cambios.

2. **Dado** que el admin inicia una unificación, **Cuando** se muestra la vista previa, **Entonces** aparece un resumen claro antes de confirmar: "Se unificará 'Cliente B' → 'Cliente A'. Se transferirán: 3 ventas, 1 deuda, 2 vehículos. El Cliente B quedará marcado como unificado."

3. **Dado** que el admin intenta unificar clientes pero no ha seleccionado cuál es el principal, **Cuando** presiona "Unificar", **Entonces** el sistema muestra un mensaje "Selecciona cuál cliente se conservará como principal" y no procede.

4. **Dado** que ocurre un error durante la unificación (ej. problema de conexión), **Cuando** la operación falla, **Entonces** el sistema revierte los cambios parciales, muestra un mensaje de error claro, y los datos quedan en su estado original sin cambios a medias.

---

### Historia 3 — Buscar e identificar manualmente un cliente duplicado por nombre o número (Prioridad: P2)

El administrador puede buscar manualmente un cliente por nombre o teléfono desde la vista de unificación para verificar si tiene duplicados, incluso cuando el sistema no los haya agrupado automáticamente. Esto permite identificar duplicados que el algoritmo automático podría no haber detectado (ej. cliente registrado con un typo en el nombre pero sin teléfono).

**Why this priority**: Complementa la detección automática cubriendo casos límite. Puede implementarse como mejora de la búsqueda existente.

**Independent Test**: Se puede probar escribiendo un nombre o teléfono en el buscador manual y verificando que aparecen todos los clientes que coinciden, permitiendo seleccionarlos para unificar aunque no estuvieran agrupados automáticamente.

**Acceptance Scenarios**:

1. **Dado** que el admin quiere verificar si "María Rodríguez" tiene duplicados, **Cuando** escribe "María" en el buscador manual de "Unificar Clientes", **Entonces** el sistema muestra todos los clientes cuyo nombre o teléfono contenga "María", permitiendo seleccionar manualmente varios para iniciar una unificación.

2. **Dado** que el admin busca por el teléfono "809-555-9999", **Cuando** el sistema encuentra 2 clientes con ese número, **Entonces** se muestran ambos con casillas de selección y un botón "Unificar seleccionados" habilitado.

3. **Dado** que el admin busca un nombre que solo tiene un cliente, **Cuando** el resultado es un solo cliente, **Entonces** el sistema muestra un mensaje "No se encontraron duplicados para esta búsqueda" y no habilita la opción de unificar.

---

### Historia 4 — Prevenir registro de clientes duplicados (Prioridad: P1)

Al momento de crear un nuevo cliente, el sistema verifica automáticamente si ya existe otro cliente con el mismo número de teléfono (normalizado) o con un nombre muy similar. Si se detecta una posible coincidencia, el sistema alerta al usuario mostrando los clientes existentes que coinciden y pregunta si realmente desea crear uno nuevo o si prefiere usar el cliente ya existente. Esto evita que el problema de duplicados siga creciendo mientras se limpian los existentes.

**Why this priority**: Es la acción preventiva que cierra la puerta a nuevos duplicados. Sin esto, mientras el admin unifica duplicados existentes, los cajeros pueden seguir creando nuevos duplicados desde el POS. Prevenir es más valioso que corregir.

**Independent Test**: Se puede probar intentando crear un cliente con un teléfono que ya existe, o con un nombre casi idéntico a uno existente, y verificando que el sistema muestra la alerta de posible duplicado antes de permitir la creación.

**Acceptance Scenarios**:

1. **Dado** que ya existe un cliente "Juan Pérez" con teléfono "809-555-1234", **Cuando** un cajero intenta crear un nuevo cliente "Juan Perez" con el mismo teléfono "809-555-1234" desde cualquier formulario (gestión de clientes, POS, modal rápido), **Entonces** el sistema muestra una alerta: "Ya existe un cliente con este teléfono: Juan Pérez. ¿Deseas usar el cliente existente en lugar de crear uno nuevo?" y ofrece dos botones: "Usar existente" y "Crear de todos modos".

2. **Dado** que ya existe un cliente "María Rodríguez" sin teléfono registrado, **Cuando** un cajero intenta crear "Maria Rodriguez" (sin tilde, misma fonética) también sin teléfono, **Entonces** el sistema detecta la similitud de nombre y muestra: "Posible duplicado: ya existe 'María Rodríguez' con un nombre similar. ¿Es la misma persona?" con los mismos dos botones de acción.

3. **Dado** que el cajero intenta crear un cliente y el sistema detecta un posible duplicado, **Cuando** el cajero elige "Usar existente", **Entonces** el formulario de creación se cierra y el cliente existente queda seleccionado automáticamente en el contexto actual (carrito POS, gestión de vehículos, etc.).

4. **Dado** que el cajero revisa la alerta de posible duplicado y considera que es una persona diferente, **Cuando** elige "Crear de todos modos", **Entonces** el sistema crea el nuevo cliente normalmente. Esta acción queda registrada para que el admin pueda revisarla luego en la vista de unificación.

5. **Dado** que un cajero intenta crear un cliente con nombre y teléfono completamente nuevos sin coincidencias, **Cuando** envía el formulario, **Entonces** el sistema crea el cliente sin mostrar ninguna alerta (flujo actual sin interrupciones).

---

### Casos Límite

- **Unificar un cliente consigo mismo**: El sistema debe impedir seleccionar el mismo cliente como origen y destino de la unificación.
- **Cliente principal ya unificado previamente**: Si el cliente designado como principal fue previamente unificado dentro de otro, se debe permitir (herencia de unificaciones en cadena). Sus ventas ya transferidas se consolidan correctamente.
- **Cliente origen con cero actividad**: Si el cliente a fusionar no tiene ventas, deudas ni vehículos, igual se permite la unificación (simplemente se marca como unificado sin transferir registros).
- **Múltiples clientes fusionados al mismo principal**: Se pueden unificar 3, 5 o más clientes duplicados en un solo paso atómico.
- **Búsqueda con espacios extras o tildes**: "Maria" debe encontrar a "María" y viceversa. "Juan   Pérez" (espacios múltiples) debe coincidir con "Juan Pérez".
- **Teléfono con formato inconsistente**: "8095551234", "809-555-1234" y "(809) 555-1234" deben considerarse el mismo número para detección de duplicados.
- **Cliente sin teléfono**: Solo se puede detectar como duplicado por similitud de nombre.
- **Cliente "Público General"**: No debe aparecer en las sugerencias de duplicados ni poder ser unificado. Es el cliente anónimo por defecto.
- **Detección de duplicado durante creación sin teléfono**: Si el cliente a crear no tiene teléfono y el existente tampoco, la comparación se hace solo por similitud de nombre normalizado (sin tildes, sin espacios extras, case-insensitive).
- **Múltiples coincidencias en creación**: Si el sistema encuentra 3 o más clientes existentes con el mismo teléfono o nombre similar, muestra los primeros 5 en la alerta con un mensaje "y 3 más...".
- **Creación de cliente idéntico a uno ya unificado**: Si el cliente existente que coincide ya fue marcado como unificado (tiene `merged_into_id`), el sistema debe tratar la coincidencia contra el cliente principal (el que absorbió al unificado), no contra el registro ya inactivo.

---

## Requerimientos Funcionales

- **FR-001**: El sistema DEBE mostrar una vista "Unificar Clientes" accesible desde la gestión de clientes, visible solo para usuarios con rol admin.
- **FR-002**: El sistema DEBE detectar y agrupar automáticamente clientes duplicados por coincidencia exacta de número de teléfono (normalizado), mostrando cada grupo con sus integrantes y su actividad (cantidad de ventas, deudas activas, vehículos).
- **FR-003**: El sistema DEBE detectar y agrupar clientes con nombres similares (misma raíz ignorando tildes, mayúsculas/minúsculas, espacios extras y puntuación) como posibles duplicados, con un indicador visual de "posible duplicado" para distinguirlos de las coincidencias exactas por teléfono.
- **FR-004**: El sistema DEBE permitir al admin seleccionar dos o más clientes de un grupo de duplicados y designar uno como "cliente principal" que se conservará.
- **FR-005**: El sistema DEBE mostrar una vista previa de la unificación antes de ejecutarla, detallando: nombres de clientes involucrados, cuál es el principal, cantidad de ventas, deudas, vehículos y registros totales que se transferirán.
- **FR-006**: El sistema DEBE ejecutar la unificación de forma atómica: reasignar todas las ventas (`sales.customer_id`), deudas (`customer_debts.customer_id`), vehículos (`vehicles.customer_id`) y cualquier otra tabla que referencie al cliente hacia el cliente principal.
- **FR-007**: El sistema DEBE marcar los clientes fusionados como "unificados" registrando en su campo `metadata` el ID del cliente principal, la fecha de unificación, y el ID del admin que la ejecutó. Esto permite trazabilidad sin eliminar el registro.
- **FR-008**: El sistema DEBE ofrecer un buscador manual dentro de "Unificar Clientes" que permita buscar clientes por nombre o teléfono, seleccionar varios resultados manualmente e iniciar una unificación aunque no estuvieran agrupados automáticamente.
- **FR-009**: El sistema DEBE normalizar números de teléfono (eliminar espacios, guiones, paréntesis) para la detección de duplicados y la búsqueda manual.
- **FR-010**: El sistema DEBE excluir al cliente "Público General" de las sugerencias de duplicados y de la posibilidad de ser unificado.
- **FR-011**: El sistema DEBE impedir que un cliente marcado como "unificado" sea seleccionado como principal en una nueva unificación. Solo clientes activos (no unificados previamente como origen) pueden ser el principal.
- **FR-012**: El sistema DEBE registrar un log de auditoría de cada operación de unificación (quién, cuándo, clientes involucrados, registros transferidos) para trazabilidad futura.
- **FR-013**: El sistema DEBE verificar, en todos los formularios de creación de cliente (gestión de clientes, modal rápido del POS, modal de vehículos), si ya existe un cliente activo con el mismo número de teléfono normalizado antes de permitir la creación.
- **FR-014**: El sistema DEBE verificar, en todos los formularios de creación de cliente, si ya existe un cliente activo con nombre similar (ignorando tildes, mayúsculas/minúsculas, espacios múltiples y puntuación) antes de permitir la creación, especialmente cuando el nuevo cliente no tiene teléfono registrado.
- **FR-015**: Ante una coincidencia detectada durante la creación, el sistema DEBE mostrar una alerta con los clientes existentes que coinciden (nombre, teléfono, última visita) y ofrecer dos opciones: "Usar cliente existente" (selecciona al existente y cancela la creación) o "Crear de todos modos" (procede con la creación y registra el evento para revisión posterior del admin).

---

## Criterios de Éxito

- **CE-001**: Un administrador puede detectar y unificar un grupo de 3 clientes duplicados en menos de 2 minutos (desde que entra a la vista hasta que confirma la unificación).
- **CE-002**: La detección automática de duplicados por teléfono tiene 100% de precisión (coincidencia exacta normalizada, sin falsos positivos).
- **CE-003**: La unificación atómica garantiza que en caso de fallo parcial, ningún dato queda en estado inconsistente (todo transferido o nada transferido).
- **CE-004**: El tiempo de carga de la vista "Unificar Clientes" no excede los 3 segundos para negocios con hasta 500 clientes.
- **CE-005**: Después de una unificación exitosa, el 100% de los registros relacionados (ventas, deudas, vehículos) del cliente origen aparecen bajo el cliente principal al consultar desde cualquier vista del sistema (POS, historial, reportes, cartera).
- **CE-006**: Las operaciones existentes de crear, editar, buscar y eliminar clientes funcionan sin cambios ni regresiones.
- **CE-007**: La tasa de creación de nuevos clientes duplicados se reduce al menos un 90% tras implementar la verificación en los formularios de creación (medido comparando duplicados creados por mes antes y después del cambio).

---

## Entidades Clave

- **Cliente (`customers`)**: Entidad central. Se agrega uso del campo `metadata` (JSONB) para almacenar: `merged_into_id` (UUID del cliente principal), `merged_at` (timestamp), `merged_by` (UUID del admin). Clientes con `merged_into_id` no nulo se consideran "unificados".
- **Venta (`sales`)**: Referencia a cliente vía `customer_id`. Se reasigna durante la unificación.
- **Deuda (`customer_debts`)**: Referencia a cliente vía `customer_id`. Se reasigna durante la unificación.
- **Vehículo (`vehicles`)**: Referencia a cliente vía `customer_id`. Se reasigna durante la unificación.
- **Log de Auditoría**: Nuevo registro (puede ser tabla dedicada o entrada en metadata del cliente principal) con: `id`, `business_id`, `performed_by`, `performed_at`, `target_customer_id`, `merged_customer_ids[]`, `transferred_counts` (JSON con conteo de registros transferidos por tipo).

---

## Supuestos

- La unificación es una operación exclusiva para administradores (rol admin). Los cajeros no tienen acceso a esta funcionalidad.
- Los clientes marcados como "unificados" no se eliminan de la base de datos — permanecen para trazabilidad pero no aparecen en búsquedas normales ni en el POS.
- El cliente "Público General" se identifica por nombre exacto y no tiene teléfono. Es tratado como caso especial en toda la lógica de unificación.
- La normalización de teléfonos elimina todos los caracteres no numéricos para comparación, pero no modifica el valor almacenado en la base de datos.
- La detección por similitud de nombre usa comparación básica (ignorando tildes, mayúsculas/minúsculas, espacios múltiples) — no requiere un algoritmo de fuzzy matching avanzado tipo Levenshtein en esta versión.
- La vista "Unificar Clientes" se integra como una pestaña o botón dentro de la página existente de Gestión de Clientes (`/customers`), no como una ruta nueva.
- La operación de unificación se ejecuta en una sola transacción atómica en base de datos para garantizar consistencia (todo o nada).
- No se requiere migración de esquema — los campos necesarios para auditoría se almacenan en el `metadata` JSONB ya existente.
