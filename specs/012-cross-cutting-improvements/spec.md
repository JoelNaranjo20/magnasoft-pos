# Feature Specification: Mejoras Transversales — Inventario, Puntos, Caja Central

**Feature Branch**: `012-cross-cutting-improvements`

**Created**: 2026-06-15 | **Status**: Clarified

**Input**: "1. Inventario: uso de productos internos como gasto con valor promediado de compra. 2. Bonos de premios: puntos de clientes vencen a 6 meses sin actividad. 3. Caja Central: resumen mensual con ingresos efectivo + transferencia en 2 columnas, egresos, ventas por categoría y analítica de servicios."

## Clarifications

### Session 2026-06-15

- Q1: ¿Cómo se registra el consumo interno de inventario? → A: Gasto en `cash_movements` de la sesión activa (`type='expense'`) con el costo promedio de compra del producto.
- Q2: ¿Cómo funciona el vencimiento de puntos? → B: Si el cliente no acumula NI canjea puntos en 6 meses, TODOS sus puntos expiran.
- Q3: ¿Dónde se ve el resumen de ingresos/egresos en 2 columnas? → Al hacer clic en "Ver Historial Completo" del dashboard.

### Session 2026-06-16

- Q4: ¿Cómo configurar el tiempo de vencimiento de puntos? → A: Campo numérico "Meses para expirar" en Fidelización (`LoyaltySettings.tsx`). Default: 6. Si es 0, los puntos nunca expiran. Se guarda en `business_settings.loyalty.value.expiration_months`. `PaymentModal` lee este valor dinámicamente.

## User Scenarios & Testing

### US1 — Consumo Interno de Inventario como Gasto (P1)

El administrador necesita usar productos del inventario para consumo interno del negocio (ej: aceite para vehículo propio del taller, productos de limpieza, insumos de cocina para el personal). Selecciona el producto, indica la cantidad, y el sistema registra un egreso en la caja diaria por el costo promedio de compra (no el precio de venta) y descuenta esa cantidad del stock.

**Why this priority**: Impacta directamente la precisión del inventario y los costos del negocio. Sin esto, el inventario no refleja salidas reales y los costos están subestimados.

**Independent Test**: Abrir inventario → seleccionar producto → registrar "Consumo Interno" con cantidad 2 → verificar que en la caja diaria aparece un egreso con el costo promedio × 2, y que el stock bajó en 2 unidades.

**Acceptance Scenarios**:

1. **Given** que hay un producto en inventario con stock 10 y costo promedio $15,000, **When** el admin registra consumo interno de 3 unidades, **Then** el stock baja a 7, y en `cash_movements` aparece un egreso de $45,000 con descripción "Consumo interno: [Producto]".
2. **Given** que el producto tiene compras a diferentes precios (ej: lote 1 a $10,000, lote 2 a $20,000), **When** se calcula el costo, **Then** se usa el promedio ponderado: (10,000+20,000)/2 = $15,000 por unidad.
3. **Given** que no hay stock suficiente, **When** el admin intenta registrar consumo interno, **Then** el sistema muestra error "Stock insuficiente".

---

### US2 — Vencimiento de Puntos de Clientes (P2)

Los clientes acumulan puntos por compras que pueden canjear por premios. Si un cliente no acumula NI canjea puntos durante 6 meses consecutivos, todos sus puntos expiran automáticamente. Si el cliente realiza cualquier actividad (nueva compra que genera puntos, o canje de puntos), el contador de 6 meses se reinicia desde esa fecha.

**Why this priority**: Evita que los clientes acumulen puntos indefinidamente, lo que podría representar un pasivo contable creciente. Es una práctica estándar en programas de lealtad.

**Independent Test**: Cliente con 500 puntos acumulados el 1-ene. Sin actividad hasta 2-jul (>6 meses) → puntos expiran. Si el 15-jun canjea 100 puntos → contador se reinicia, nueva fecha de expiración es 15-dic.

**Acceptance Scenarios**:

