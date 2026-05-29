# Constitución del Proyecto: Magnasoft POS

Esta es la guía suprema y el conjunto de estándares técnicos que gobiernan el desarrollo en el repositorio de **Magnasoft**. Cualquier agente de IA o desarrollador humano debe apegarse rigurosamente a estas reglas.

---

## 1. Arquitectura y Tecnologías Core

Magnasoft es un **monorepo** administrado con `pnpm workspaces` que consta de tres subproyectos:

*   **`apps/desktop`**: Aplicación de punto de venta (POS) construida sobre **Electron**, **React 19**, **TypeScript** y **Vite**. Es la aplicación principal de cara a los negocios.
*   **`apps/web`**: Aplicación web administrativa desarrollada con **Next.js** (React 19) y **TypeScript**.
*   **`apps/shared`**: Lógica de negocio compartida entre `desktop` y `web` (stores de Zustand, servicios de Supabase, hooks comunes y el registro de módulos).

### Stack Tecnológico
*   **Base de Datos y Autenticación**: Supabase (`@supabase/supabase-js`). Instancia compartida accedida mediante el cliente en `@shared/lib/supabase`.
*   **Gestión de Estado**: Zustand (`zustand`) — ver sección 2.3 para el mapa completo de stores.
*   **Estilos y CSS**: Tailwind CSS para componentes responsivos. Vanilla CSS para personalizaciones específicas.
*   **UI e Iconos**: Lucide React (`lucide-react`).

---

## 2. Reglas de Programación y Buenas Prácticas

### 2.1 TypeScript Estricto
*   Siempre define tipos y interfaces explícitos para props, estados y respuestas de API.
*   Evita el uso de `any` a toda costa. Usa tipos genéricos o `unknown` si es necesario.
*   Mantén las interfaces de base de datos sincronizadas con el esquema de Supabase. El tipo generado central está en `apps/desktop/src/types/supabase.ts`.

### 2.2 Gestión de Ámbitos — Evitar Errores TDZ (CRÍTICO)
*   **Cero Redundancias de Variables**: Nunca declares una variable con el mismo nombre en un ámbito interno si ya existe en el ámbito superior de la misma función (*shadowing*). Esto provoca errores de **Temporal Dead Zone (TDZ)** al minificar para producción con Vite (ej. `ReferenceError: Cannot access 'X' before initialization`).
*   **Verificación Obligatoria**: Antes de hacer `pnpm build`, revisa todos los scopes anidados de las funciones que modificaste en busca de redeclaraciones de variables.

### 2.3 Mapa Completo de Stores de Zustand

El proyecto usa **5 stores de Zustand** divididos en dos niveles:

#### Stores Compartidos — `apps/shared/store/` (Impactan Desktop Y Web)

> [!CAUTION]
> Modificar estos stores puede afectar simultáneamente a `apps/desktop` (Electron) y a `apps/web` (Next.js). **Busca todas las referencias en el monorepo completo** antes de cambiar cualquier firma de función o propiedad de estado.

| Store | Ruta | Responsabilidad Principal |
|---|---|---|
| `useAuthStore` | `apps/shared/store/useAuthStore.ts` | Sesión SaaS de Supabase, `profile` del usuario, datos del `business`, flag `isSuperAdmin`, y el selector exportado `selectIsAdmin` (roles `admin` / `super_admin`). |
| `useBusinessStore` | `apps/shared/store/useBusinessStore.ts` | Perfil del negocio (`businessType`, `logoUrl`), el objeto `config` JSONB con los flags de módulos activos, presets de industria, y suscripción en tiempo real a cambios del negocio en Supabase. |
| `useSessionStore` | `apps/shared/store/useSessionStore.ts` | Sesión de caja activa (`cashSession`), roles del turno (`workerRole`, `isWorkerAdmin`), estado de cierre (`isClosing`), y PIN de configuración (`isConfigAuthenticated` — **no se persiste**). Usa `createElectronZustandStorage` para guardar en disco via IPC → `app-storage.json`. |

