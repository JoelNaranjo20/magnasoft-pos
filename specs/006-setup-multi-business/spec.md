# Feature Specification: Interfaz Correcta Según Tipo de Negocio al Primer Registro

**Feature Branch**: `006-setup-multi-business`

**Created**: 2026-06-05

**Status**: Draft

**Input**: "este es un software multi empresa, quiero asgurarme que al seleccionar otro negocio al registrar por primer vez, se mostrara la interfas correspondiente de cada quien. Solo quiero: lavado de carro, barber shop, salón de belleza y restaurante."

---

## User Scenarios & Testing

### User Story 1 — Selección del tipo de negocio con vista previa de funcionalidades (Priority: P1)

El usuario está en la pantalla de configuración inicial. Ve 4 tarjetas que representan los tipos de negocio: Lavado de Carro, Barber Shop, Salón de Belleza y Restaurante. Al seleccionar una, el sistema muestra inmediatamente qué funcionalidades tendrá ese negocio y cuáles no. Esto permite tomar una decisión informada antes de confirmar.

**Why this priority**: Actualmente el usuario elige a ciegas — solo ve un ícono y nombre. No sabe qué pantallas, módulos o funcionalidades tendrá disponibles después. Mostrar una vista previa evita selecciones incorrectas y reduce tickets de soporte por "me equivoqué de tipo de negocio".

**Independent Test**: Abrir setup. Seleccionar "Lavado de Carro" — ver módulos activos. Cambiar a "Restaurante" — ver que la lista de módulos cambia completamente (sin vehículos, con mesas).

**Acceptance Scenarios**:

1. **Given** un usuario nuevo en setup, **When** selecciona "Lavado de Carro", **Then** la vista previa muestra como activo: Gestión de Vehículos, Cola de Servicio, Comisiones, Pago de Comisiones, Clientes, Inventario. Como inactivo: Mesas, Citas.

2. **Given** el usuario selecciona "Barber Shop", **When** revisa la vista previa, **Then** muestra como activo: Comisiones, Pago de Comisiones, Clientes, Inventario. Como inactivo: Vehículos, Mesas, Cola de Servicio.

3. **Given** el usuario selecciona "Salón de Belleza", **When** revisa la vista previa, **Then** muestra como activo: Citas y Agenda, Comisiones, Pago de Comisiones, Clientes, Inventario. Como inactivo: Vehículos, Mesas.

4. **Given** el usuario selecciona "Restaurante", **When** revisa la vista previa, **Then** muestra como activo: Mesas, Clientes, Inventario. Como inactivo: Vehículos, Comisiones, Cola de Servicio, Citas.

---

### User Story 2 — Interfaz diferente según el negocio creado (Priority: P1)

Después de crear el negocio, el usuario entra a la pantalla principal. Lo que ve es **diferente según el tipo de negocio** que eligió. No es solo un cambio de colores o nombre — son funcionalidades y pantallas distintas:

- **Lavado de Carro**: El POS permite registrar vehículos (placa, tipo, marca, modelo). La cola de servicios muestra los carros en espera. El dashboard muestra métricas de servicios automotrices.
- **Barber Shop**: El POS asigna barberos/estilistas a cada servicio. La sección de comisiones permite liquidar porcentajes a cada barbero. No hay vehículos ni mesas.
- **Salón de Belleza**: Similar a barbería pero incluye agenda de citas. Los profesionales pueden tener horarios. Comisiones por servicio.
- **Restaurante**: El POS muestra el plano de mesas (PATIO). Los pedidos se asocian a mesas. No hay vehículos, comisiones ni cola de servicio.

**Why this priority**: Es el objetivo central de la feature. Si todos los negocios ven lo mismo, el software no es multi-empresa real. Cada industria debe tener su experiencia adaptada.

**Independent Test**: Crear un negocio de cada tipo (uno por uno) y verificar que la interfaz principal, el POS, y el menú de navegación reflejan exactamente las funcionalidades de esa industria.

**Acceptance Scenarios**:

1. **Given** un negocio tipo "Lavado de Carro", **When** el usuario abre el POS, **Then** ve: selector de vehículo con placa, tipo de vehículo (carro/moto), cola de servicios. NO ve: plano de mesas, asignación de barberos por servicio.

2. **Given** un negocio tipo "Barber Shop", **When** el usuario abre el POS, **Then** ve: selector de barbero/estilista por cada servicio, sección de comisiones. NO ve: registro de vehículos, cola de servicios automotriz, plano de mesas.

3. **Given** un negocio tipo "Salón de Belleza", **When** el usuario navega, **Then** ve: agenda de citas, asignación de profesionales, comisiones por servicio. NO ve: vehículos, mesas de restaurante.

4. **Given** un negocio tipo "Restaurante", **When** el usuario abre el POS, **Then** ve: plano de mesas interactivo, asignación de pedidos a mesa. NO ve: gestión de vehículos, comisiones de barbería, cola de servicios automotriz.

---

### User Story 3 — Configuración atómica: todo o nada (Priority: P2)

Cuando el usuario confirma la creación, el tipo de negocio y los módulos activos se guardan juntos. Si algo falla a medio camino, el negocio **no se crea** — no queda un negocio a medias sin módulos configurados.

**Why this priority**: Actualmente la creación y la configuración de módulos son dos pasos separados. Si el segundo falla, el negocio se crea con módulos vacíos y el usuario ve una pantalla en blanco. Esto ya ha pasado.

