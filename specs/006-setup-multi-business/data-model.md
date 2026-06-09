# Data Model: Interfaz Correcta Según Tipo de Negocio

**Feature**: [spec.md](./spec.md) | **Date**: 2026-06-06

---

## Sin cambios de esquema

Esta feature **no requiere nuevas tablas, columnas ni migraciones**. Todos los datos ya existen en el modelo actual. Los cambios son exclusivamente de frontend y una modificación menor a un RPC existente.

---

## Entidades Existentes (sin cambios)

### business

| Columna | Tipo | Uso en esta feature |
|---|---|---|
| `id` | UUID PK | Creado por el RPC |
| `name` | TEXT | Ingresado por el usuario en setup |
| `business_type` | TEXT | Nuevos valores posibles: `'automotive'`, `'barbershop'`, `'beauty_salon'`, `'restaurant'` |
| `config` | JSONB | Se escribe con `getPresetModules(businessType)` — flags de módulos |
| `status` | TEXT | Se establece a `'active'` dentro del RPC |
| `owner_id` | UUID FK (auth.users) | Establecido por el RPC vía `auth.uid()` |

### profiles

| Columna | Tipo | Uso en esta feature |
|---|---|---|
| `business_id` | UUID FK (business) | Vinculado por el RPC |
| `saas_role` | TEXT | Establecido a `'admin'` por el RPC |

---

## RPC: `create_business_without_serial` (MODIFICADO)

**Archivo**: `supabase/migrations/20260526100000_remove_serial_and_hwid.sql`

### Cambio de firma

```sql
-- ANTES
CREATE OR REPLACE FUNCTION public.create_business_without_serial(p_name text)

-- DESPUÉS
CREATE OR REPLACE FUNCTION public.create_business_without_serial(
    p_name text,
    p_business_type text,   -- NUEVO
    p_config jsonb           -- NUEVO
)
```

### Nuevo flujo dentro del RPC

1. INSERT INTO business (name, owner_id, status) → retorna `new_business_id`
2. **NUEVO**: UPDATE business SET business_type = p_business_type, config = p_config WHERE id = new_business_id
3. UPDATE profiles SET business_id = new_business_id, saas_role = 'admin'
4. RETURN row_to_json del business creado

Todo en una transacción PL/pgSQL → atómico. Si el UPDATE falla, el INSERT hace rollback automáticamente.

---

## Presets de Módulos — `INDUSTRY_PRESETS`

**Archivo**: `apps/shared/modules.ts` (sin cambios — ya contiene los 4 presets necesarios)

| Tipo | Módulos TRUE | Módulos FALSE |
|---|---|---|
| `automotive` | vehicles, service_queue, commissions, commission_payment, customers, inventory, payroll | tables, appointments |
| `barbershop` | commissions, commission_payment, customers, inventory, payroll | vehicles, service_queue, tables, appointments |
| `beauty_salon` | commissions, commission_payment, customers, inventory, payroll, **appointments** | vehicles, service_queue, tables |
| `restaurant` | customers, inventory, payroll, **tables** | vehicles, service_queue, commissions, commission_payment, appointments |

---

## Contrato UI: `DesktopSetup.tsx`

### Tipo `BusinessType`

```typescript
// ANTES
type BusinessType = 'automotive' | 'retail' | 'restaurant' | 'barbershop';

// DESPUÉS
type BusinessType = 'automotive' | 'barbershop' | 'beauty_salon' | 'restaurant';
```

### Tarjetas de selección

| value | label | icon | 
|---|---|---|
| `automotive` | Lavado de Carro | `local_car_wash` |
| `barbershop` | Barber Shop | `content_cut` |
| `beauty_salon` | Salón de Belleza | `spa` |
| `restaurant` | Restaurante | `restaurant` |

### Vista previa de módulos

Se renderiza debajo del grid de tarjetas cuando `businessType` está seleccionado. Usa `getPresetModules(businessType)` para obtener los flags y `MODULE_REGISTRY` para los labels.

```
┌──────────────────────────────────────────┐
│  ✓ Incluye                               │
│  • Gestión de Vehículos                  │
│  • Cola de Servicio                      │
│  • Comisiones                            │
│  • Clientes                              │
│  • Inventario                            │
│                                          │
│  ✗ No incluye                            │
│  • Mesas / Restaurante                   │
│  • Citas y Agenda                        │
└──────────────────────────────────────────┘
```

Solo se muestran los módulos con `default: false` en `MODULE_REGISTRY`. `module_pos`, `module_customers` e `module_inventory` (default: true) se omiten por ser universales.

---

## Transiciones de Estado (App.tsx)

Sin cambios. El flujo sigue siendo:

```
STATE: NO BUSINESS (!business?.id)
  → DesktopSetup (usuario completa setup)
    → RPC create_business_without_serial (ATÓMICO)
      → checkSession() recarga perfil + negocio
        → STATE: FULL ACCESS (business.status === 'active')
```

La diferencia es que ahora el negocio llega a FULL ACCESS con `business_type` y `config` ya establecidos desde el RPC, garantizando que la interfaz sea correcta desde la primera carga.