#### Stores Locales del POS — `apps/desktop/src/store/` (Solo Electron)

| Store | Ruta | Responsabilidad Principal |
|---|---|---|
| `useCartStore` | `apps/desktop/src/store/useCartStore.ts` | Carrito multi-mesa: `carts: Record<cartId, CartData>`. Cada `CartData` contiene `items: CartItem[]`, `total`, `metadata: Partial<SaleMetadata>`, `selectedCustomer`, `selectedVehicle`. Expone también `globalWorkerId` para el trabajador activo del turno. |
| `useTableStore` | `apps/desktop/src/store/useTableStore.ts` | Estado de las mesas de restaurante (`restaurant_tables` en Supabase): carga, creación, actualización de estado (`available`, `occupied`, `reserved`) y subscripción en tiempo real. |

### 2.4 Sistema de Módulos y Feature Flags (`MODULE_REGISTRY`)

Los módulos del negocio se controlan mediante el registro central `MODULE_REGISTRY` definido en `apps/shared/modules.ts`. Las **10 claves semánticas** disponibles son:

| Clave Semántica | Config Key en DB | Descripción |
|---|---|---|
| `pos` | `module_pos` | Módulo principal de ventas y cobros. Activo por defecto. |
| `vehicles` | `module_vehicles` | Registro de clientes por placa y tipo de vehículo. |
| `vehicle_queue` | `module_service_queue` | Cola de espera para servicios automotrices. |
| `tables` | `module_tables` | Gestión de mesas y comandas para restaurantes. |
| `commissions` | `module_commissions` | Cálculo y asignación de comisiones a trabajadores. |
| `commission_payment` | `module_commission_payment` | Liquidación y pago de comisiones. |
| `customers` | `module_customers` | Base de datos de clientes y fidelización. Activo por defecto. |
| `inventory` | `module_inventory` | Control de stock y productos. Activo por defecto. |
| `payroll` | `module_payroll` | Salarios y pagos a trabajadores. |
| `appointments` | `module_appointments` | Gestión de citas y calendario. |

**Uso en componentes**: Siempre usar el hook reactivo `useModule(key)` o `useModules([keys])` desde `apps/desktop/src/hooks/useModule.ts`. **Nunca** leer el objeto `config` del store directamente en los componentes.

```ts
// ✅ CORRECTO
const hasCommissions = useModule('commissions');
const { vehicles, tables } = useModules(['vehicles', 'tables']);

// ❌ INCORRECTO — no es reactivo a cambios en tiempo real
const config = useBusinessStore(state => state.config);
```

Los módulos se activan masivamente mediante **presets de industria** (`INDUSTRY_PRESETS`): `automotive`, `barbershop`, `restaurant`, `retail`, `beauty_salon`, `hotel`.

### 2.5 Persistencia Híbrida de Sesión (Electron IPC)
*   `useSessionStore` usa `createElectronZustandStorage` en lugar de `localStorage` para que los datos de caja activa sobrevivan a reinicios de Electron y funcionen sin conexión.
*   El archivo de estado local es `app-storage.json` y se escribe/lee mediante canales IPC en el proceso principal.
*   **Regla**: `isConfigAuthenticated` (PIN) se excluye deliberadamente de la persistencia. Siempre debe volver a `false` al reiniciar la app.

### 2.6 Control de Errores y Logs
*   Todas las operaciones con Supabase u APIs externas deben estar envueltas en bloques `try/catch`.
*   Registra errores de manera descriptiva en consola de desarrollo usando `console.error('[Módulo] mensaje descriptivo:', error)`.