**Independent Test**: Simular un error durante la creación. Verificar que el negocio NO aparece en la base de datos. Reintentar — verificar que se crea completo con todos los módulos correctos.

**Acceptance Scenarios**:

1. **Given** el usuario selecciona "Lavado de Carro" y confirma, **When** la creación es exitosa, **Then** la pantalla principal carga con: módulo de vehículos activo, cola de servicio visible, comisiones habilitadas. El menú de navegación solo muestra las secciones correspondientes a este tipo de negocio.

2. **Given** ocurre un error de red durante la creación, **When** el RPC falla, **Then** el sistema muestra "Error al crear el negocio. Verifica tu conexión e intenta de nuevo." y el negocio NO existe en la base de datos.

3. **Given** un negocio recién creado como "Restaurante", **When** el usuario va al POS por primera vez, **Then** ve el plano de mesas y NO aparece ningún elemento de vehículos ni comisiones de barbería.

---

### Edge Cases

- ¿Qué pasa si el usuario cambia de tipo de negocio varias veces antes de confirmar? La vista previa de módulos debe actualizarse al instante con cada selección.
- ¿Qué pasa si la conexión falla durante la creación? El sistema muestra error, el negocio no se crea, y el usuario puede reintentar.
- ¿Qué pasa si un usuario que ya tiene negocio intenta acceder al setup? App.tsx solo muestra `/setup` si `!business?.id`, así que no debería ocurrir. Si ocurre, redirigir al dashboard.
- ¿Qué pasa si el super admin SaaS cambia el tipo de negocio después del registro? Ya existe la función `changeBusinessType` en el panel SaaS. No es parte de este spec.

---

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar exactamente 4 opciones de tipo de negocio en el setup inicial: Lavado de Carro (automotriz), Barber Shop (barbería), Salón de Belleza (beauty_salon), Restaurante (restaurant).
- **FR-002**: El sistema DEBE mostrar, para cada tipo de negocio seleccionado, una vista previa clara de qué módulos estarán ACTIVOS (✓) y cuáles INACTIVOS (✗).
- **FR-003**: La vista previa DEBE cambiar instantáneamente al seleccionar un tipo de negocio distinto.
- **FR-004**: El sistema DEBE crear el negocio con `business_type` y `config` (módulos) en una sola operación. Si falla, no debe persistir nada.
- **FR-005**: Inmediatamente después de crear el negocio, la interfaz DEBE reflejar los módulos correctos según el tipo: menú de navegación, pantalla principal, secciones del POS.
- **FR-006**: El negocio tipo "Lavado de Carro" DEBE mostrar: selector de vehículos en POS, cola de servicios, comisiones. NO debe mostrar: mesas de restaurante, agenda de citas.
- **FR-007**: El negocio tipo "Barber Shop" DEBE mostrar: asignación de barberos por servicio, comisiones. NO debe mostrar: vehículos, mesas, citas.
- **FR-008**: El negocio tipo "Salón de Belleza" DEBE mostrar: agenda de citas, asignación de profesionales, comisiones. NO debe mostrar: vehículos, mesas.
- **FR-009**: El negocio tipo "Restaurante" DEBE mostrar: plano de mesas, pedidos por mesa. NO debe mostrar: vehículos, comisiones de barbería, cola de servicios automotriz.
- **FR-010**: El sistema DEBE usar `getPresetModules()` de `apps/shared/modules.ts` como única fuente de verdad para los módulos por industria. No debe haber lógica duplicada en el setup.

### Key Entities

- **Industry Preset**: Define para cada tipo de negocio qué módulos se activan. Es la fuente única de verdad (`getPresetModules()`). Los 4 presets relevantes:
  - `automotive` → Vehículos, Cola de Servicio, Comisiones, Clientes, Inventario
  - `barbershop` → Comisiones, Clientes, Inventario
  - `beauty_salon` → Citas, Comisiones, Clientes, Inventario
  - `restaurant` → Mesas, Clientes, Inventario
- **Business Config (`business.config`)**: JSONB con flags de módulos. Se inicializa desde el preset de industria.
- **Business Type (`business.business_type`)**: El tipo seleccionado. Determina qué preset se aplica y qué variante de UI se renderiza en cada pantalla.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% de los negocios nuevos se crean con los módulos correctos para su tipo de industria (cero negocios con config vacía).
- **SC-002**: Un usuario nuevo puede ver qué funcionalidades tendrá su negocio en menos de 3 segundos después de seleccionar el tipo.
- **SC-003**: La pantalla principal carga con la interfaz correcta (menú, dashboard, POS) en menos de 3 segundos tras completar el registro.
- **SC-004**: Las 4 opciones de negocio están visibles y son seleccionables en la pantalla de setup (actualmente solo hay 4, pero falta salón de belleza como opción diferenciada de barbería).

---

## Assumptions

- Los presets de industria ya existen en `apps/shared/modules.ts`. El setup debe consultarlos en vez de duplicarlos.
- El sistema de módulos (`MODULE_REGISTRY` + `useModule`) ya adapta correctamente la UI según `business.config`.
- La aprobación SaaS del usuario (super admin aprueba → código de activación) está fuera del alcance.
- `getPresetModules()` en `apps/shared/modules.ts` es la fuente de verdad y debe usarse directamente desde `DesktopSetup.tsx`.
- No se requieren nuevas tablas ni columnas en la base de datos. Los cambios son frontend (DesktopSetup.tsx) y posiblemente el RPC de creación para hacerlo atómico.
