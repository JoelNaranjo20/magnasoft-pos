# Feature Specification: Cards de Bonos y Ventas Servicios en Caja Central

**Feature Branch**: `013-bonos-ventas-cards`

**Created**: 2026-06-17 | **Status**: Clarified

**Input**: "Reemplazar card de Total Nómina por 2 cards: Bonos Entregados (fidelidad) y Total Ventas Servicios. Cada una cliqueable con modal de detalle."

## Clarifications

### Session 2026-06-17

- Q1: ¿Dónde va la tabla? → A: Reemplaza la card actual de "Total Nómina".
- Q2: ¿Qué muestra cada card? → A: Dos cards cliqueables: Bonos Entregados ($ regalados en fidelidad del mes) + Total Ventas Servicios ($ facturado en servicios del mes). Cada una abre modal de detalle.
- Q3: ¿De dónde vienen los datos de Bonos? → A: `sale_items` con `unit_price = 0` en ventas completadas del mes. El valor en $ se calcula con el precio normal del servicio (`services.price`), mostrando lo que se "regaló".
- Q4 (implied): ¿Bonos muestra cantidad o valor? → Valor en $ (precio normal del servicio × cantidad regalada).

## User Scenarios & Testing

### US1 — Card de Bonos Entregados (P1)

El administrador ve en Caja Central una card "🎁 Bonos Entregados" con el valor total en $ de servicios regalados por fidelidad en el mes en curso. Al hacer clic, se abre un modal con la lista detallada de cada bono: cliente, servicio, fecha, puntos canjeados.

**Acceptance Scenarios**:

1. **Given** que en el mes se canjearon 2 bonos (Lavado Básico $30K c/u), **When** el dashboard carga, **Then** la card muestra "$60,000".
2. **Given** que se hizo clic en la card, **When** se abre el modal, **Then** muestra cada canje con: cliente, servicio, fecha, puntos gastados.
3. **Given** que no hubo canjes en el mes, **When** el dashboard carga, **Then** la card muestra "$0" y el modal muestra "Sin bonos entregados este mes".

### US2 — Card de Total Ventas Servicios (P1)

El administrador ve una card "📊 Total Ventas Servicios" con el total facturado en servicios del mes. Al hacer clic, se abre un modal con detalle por servicio: nombre, cantidad vendida, total facturado.

**Acceptance Scenarios**:

1. **Given** que en el mes se facturaron $5,000,000 en servicios, **When** el dashboard carga, **Then** la card muestra "$5,000,000".
2. **Given** que se hizo clic, **When** se abre el modal, **Then** muestra cada servicio con cantidad vendida y total facturado.
3. **Given** que no hubo ventas, **When** el dashboard carga, **Then** la card muestra "$0".

## Requirements

- **FR-001**: Reemplazar la card "👥 Total Nómina" en el dashboard por dos cards: "🎁 Bonos Entregados" y "📊 Total Ventas Servicios".
- **FR-002**: La card "Bonos Entregados" DEBE mostrar el valor total en $ de los servicios regalados por fidelidad en el mes en curso. El valor = `services.price × cantidad` de los `sale_items` con `unit_price = 0`.
- **FR-003**: La card "Bonos Entregados" DEBE ser cliqueable y abrir un modal con la lista de canjes del mes: cliente, servicio, fecha, puntos gastados.
- **FR-004**: La card "Total Ventas Servicios" DEBE mostrar el total facturado en servicios del mes en curso.
- **FR-005**: La card "Total Ventas Servicios" DEBE ser cliqueable y abrir un modal con detalle por servicio: nombre, cantidad vendida, total facturado.
- **FR-006**: Ambas cards DEBEN respetar el diseño existente (2-columnas en fila, misma estética que Cartera Total/Recup Efectivo/Recup Transferencia).
- **FR-007**: Los modales DEBEN ser componentes compartidos en `apps/shared/components/modals/`.
- **FR-008**: Desktop y web DEBEN mostrar las mismas cards con los mismos datos.

## Success Criteria

- **SC-001**: Las dos cards reemplazan la card de Nómina en desktop y web.
- **SC-002**: El valor de Bonos Entregados refleja exactamente el costo real de los servicios regalados (precio normal × cantidad).
- **SC-003**: El modal de detalle de cada card abre en menos de 1 segundo.
- **SC-004**: Los totales en las cards coinciden con los datos del modal de detalle.

## Assumptions

- Bonos = `sale_items` con `unit_price = 0` en ventas completadas del mes. El valor se calcula con `services.price` (el precio normal del servicio).
- Si un servicio cambió de precio, se usa el precio actual (`services.price`), no el histórico. Esto es aceptable porque la diferencia suele ser mínima.
- Total Ventas Servicios = suma de `unit_price × quantity` de `sale_items` con `service_id` no nulo, en ventas completadas del mes. Reutiliza la lógica de `fetchCategorySales`.
- Si el módulo `module_payroll` está activo, la card de Nómina se reemplaza igualmente.
- Si no hay `reward_service_ids` configurados, Bonos Entregados muestra $0.