### 2.7 Regla de No Regresión (Evitar Efectos Secundarios)
*   **Análisis de Impacto Obligatorio**: Antes de modificar un store compartido, hook de `@shared`, componente común, o esquema de base de datos, busca todas las referencias en el monorepo para identificar qué otros módulos dependen de él.
*   **Preservar Funcionalidad Existente**: Un cambio en lógica compartida debe ser retrocompatible o actualizar coordinadamente todos los consumidores. No se permiten cambios "a ciegas".
*   **Proteger el Módulo de Cobros**: `PaymentModal.tsx` es el componente más crítico del POS. Cualquier cambio que lo afecte debe pasar por revisión exhaustiva de no regresión.

### 2.8 Dinamismo y Prohibición de Hardcoding (CRÍTICO)

Magnasoft POS es un sistema **multi-industria dinámico**. El mismo código base sirve a talleres automotrices, restaurantes, barberías, salones de belleza, hoteles y tiendas retail. Esta flexibilidad se logra **exclusivamente** a través del sistema de módulos — nunca con condicionales hardcodeadas por tipo de negocio.

> [!CAUTION]
> **Está PROHIBIDO** condicionar lógica de negocio, visibilidad de UI o funcionalidad usando `business_type` directamente. Este patrón rompe el dinamismo del sistema y acopla la lógica a un tipo de negocio específico.

**Patrón INCORRECTO (hardcoded, no reactivo)**:
```ts
// ❌ NUNCA HACER ESTO
const isRestaurant = business?.business_type === 'restaurant';
if (isRestaurant) { /* mostrar mesas */ }
```

**Patrón CORRECTO (dinámico, reactivo)**:
```ts
// ✅ SIEMPRE USAR EL SISTEMA DE MÓDULOS
const hasTables = useModule('tables');
if (hasTables) { /* mostrar mesas */ }
```

**Reglas**:
- Toda lógica condicional por industria debe usar `useModule(key)` o `useModules([keys])`.
- Los **presets de industria** (`INDUSTRY_PRESETS` en `apps/shared/modules.ts`) son el único lugar donde `business_type` determina qué módulos activar — y solo en el momento de crear o cambiar el tipo de negocio.
- **Deuda técnica conocida**: `apps/desktop/src/components/pos/POSLayout.tsx` y `apps/desktop/src/components/pos/POSCart.tsx` aún contienen `const isRestaurant = business?.business_type === 'restaurant'` como residuo del sistema anterior. Deben migrarse a `useModule('tables')` en una tarea futura.

---

## 3. Estándares de Diseño y UX

1.  **Estética Premium y Moderna**: Paletas de colores armoniosas, diseño limpio con bordes redondeados consistentes y transiciones suaves.
2.  **Interactividad Viva**: Todos los botones y elementos interactivos deben tener estados claros de `hover`, `active` y `disabled`. Micro-animaciones sutiles (spinners al cargar, transiciones al abrir modales).
3.  **Evitar Layout Shifts (CLS)**: Define alturas mínimas para contenedores dinámicos. Usa esqueletos de carga (Skeletons) en lugar de pantallas vacías mientras se obtienen datos de Supabase.

---

## 4. Flujo de Trabajo — Spec-Driven Development (SDD)

Para cualquier cambio no trivial, el flujo **obligatorio** debe seguir el protocolo de Spec-Kit ubicado en `docs/spec-kit/`:

1.  **Especificar** (`specification_template.md`): Definir objetivos, requerimientos, UI afectada y análisis técnico de stores y módulos.
2.  **Planificar** (`implementation_plan_template.md`): Detallar los archivos a crear, modificar o eliminar, y el análisis de impacto y no regresión.
3.  **Tareas** (`task_template.md`): Desglosar el plan en una lista de tareas ordenada por fases.
4.  **Implementar**: Realizar los cambios de código archivo por archivo siguiendo el plan aprobado.
5.  **Verificar** (`walkthrough_template.md`): Probar en `pnpm electron:dev`, compilar con `pnpm build` para descartar TDZ, y documentar los resultados.
