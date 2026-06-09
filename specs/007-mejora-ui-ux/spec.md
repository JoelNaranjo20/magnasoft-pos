# Feature Specification: Mejora Visual y de Experiencia de Usuario

**Feature Branch**: `007-mejora-ui-ux`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "con tus skill de ui/ux y diseño web, quiero mejorar la vista, contrastes y experiencia de usuario de toda la aplicacion, sin cambiar ninguna logica de backend o modificar estructura, solo quiero cambios esteticos visuales"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mejora Visual del Punto de Venta (Priority: P1)

El cajero/usuario principal pasa la mayor parte del tiempo en la pantalla de punto de venta (POS). Necesita que los elementos visuales tengan mejor contraste, jerarquía visual clara, estados interactivos obvios (hover, selección, deshabilitado) y que la información crítica (total, método de pago, resumen de turno) sea legible de un vistazo sin fatiga visual.

**Why this priority**: El POS es la pantalla de uso más frecuente (80%+ del tiempo del usuario). Cualquier mejora aquí impacta directamente la productividad diaria y reduce errores de cobro.

**Independent Test**: Abrir el POS en cualquier tipo de negocio, verificar que todos los botones, tarjetas de producto, carrito y modal de pago tienen contraste mejorado, estados visuales claros y tipografía legible. No debe haber regresiones en la lógica de cobro.

**Acceptance Scenarios**:

1. **Given** que el cajero abre el POS, **When** observa la cuadrícula de productos, **Then** cada producto muestra clara distinción entre estado normal, hover y seleccionado, con bordes y sombras que no se pierden en el fondo.
2. **Given** que hay productos en el carrito, **When** el cajero revisa el resumen, **Then** el total a pagar es el elemento visualmente más prominente, con subtotales y descuentos claramente diferenciados por color y tamaño.
3. **Given** que se abre el modal de pago, **When** el cajero selecciona método de pago, **Then** el método activo tiene indicador visual obvio (borde resaltado, ícono coloreado) que lo distingue de los inactivos.
4. **Given** que el cajero está en el modal de pago, **When** ingresa montos parciales, **Then** el restante por cobrar se actualiza con animación suave y cambio de color al acercarse a cero.
5. **Given** que el turno está abierto, **When** el cajero mira la barra superior del POS, **Then** ve claramente el estado del turno (hora de apertura, total acumulado) con íconos y colores semánticos.

---

### User Story 2 - Mejora Visual de Finanzas y Caja (Priority: P1)

El administrador y cajero revisan regularmente las pantallas de finanzas: CarteraHub, Caja Central, Estado de Caja, y los modales de apertura/cierre de turno. Necesitan que los números sean legibles, las diferencias entre ingresos/egresos sean obvias por color, y que el cierre de caja (conciliación) muestre claramente si hay descuadre y de cuánto.

**Why this priority**: Las finanzas y cierres de caja son la segunda operación más frecuente. Un descuadre confuso causa estrés y pérdida de tiempo al final del turno.

**Independent Test**: Abrir cada pantalla del módulo de finanzas, verificar contrastes de color en números positivos/negativos, legibilidad de tablas, estados de carga y mensajes de error. Probar cierre de caja con y sin descuadre.

**Acceptance Scenarios**:

1. **Given** que el cajero cierra el turno, **When** ve el modal de cierre, **Then** el total contado, la base inicial, los ingresos y egresos están en tarjetas separadas con colores semánticos (verde=ingreso, rojo=egreso, ámbar=descuadre).
2. **Given** que hay un descuadre, **When** se muestra la conciliación, **Then** el monto del descuadre es visualmente prominente con fondo de alerta y texto claro que indica si sobra o falta.
3. **Given** que el administrador revisa CarteraHub, **When** ve la lista de deudas, **Then** las deudas vencidas, próximas a vencer y al día tienen indicadores visuales distintos (color, ícono de advertencia).
4. **Given** que se abre Caja Central, **When** se muestran los movimientos, **Then** ingresos y egresos se diferencian instantáneamente por color de texto e ícono direccional.

