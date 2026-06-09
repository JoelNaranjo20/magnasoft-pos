# Guía Rápida: Unificar Clientes Duplicados

**Funcionalidad**: `003-unificar-clientes` | **Fecha**: 2026-06-03

## Prerrequisitos

- Base de datos PostgreSQL con Supabase
- `pnpm` instalado
- Tabla `customers` existente con columna `metadata JSONB`
- Usuario admin con `role = 'admin'` o `role = 'super_admin'`

## Orden de Implementación

1. **Base de datos**: Ejecutar migración para crear la función RPC `merge_customers`
2. **Utilidades compartidas**: Crear `normalizePhone.ts` y `normalizeName.ts`
3. **Prevención**: Actualizar los 3 formularios de creación de cliente
4. **Filtrar unificados**: Actualizar consultas de búsqueda de clientes para excluir registros unificados
5. **UI de unificar**: Construir el nuevo componente `CustomerUnify`
6. **Integración**: Conectarlo en `CustomerManager`

## Archivos Clave a Crear

| Archivo | Propósito |
|---|---|
| `supabase/migrations/20260603_merge_customers_function.sql` | Función RPC para unificación atómica |
| `apps/shared/lib/normalizePhone.ts` | Utilidad de normalización de teléfono |
| `apps/shared/lib/normalizeName.ts` | Utilidad de normalización de nombre |
| `apps/desktop/src/components/admin/config/CustomerUnify.tsx` | Componente principal de UI de unificación |

## Archivos Clave a Modificar

| Archivo | Cambio |
|---|---|
| `apps/desktop/src/components/admin/config/CustomerManager.tsx` | Agregar botón/sección "Unificar Clientes" |
| `apps/desktop/src/components/admin/config/CustomerCreateModal.tsx` | Verificación de duplicados mejorada + diálogo de prevención |
| `apps/desktop/src/components/modals/SimpleCustomerModal.tsx` | Verificación de duplicados mejorada + diálogo de prevención |
| `apps/desktop/src/components/modals/CustomerVehicleModal.tsx` | Verificación de duplicados mejorada + diálogo de prevención |
| `apps/desktop/src/components/pos/POSCart.tsx` | Excluir clientes unificados de búsqueda rápida |
| `apps/desktop/src/types/supabase.ts` | Agregar tipos de función RPC (si se necesitan) |
| `apps/desktop/src/index.css` | Estilos nuevos para UI de unificar (si se necesitan) |

## Pruebas

- **Desarrollo**: `pnpm electron:dev` desde `apps/desktop/`
- **Compilación**: `pnpm build` debe pasar en los 3 paquetes
- **Manual**: Crear 3 clientes duplicados con el mismo teléfono, verificar que aparecen en la vista Unificar, unificarlos, verificar que todas las ventas/deudas/vehículos se reasignan
- **Casos límite**: Probar unificación sin actividad, unificación en cadena (A→B, luego B→C), variaciones de formato de teléfono