1. **Given** que un cliente acumuló puntos hace 7 meses sin actividad posterior, **When** el sistema verifica vencimiento, **Then** los puntos del cliente se marcan como expirados (estado = 'expired' o puntos = 0).
2. **Given** que un cliente acumuló puntos hace 5 meses, **When** hoy realiza una compra que genera nuevos puntos, **Then** su fecha de última actividad se actualiza a hoy y el contador de 6 meses se reinicia.
3. **Given** que un cliente canjea puntos, **When** se registra el canje, **Then** su fecha de última actividad se actualiza (reinicia contador de vencimiento).
4. **Given** que un cliente tiene puntos expirados, **When** intenta canjearlos, **Then** el sistema muestra que ya no tiene puntos disponibles.

---

### US3 — Resumen Mensual 2 Columnas en Caja Central (P1)

Al hacer clic en "Ver Historial Completo" en el dashboard de Caja Central, se abre un modal con el resumen completo del mes: columna izquierda con todos los ingresos en efectivo, columna derecha con todos los ingresos por transferencia, sección de egresos abajo, ventas por categoría, y analítica con número de ventas por servicio (cantidad de veces que se vendió cada servicio).

**Why this priority**: Es la vista financiera más importante para el administrador — reemplaza los acordeones mensuales genéricos por un desglose detallado y accionable del mes en curso.

**Independent Test**: Abrir Caja Central → clic en "Ver Historial Completo" → modal muestra ingresos efectivo (columna izq) + ingresos transferencia (columna der) + egresos + ventas por categoría + analytics de servicios.

**Acceptance Scenarios**:

1. **Given** que el mes tiene movimientos en efectivo y transferencia, **When** se abre el modal, **Then** se ven dos columnas lado a lado: ingresos efectivo (izq, fondo verde) e ingresos transferencia (der, fondo azul), cada una con su lista de movimientos y total.
2. **Given** que hay egresos en el mes, **When** se abre el modal, **Then** debajo de las columnas de ingresos aparece la sección de egresos con lista y total.
3. **Given** que hay ventas en el mes, **When** se abre el modal, **Then** la sección "Ventas por Categoría" muestra cada categoría con monto y porcentaje.
4. **Given** que hay servicios vendidos, **When** se abre el modal, **Then** la sección "Servicios Vendidos" muestra cada servicio con la cantidad de veces que se vendió (nº de ventas, no monto).

## Requirements

### Functional Requirements — Inventario

- **FR-001**: El sistema DEBE permitir registrar "Consumo Interno" de un producto desde el módulo de inventario.
- **FR-002**: El costo del consumo interno DEBE calcularse con el precio promedio ponderado de compra del producto (`SUM(costo_total_lotes) / SUM(cantidad_lotes)`), no con el precio de venta al cliente.
- **FR-003**: Al registrar consumo interno, el sistema DEBE insertar un movimiento de egreso en `cash_movements` de la sesión activa: `type='expense'`, `amount=costo_promedio × cantidad`, `description='Consumo interno: [nombre producto]'`.
- **FR-004**: El sistema DEBE descontar la cantidad consumida del stock del producto en inventario.
- **FR-005**: El sistema DEBE validar que hay stock suficiente antes de permitir el consumo interno.

### Functional Requirements — Puntos

- **FR-006**: Cada cliente con puntos DEBE tener una fecha de última actividad (`last_activity_at`) que se actualiza cuando acumula o canjea puntos.
- **FR-007**: Si un cliente NO acumula NI canjea puntos durante 6 meses consecutivos desde su `last_activity_at`, TODOS sus puntos DEBEN expirar (marcarse como `status='expired'` o reducirse a 0).
- **FR-008**: Cualquier acumulación de puntos (por compra) o canje de puntos (por premio) DEBE reiniciar el contador de 6 meses actualizando `last_activity_at`.
- **FR-009**: Los puntos expirados NO DEBEN estar disponibles para canje.
- **FR-010**: El administrador DEBE poder configurar el tiempo de vencimiento de puntos desde Fidelización (`LoyaltySettings.tsx`) con un campo numérico "Meses para expirar puntos". Default: 6 meses. Valor 0 = los puntos nunca expiran. Se guarda en `business_settings.loyalty.value.expiration_months`.

### Functional Requirements — Caja Central

