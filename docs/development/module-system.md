# Sistema de Módulos — Multi-Industria

**Actualizado**: 2026-06-05

---

## Principio

Magnasoft POS es multi-industria. El mismo código base sirve a talleres automotrices, restaurantes, barberías, salones de belleza, hoteles y tiendas retail. **Está prohibido** condicionar UI o lógica de negocio con `business_type` directamente. Todo se canaliza a través del sistema de módulos.

---

## Funcionamiento

### MODULE_REGISTRY

Define qué módulos existen y cómo se comportan:

```typescript
const MODULE_REGISTRY = {
    vehicles: { key: 'vehicles', configFlag: 'module_vehicles', ... },
    tables: { key: 'tables', configFlag: 'module_tables', ... },
    service_queue: { key: 'service_queue', configFlag: 'module_service_queue', ... },
    commissions: { key: 'commissions', configFlag: 'module_commissions', ... },
    // ...
};
```

### BUSINESS_CONFIG

Cada negocio tiene un objeto `config` (JSONB en `business.config`) con flags booleanos:

```json
{
    "module_vehicles": true,
    "module_tables": false,
    "module_commissions": true,
    "module_customers": true,
    "module_inventory": true
}
```

### isModuleEnabled(moduleKey)

Verifica si un módulo está activo para el negocio actual consultando `useBusinessStore.config`.

### useModule / useModules (hooks)

- `useModule('vehicles')` → `boolean`
- `useModules()` → `Record<string, boolean>` (todos los módulos)

---

## Presets por Industria

Cuando se crea o cambia el tipo de negocio, se aplica un preset. Los presets son el **único lugar** donde se permite mapear `business_type` a módulos:

| Industria | Módulos Activados |
|---|---|
| `automotive` | vehicles, services, commissions |
| `restaurant` | tables, service_queue, commissions |
| `barbershop` | commissions, service_queue |
| `retail` | inventory, customers |
| `beauty_salon` | commissions, service_queue |
| `hotel` | tables, customers |

El merge de configuración preserva los flags no-módulo (ej. settings de lealtad) al cambiar de industria.

---

## Módulos Protegidos (PIN)

Ciertos módulos requieren autenticación con PIN maestro (`business.pin`):

- `audit` — Auditoría
- `config` — Configuración

El `ConfigGuard` verifica `isConfigAuthenticated` en `useSessionStore`. Este estado NO se persiste — el PIN se requiere en cada reinicio de la app.

---

## Ejemplo de Uso

```tsx
// En un componente: mostrar sección solo si el módulo está activo
const hasVehicles = useModule('vehicles');

{hasVehicles && (
    <VehicleSelector />
)}
```