---

### User Story 3 - Mejora Visual de Administración y Configuración (Priority: P2)

Los administradores gestionan trabajadores, servicios, productos, clientes y configuraciones desde el panel de administración. Estas pantallas tienen formularios, tablas, búsquedas y modales que necesitan mejor organización visual, espaciado consistente, campos de formulario con estados claros (focus, error, disabled) y tablas con mejor legibilidad.

**Why this priority**: Aunque se usa con menos frecuencia que el POS, una mala experiencia en administración causa errores de configuración que impactan todo el negocio.

**Independent Test**: Navegar por cada sección de admin (trabajadores, servicios, productos, clientes, configuración general), interactuar con formularios y tablas, verificar estados de campos, confirmar modales con mejor diseño.

**Acceptance Scenarios**:

1. **Given** que el admin edita un formulario (trabajador, servicio, producto), **When** un campo tiene error de validación, **Then** el campo muestra borde rojo sutil, ícono de advertencia y mensaje de error debajo en texto pequeño y claro.
2. **Given** que el admin usa una tabla de datos, **When** pasa el mouse sobre una fila, **Then** la fila tiene un sutil cambio de fondo que facilita seguir la línea horizontal sin perder la referencia.
3. **Given** que el admin usa el unificador de clientes, **When** selecciona cliente principal y secundarios, **Then** las tarjetas de selección muestran estados visuales claros: normal, seleccionado (principal, borde verde) y seleccionado (secundario, borde naranja con indicador de "se fusionará").
4. **Given** que el admin está en un modal de confirmación, **When** la acción es destructiva (eliminar, reset), **Then** el botón de confirmación usa colores de advertencia (rojo/naranja) y el modal tiene jerarquía visual que guía al usuario a leer antes de confirmar.

---

### User Story 4 - Mejora Visual del Dashboard y Reportes (Priority: P2)

El dashboard principal y los reportes (evolución del negocio, resumen operativo, historial de ventas) deben presentar datos de forma clara, con gráficos legibles, tarjetas de métricas con buena jerarquía y filtros de fecha intuitivos.

**Why this priority**: El dashboard es la primera pantalla que ve el administrador. Una buena presentación de datos facilita decisiones rápidas informadas.

**Independent Test**: Abrir dashboard, cambiar entre períodos, verificar que gráficos, tarjetas de KPIs y tablas de resumen tienen colores distinguibles, etiquetas legibles y tooltips informativos.

**Acceptance Scenarios**:

1. **Given** que el admin abre el dashboard, **When** ve las tarjetas de KPI principales, **Then** cada KPI muestra valor numérico grande, etiqueta pequeña arriba, variación porcentual con ícono direccional (subió/bajó) y color semántico.
2. **Given** que el admin ve un gráfico, **When** hay múltiples series de datos, **Then** los colores son distinguibles entre sí (paleta accesible para daltonismo) y las leyendas están ordenadas por valor.
3. **Given** que el admin revisa historial de ventas en modo evolución, **When** cambia el período (día/semana/mes), **Then** la transición entre períodos es suave y el gráfico mantiene consistencia visual.

---

### User Story 5 - Mejora Visual de Autenticación y Setup Inicial (Priority: P3)

Las pantallas de login, recuperación de contraseña, aprobación pendiente y setup inicial son la primera impresión del producto. Deben verse profesionales, con buen uso del espacio, inputs acogedores y mensajes de estado claros.

**Why this priority**: Se usan con poca frecuencia pero son la cara del producto. Una buena primera impresión genera confianza en el software.

**Independent Test**: Cerrar sesión, verificar pantalla de login. Probar flujo de recuperación de contraseña. Ver pantalla de "aprobación pendiente" y setup inicial. Confirmar que cada pantalla tiene diseño profesional y consistente.

**Acceptance Scenarios**:

