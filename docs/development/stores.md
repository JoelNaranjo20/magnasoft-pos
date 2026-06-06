# Stores de Zustand — Estado Global

**Actualizado**: 2026-06-05

---

## Arquitectura de Estado

Las stores se dividen en dos categorías:

| Categoría | Ubicación | Consumidores |
|---|---|---|
| **Compartidas** | `apps/shared/store/` | Desktop (Electron) + Web (Next.js) |
| **Desktop-only** | `apps/desktop/src/store/` | Solo desktop |

---

## Stores Compartidas

### useAuthStore

**Archivo**: `apps/shared/store/useAuthStore.ts`

Gestiona la sesión de Supabase, perfil de usuario y negocio.

| Campo | Tipo | Descripción |
|---|---|---|
| `user` | `User \| null` | Usuario de Supabase Auth |
| `profile` | `UserProfile \| null` | Perfil con `role`, `saas_role`, `business_id` |
| `business` | `Business \| null` | Negocio asociado |
| `isLoading` | `boolean` | Carga inicial |
| `isAuthenticated` | `boolean` | ¿Sesión activa? |
| `isSuperAdmin` | `boolean` | ¿Rol super_admin? |

**Acciones principales**:
- `checkSession()`: Flujo completo de autenticación — obtiene sesión → perfil → negocio → sincroniza `useBusinessStore`
- `signOut()`: Cierra sesión y limpia localStorage

**Selector**: `selectIsAdmin`: Verifica `role === 'super_admin' \|\| 'admin' \|\| saas_role === 'super_admin' \|\| 'admin'`

---

### useBusinessStore

**Archivo**: `apps/shared/store/useBusinessStore.ts`

Datos y configuración del negocio actual.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string \| null` | UUID del negocio |
| `name` | `string \| null` | Nombre del negocio |
| `businessType` | `string \| null` | Tipo de industria |
| `config` | `BusinessConfig` | Flags de módulos habilitados |
| `protectedModules` | `string[]` | Módulos que requieren PIN |
| `_realtimeChannel` | `RealtimeChannel \| null` | Suscripción a cambios en DB |

**BusinessConfig** (flags booleanos):
`module_vehicles`, `module_tables`, `module_service_queue`, `module_commissions`, `module_commission_payment`, `module_customers`, `module_inventory`, `module_payroll`

**Acciones**:
- `fetchBusinessProfile()`: Obtiene datos del negocio + configuración + presets de industria
- `isModuleEnabled(moduleKey)`: Verifica si un módulo está activo
- `subscribeToChanges()`: Suscripción Realtime a cambios en tabla `business`

---

### useSessionStore

**Archivo**: `apps/shared/store/useSessionStore.ts`

Estado de la sesión de caja. **Persiste en disco** vía Electron IPC.

| Campo | Tipo | Persiste | Descripción |
|---|---|---|---|
| `user` | `Profile \| null` | ✅ | Perfil del usuario |
| `isAuthenticated` | `boolean` | ✅ | Estado de auth |
| `cashSession` | `CashSession \| null` | ✅ | Sesión de caja activa |
| `workerRole` | `string \| null` | ✅ | Rol del trabajador que abrió caja |
| `isWorkerAdmin` | `boolean` | ✅ | ¿Es admin? (owner \|\| super_admin \|\| rol contiene 'admin') |
| `isConfigAuthenticated` | `boolean` | ❌ | PIN validado (requiere reingreso cada reinicio) |
| `isClosing` | `boolean` | ❌ | Modal de cierre abierto |
| `hasHydrated` | `boolean` | ❌ | Hidratación completada |

**Persistencia**: Usa `zustand/middleware/persist` con `createElectronZustandStorage()` — los datos de sesión sobreviven reinicios de la app.

**Acciones**:
- `setCashSession(session, workerRole?, isOwner?, isSuperAdmin?)`: Establece sesión y calcula `isWorkerAdmin`
- `refreshAdminStatus()`: Re-consulta DB para actualizar estado de admin
- `logout()`: Cierra sesión y limpia todo

---

## Stores Desktop-Only

### useCartStore

**Archivo**: `apps/desktop/src/store/useCartStore.ts`

Carrito de compras del POS. Soporta **múltiples carritos simultáneos** (clave para restaurante con mesas).

| Campo | Tipo | Descripción |
|---|---|---|
| `carts` | `Record<string, CartData>` | Mapa de carritos por ID |
| `activeCartId` | `string` | Carrito activo actual |
| `globalWorkerId` | `string \| null` | Trabajador global asignado |
| `globalSearchTerm` | `string` | Búsqueda global (filtra productos) |

**CartData**: `{ items: CartItem[], total: number, metadata: SaleMetadata, selectedCustomer, selectedVehicle, customerSelectionSource }`

**CartItem**: `{ cartId, id, name, price, originalPrice, quantity, type, originalItem, workerId, commissionEnabled }`

**Acciones**: `addItem`, `removeItem`, `updateQuantity`, `updatePrice`, `applyGlobalDiscount`, `toggleCommission`, `clearCart`, `clearTableCart`, `setCustomer`, `setActiveCart`, `setGlobalWorker`

---

### useTableStore

**Archivo**: `apps/desktop/src/store/useTableStore.ts`

Gestión de mesas de restaurante con suscripción Realtime.

| Campo | Tipo | Descripción |
|---|---|---|
| `tables` | `RestaurantTable[]` | Mesas del negocio |
| `selectedTableId` | `string \| null` | Mesa seleccionada |

**Acciones**: `fetchTables`, `addTable`, `updateTableStatus` (optimista + RPC), `updateTable`, `removeTable`, `subscribeToTables` (Realtime)

---

## Sistema de Módulos

**Archivos**: `apps/desktop/src/hooks/useModule.ts`, `apps/shared/hooks/useModule.ts`

Sistema feature-flag para activar/desactivar funcionalidades por tipo de negocio:

| Módulo | Flag en BusinessConfig |
|---|---|
| Vehículos | `module_vehicles` |
| Mesas (restaurante) | `module_tables` |
| Cola de servicios | `module_service_queue` |
| Comisiones | `module_commissions` |
| Pago de comisiones | `module_commission_payment` |
| Clientes | `module_customers` |
| Inventario | `module_inventory` |
| Nómina | `module_payroll` |

**Presets por industria** (definidos en `INDUSTRY_PRESETS`):
- `automotive`: vehicles, services, commissions
- `restaurant`: tables, service_queue, commissions
- `barbershop`: commissions, service_queue
- `retail`: inventory, customers
- `beauty_salon`: commissions, service_queue
- `hotel`: tables, customers

---

## Flujo de Sincronización

```
Inicio de App
  └─ useAuthStore.checkSession()
       ├─ supabase.auth.getSession() → user
       ├─ supabase.from('profiles') → profile (role, saas_role, business_id)
       ├─ supabase.from('business') → business (name, type, config)
       ├─ Sincroniza → useBusinessStore (id, name, config, modules)
       └─ Sincroniza → localStorage (user, business)

Apertura de Caja
  └─ OpenSessionModal → supabase.from('cash_sessions').insert()
       └─ useSessionStore.setCashSession() → persistido en disco

Cierre de Caja
  └─ CloseSessionModal → supabase.from('cash_sessions').update({ status:'closed' })
       └─ useSessionStore.setCashSession(null) → limpia persistencia
```
