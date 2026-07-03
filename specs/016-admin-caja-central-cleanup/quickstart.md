# Quickstart: Limpieza de Caja Central y Mejora de Información de Ingresos

**Feature**: 016-admin-caja-central-cleanup
**Date**: 2026-06-25

## Pre-requisitos

- Node.js >= 20, pnpm 10+
- Acceso a Supabase con permisos para aplicar migraciones SQL
- Repo clonado en `main` o branch `017-admin-caja-central-cleanup`

## Orden de implementación

### Step 1: Migración SQL (Supabase)

Ejecutar la nueva migración en Supabase SQL Editor:

```sql
-- Añade p_delete_central_cash a la RPC existente
CREATE OR REPLACE FUNCTION public.reset_business_data_modules(
    p_business_id UUID,
    p_delete_sales BOOLEAN DEFAULT FALSE,
    p_delete_cash BOOLEAN DEFAULT FALSE,
    p_delete_customers BOOLEAN DEFAULT FALSE,
    p_delete_workers BOOLEAN DEFAULT FALSE,
    p_delete_products BOOLEAN DEFAULT FALSE,
    p_delete_queue BOOLEAN DEFAULT FALSE,
    p_delete_central_cash BOOLEAN DEFAULT FALSE  -- NUEVO
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
-- ... (misma lógica, pero central_cash_movements se mueve a su propio bloque IF)
$$;
```

**Validación**: Ejecutar `SELECT proname, proargnames FROM pg_proc WHERE proname = 'reset_business_data_modules'` y verificar que `p_delete_central_cash` aparece.

### Step 2: Server Action (`actions.ts`)

Modificar `purgeBusinessData` en `apps/web/app/(saas)/saas/dashboard/configurations/actions.ts`:

1. Añadir `centralCash?: boolean` al parámetro `options`
2. Pasar `p_delete_central_cash: options.centralCash || false` a la RPC

**Validación**: `pnpm --filter magnasoft-web build` compila sin errores.

### Step 3: Páginas Web (Configuraciones + Tenants)

Modificar ambas páginas para añadir el checkbox:

**`configurations/page.tsx`** y **`tenants/page.tsx`**:
1. Añadir `centralCash: false` al estado `resetOptions`
2. Añadir `<label>` con checkbox para "Caja Central (movimientos)" después del checkbox de cash
3. Actualizar "Seleccionar Todo" para incluir `centralCash: true`
4. Actualizar validación para incluir `resetOptions.centralCash`
5. Pasar `centralCash: resetOptions.centralCash` al RPC/server action

**Validación**: Navegar a `/saas/dashboard/configurations` y `/saas/tenants`, verificar que el nuevo checkbox aparece.

### Step 4: Resolver user_id en el hook

Modificar `useCentralCash` en `apps/shared/hooks/useCentralCash.ts`:

1. Añadir `user_name: string | null` al interface `CentralMovement`
2. En `fetchMovements()`, después de obtener los movimientos, recolectar `user_id` únicos, hacer una query a `profiles`, y mapear `user_id → full_name` sobre los movimientos
3. Si `user_id` es null, `user_name` = null

**Validación**: Abrir Caja Central, verificar que los movimientos muestran nombres de usuario.

### Step 5: Mostrar user_name en el componente

Modificar `CentralCash.tsx`:

1. En el modal "Balance Total", mostrar `user_name || 'Sistema'` junto a la descripción del movimiento
2. Formato sugerido: `"Admin — Pago de nómina"` o `"Sistema — Cierre de Sesión #abc123"`

**Validación**: Abrir Balance Total en Caja Central, verificar que cada movimiento muestra usuario + motivo.

## Verificación final

```bash
# Build ambos targets
pnpm --filter magnasoft-web build
pnpm --filter magnasoft-pos build

# Probar en web
cd apps/web && pnpm dev
# → Ir a /saas/dashboard/configurations → Abrir Limpiar Datos → Ver checkbox Caja Central

# Probar limpieza
# → Marcar solo Caja Central → Confirmar → Verificar que el dashboard de Caja Central está en ceros
# → Verificar que ventas, clientes, etc. siguen intactos
```

## Rollback

Si hay problemas, revertir la RPC ejecutando la migración anterior (`20260325105000_update_reset_business_data_modules.sql`) que restaura la función sin el nuevo parámetro. El frontend seguirá funcionando (el nuevo checkbox simplemente no tendrá efecto real hasta que la RPC se actualice).