1. **Given** que un usuario abre la aplicación, **When** ve la pantalla de login, **Then** el logo y nombre del producto son prominentes, los campos de entrada tienen etiquetas claras, y el botón de acción principal contrasta con el fondo.
2. **Given** que un usuario ingresa credenciales incorrectas, **When** se muestra el error, **Then** el mensaje de error aparece cerca del botón de login con un ícono de advertencia y texto descriptivo.
3. **Given** que un nuevo negocio está en setup, **When** selecciona el tipo de negocio, **Then** cada opción muestra ícono representativo, nombre y vista previa de los módulos que incluye, con transición visual al seleccionar.

---

### User Story 6 - Consistencia Global y Tema (Priority: P3)

Toda la aplicación debe sentirse como un solo producto cohesivo: misma paleta de colores, mismos espaciados, misma tipografía, mismos patrones de interacción. Los temas claro y oscuro deben funcionar correctamente en todas las pantallas sin elementos ilegibles o fuera de lugar.

**Why this priority**: La consistencia reduce la carga cognitiva del usuario. Una vez que aprende un patrón, puede aplicarlo en toda la app.

**Independent Test**: Navegar por cada pantalla principal en tema claro y oscuro, verificar que no hay texto ilegible, fondos rotos, o elementos que no respetan el tema. Verificar espaciados y tipografía consistentes.

**Acceptance Scenarios**:

1. **Given** que el usuario usa la app en tema oscuro, **When** navega por cualquier pantalla, **Then** todo el texto es legible (contraste mínimo 4.5:1), los fondos son oscuros consistentes, y los elementos interactivos son visibles.
2. **Given** que el usuario interactúa con botones, **When** compara botones primarios entre diferentes pantallas, **Then** usan el mismo color, tamaño, radio de borde y espaciado interno.
3. **Given** que el usuario ve tablas en diferentes módulos, **When** compara los estilos, **Then** los encabezados, filas, espaciado de celdas y bordes son idénticos.
4. **Given** que la aplicación carga datos, **When** se muestra un estado de carga, **Then** usa el mismo componente de skeleton/spinner en todas las pantallas, no spinners diferentes en cada módulo.

---

### Edge Cases

- ¿Qué sucede en pantallas con mucha densidad de información (ej. lista de 200+ clientes)? La tabla debe mantenerse legible con filas alternas sutiles y sticky headers.
- ¿Cómo se ve la aplicación en una pantalla de baja resolución (1366×768, común en laptops económicas)? Los elementos no deben desbordarse ni requerir scroll horizontal excesivo.
- ¿Qué sucede cuando hay datos vacíos? Usar estados vacíos con ilustración/ícono y texto guía, no simplemente "no hay datos".
- ¿Cómo se comportan los modales en tema oscuro vs claro? El overlay debe oscurecer consistentemente y el modal debe tener borde sutil para separarse del fondo.
- ¿Hay elementos con poco contraste en tema oscuro? Identificar y corregir: texto gris sobre fondo oscuro, badges de estado, campos de formulario.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todos los componentes interactivos (botones, inputs, selects, tabs) deben tener estados visuales distinguibles: normal, hover, focus, active/pressed, disabled y loading.
- **FR-002**: Los colores semánticos deben ser consistentes en toda la aplicación: verde para ingresos/éxito/positivo, rojo para egresos/error/negativo, ámbar para advertencias/pendiente, azul para información/neutral.
- **FR-003**: El tema oscuro debe aplicarse correctamente en TODAS las pantallas sin excepción — ningún texto debe ser ilegible por falta de contraste.
- **FR-004**: Las tablas de datos deben tener: encabezados sticky, filas alternas con sutil diferenciación, hover de fila, y columnas numéricas alineadas a la derecha.
- **FR-005**: Los formularios deben mostrar estados de validación en tiempo real: campo válido (borde verde o sin indicador), campo con error (borde rojo + mensaje), campo requerido (asterisco o indicador visual).
- **FR-006**: Los modales deben tener: overlay con opacidad consistente (60-70%), borde o sombra para separación del fondo, botón de cierre visible (X o Cancelar), y padding interno consistente.
- **FR-007**: Los estados de carga deben usar skeletons (no spinners) para contenido de datos, y spinners solo para acciones puntuales (guardar, eliminar). Ambos deben ser consistentes en diseño.
- **FR-008**: Los estados vacíos deben mostrar un ícono representativo, un título descriptivo ("No hay ventas hoy") y un subtítulo con acción sugerida si aplica.
- **FR-009**: La jerarquía tipográfica debe ser consistente: un solo tamaño de título principal por pantalla, subtítulos diferenciados, texto de cuerpo legible (mínimo 13px efectivo), y texto secundario/etiquetas más pequeño y de menor contraste.
- **FR-010**: Las animaciones y transiciones deben ser sutiles (150-300ms) y consistentes — mismo easing, misma duración para acciones equivalentes.
- **FR-011**: La paleta de colores de la aplicación debe estar documentada y ser usada consistentemente (no colores arbitrarios en cada componente).
- **FR-012**: Los botones de acción destructiva (eliminar, reset, cancelar suscripción) deben usar colores cálidos/de advertencia y requerir confirmación visual clara.
- **FR-013**: Los selectores de fecha y filtros deben tener un diseño unificado en todas las pantallas donde aparecen.
- **FR-014**: Las notificaciones/toasts deben aparecer en posición consistente (ej. esquina superior derecha) con ícono, mensaje y color semántico según tipo (éxito, error, info, advertencia).
- **FR-015**: No se debe modificar ninguna lógica de negocio, llamada a API, estructura de datos, store de Zustand, ni RPC de Supabase. Solo se cambian clases de Tailwind, estilos CSS y estructura de JSX para aplicar los nuevos diseños.