- **FR-011**: El botón "Ver Historial Completo" en el dashboard DEBE abrir un modal con el resumen detallado del mes en curso.
- **FR-012**: El modal DEBE mostrar dos columnas lado a lado: "Ingresos Efectivo" (columna izquierda, fondo verde) e "Ingresos Transferencia" (columna derecha, fondo azul). Cada columna lista los movimientos de ingreso de ese método con monto y descripción.
- **FR-013**: Debajo de las columnas de ingresos, el modal DEBE mostrar la sección "Egresos" con lista de todos los egresos del mes, cada uno con descripción, fecha y monto.
- **FR-014**: El modal DEBE incluir la sección "Ventas por Categoría" con el desglose de ventas del mes agrupadas por categoría, mostrando monto y porcentaje del total.
- **FR-014**: El modal DEBE incluir la sección "Servicios Vendidos" con cada servicio y la cantidad de veces que se vendió en el mes (número de ventas, no monto total).
- **FR-015**: El modal DEBE mostrar totales: Total Ingresos Efectivo, Total Ingresos Transferencia, Total Ingresos, Total Egresos, y Neto del Mes.
- **FR-016**: El modal DEBE funcionar idénticamente en desktop y web usando componentes compartidos desde `apps/shared/components/modals/`.

## Key Entities

- **Product (inventario)**: Ya existe en `products`. Atributos relevantes: `stock`, `price` (venta). Nuevo: `cost_average` (costo promedio ponderado de compra, puede calcularse desde `inventory_movements`).
- **InventoryMovement**: Ya existe en `inventory_movements`. Registra entradas (compras) y salidas (ventas, consumo interno). Atributos: `product_id`, `type`, `quantity`, `unit_cost`, `total_cost`.
- **CustomerPoints / LoyaltyPoints**: Tabla de puntos de clientes. Atributos necesarios: `customer_id`, `points`, `last_activity_at`, `status` (active/expired).
- **CashMovement**: Ya existe. Movimientos de caja diaria. El consumo interno genera un registro `type='expense'`.
- **CentralCashMovement**: Ya existe. Movimientos en Caja Central. Se usa para el resumen del mes (FR-010 a FR-016).

## Success Criteria

- **SC-001**: Un consumo interno de inventario se registra en menos de 3 segundos y descuenta el stock inmediatamente.
- **SC-002**: El costo registrado en el egreso por consumo interno coincide exactamente con el costo promedio ponderado del producto (no el precio de venta).
- **SC-003**: Los puntos de un cliente sin actividad en 6 meses expiran correctamente al día siguiente de cumplirse el plazo.
- **SC-004**: Un canje o acumulación de puntos reinicia el contador de vencimiento instantáneamente.
- **SC-005**: El modal de "Ver Historial Completo" abre en menos de 1 segundo con todos los datos del mes: ingresos efectivo, ingresos transferencia, egresos, categorías y servicios.
- **SC-006**: El neto del mes mostrado en el modal coincide exactamente con el KPI de Balance Total del dashboard.

## Assumptions

- **Inventario**: El costo promedio ponderado se calcula como `SUM(unit_cost × quantity) / SUM(quantity)` de las entradas de inventario (`inventory_movements.type='purchase'`). Si no hay compras registradas con costo, se usa `price` (precio de venta) como fallback con un warning.
- **Inventario**: El consumo interno se registra en `cash_movements` (caja diaria de la sesión activa), NO directamente en `central_cash_movements`. El cierre de sesión lo trasladará a Caja Central como parte de los egresos del turno.
- **Puntos**: Si no existe una tabla de puntos/lealtad, se debe crear `customer_loyalty_points` con `customer_id`, `points`, `last_activity_at`, `status`. Si ya existe, se extiende con `last_activity_at` y `status`.
- **Puntos**: La verificación de vencimiento se ejecuta al cargar el perfil del cliente o al intentar canjear puntos. No requiere un job programado (se puede agregar después).
- **Caja Central**: El modal de "Ver Historial Completo" reemplaza el contenido actual de `CentralCashHistoryModal`. Los acordeones mensuales que mostraba antes se eliminan. La nueva vista es siempre del mes en curso.
- **Caja Central**: Los datos de ingresos/egresos se obtienen de los `useMemo` ya existentes en el hook (`cashMovementsDelMes`, `transferMovementsDelMes`). No se requieren nuevas queries.