### Key Entities

Esta feature no introduce nuevas entidades de datos. Opera exclusivamente sobre la capa de presentación de entidades existentes:
- **Sale**: Ventas registradas en el sistema
- **Customer**: Clientes del negocio
- **Worker**: Trabajadores y sus comisiones
- **Product/Service**: Productos y servicios del negocio
- **CashSession**: Turnos de caja (apertura/cierre)
- **Business**: Configuración del negocio y tipo de industria

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario nuevo puede completar una venta simple en el POS sin confusión visual — todos los elementos interactivos tienen estados claros que guían la acción.
- **SC-002**: Cero pantallas con texto ilegible en tema oscuro (100% de cobertura de tema oscuro).
- **SC-003**: Reducción del 80% en estilos inconsistentes: mismo tipo de elemento (botón primario, tabla, input) se ve idéntico en todas las pantallas.
- **SC-004**: Los modales de la aplicación comparten el mismo sistema de diseño: overlay, borde, padding, botón de cierre y jerarquía de botones de acción consistentes.
- **SC-005**: El cierre de caja muestra el resultado de conciliación de forma que un usuario sin entrenamiento contable puede entender si el turno cuadró o no y por cuánto.
- **SC-006**: La aplicación mantiene su funcionalidad completa — cero regresiones en lógica de negocio, flujos de pago, cálculo de totales o persistencia de datos.

## Assumptions

- La aplicación actual usa Tailwind CSS como framework de estilos. Las mejoras se harán extendiendo y refinando las clases de Tailwind existentes, no reemplazando el framework.
- La paleta de colores actual (slate, emerald, rose, amber, indigo, sky) se mantiene como base y se refina su aplicación para mejor contraste y consistencia.
- El tema oscuro/claro se maneja con la clase `dark` de Tailwind. La mejora asegura que todos los componentes tengan variantes `dark:` apropiadas.
- Las modificaciones se limitan a archivos `.tsx` y `.css` dentro de `apps/desktop/src/`, `apps/shared/`, y `apps/web/src/`. No se tocan archivos de configuración, RPC, migraciones ni stores.
- El usuario prefiere un estilo profesional y moderno, no minimalista extremo — la aplicación es una herramienta de trabajo y la densidad de información es aceptable siempre que esté bien organizada.
- Las mejoras se aplican incrementalmente: primero POS, luego finanzas, luego admin, luego dashboard, luego auth/setup, y finalmente el pulido de consistencia global.
