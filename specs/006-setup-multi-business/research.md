# Research: Interfaz Correcta Según Tipo de Negocio

**Feature**: [spec.md](./spec.md) | **Date**: 2026-06-06

---

## R1: ¿Por qué la creación no es atómica y cómo hacerla atómica?

**Decision**: Modificar el RPC `create_business_without_serial` para que acepte `p_business_type` y `p_config`, aplicándolos en la misma transacción que crea el negocio.

**Rationale**:
- Actualmente el RPC (línea 7-34 de la migración) inserta el negocio con `status = 'active'` pero sin `business_type` ni `config`. El `DesktopSetup.tsx` hace un UPDATE separado (líneas 47-54).
- Si el UPDATE falla (red, error DB, timeout), el negocio queda creado con `business_type = NULL` y `config = NULL`. Esto causa una pantalla en blanco/rota en el siguiente inicio de sesión.
- La solución es agregar `p_business_type text` y `p_config jsonb` como parámetros del RPC y hacer el UPDATE dentro de la misma función PL/pgSQL. Una sola transacción = todo o nada.

**Alternatives considered**:
- Try/catch en frontend con rollback manual: Descartado — si la red falla después del INSERT pero antes del rollback, el negocio huérfano persiste.
- Trigger en BD que ponga defaults: Descartado — no sabría qué preset aplicar sin el business_type.

**Implementation**: Modificar `supabase/migrations/20260526100000_remove_serial_and_hwid.sql` con `CREATE OR REPLACE FUNCTION` que acepte los nuevos parámetros y haga `UPDATE business SET business_type = p_business_type, config = p_config WHERE id = new_business_id` dentro de la misma función.

---

## R2: ¿Cómo eliminar la duplicación de `getInitialConfig` vs `getPresetModules`?

**Decision**: Mantener `getPresetModules()` de `apps/shared/modules.ts` como única fuente de verdad. `DesktopSetup.tsx` ya la usa (línea 19). Sin cambios necesarios en este aspecto.

**Rationale**:
- `DesktopSetup.tsx` línea 19: `const getInitialConfig = (type: BusinessType) => getPresetModules(type);` — ya es un wrapper directo.
- `getPresetModules()` en `modules.ts` línea 196-199 es la implementación real.
- Si `INDUSTRY_PRESETS` cambia en `modules.ts`, el setup lo refleja automáticamente.

**Status**: ✅ Ya resuelto. Sin acción requerida.

---

## R3: ¿Cómo mostrar la vista previa de módulos?

**Decision**: Agregar una sección debajo de las tarjetas de selección que lea `getPresetModules(businessType)` y renderice una lista de módulos con iconos ✓/✗.

**Rationale**:
- `getPresetModules()` devuelve `Record<string, boolean>`. Se puede mapear a labels legibles usando `MODULE_REGISTRY`.
- La vista previa se actualiza instantáneamente porque `businessType` es un estado local de React — cambiar la selección dispara re-render.
- No requiere llamadas a BD. Es puramente frontend.

**UI propuesta**: Debajo del grid de tarjetas, una tarjeta con fondo semi-transparente mostrando dos columnas: "Incluye" (✓ módulos true) y "No incluye" (✗ módulos false). Solo mostrar los módulos relevantes (no mostrar `module_pos` que siempre es true).

**Implementation**: Agregar ~25 líneas de JSX en `DesktopSetup.tsx` después del grid de tipo de negocio.

---

## R4: ¿Qué tipos de negocio mostrar y con qué íconos?

**Decision**: 4 tarjetas reemplazando las actuales:

| value | label | icon |
|---|---|---|
| `automotive` | Lavado de Carro | `local_car_wash` |
| `barbershop` | Barber Shop | `content_cut` |
| `beauty_salon` | Salón de Belleza | `spa` |
| `restaurant` | Restaurante | `restaurant` |

**Rationale**:
- El usuario explícitamente pidió estos 4.
- `beauty_salon` ya existe en `INDUSTRY_PRESETS` con sus módulos definidos (citas, comisiones, etc.) pero no se exponía en el setup.
- `retail` y `hotel` se eliminan del setup, aunque sus presets siguen existiendo en `modules.ts` para compatibilidad con negocios existentes.
- El tipo `BusinessType` se actualiza a `'automotive' | 'barbershop' | 'beauty_salon' | 'restaurant'`.

---

## R5: ¿Hay riesgo de romper el panel SaaS web?

**Decision**: No. El panel SaaS (`apps/web`) tiene su propio `changeBusinessType` en `actions.ts` que usa `mergeConfigWithPreset()`. No depende de `DesktopSetup.tsx` ni del RPC modificado.

**Rationale**:
- `apps/web/app/(saas)/saas/dashboard/configurations/actions.ts` ya tiene funciones independientes para cambiar tipo de negocio y aplicar templates.
- Los cambios en `DesktopSetup.tsx` y el RPC solo afectan el flujo de primer registro en desktop.
- La tabla `business` acepta cualquier string en `business_type` (no tiene constraint CHECK), así que agregar `beauty_salon` no requiere migración.

**Status**: ✅ Sin riesgo. Sin acción requerida.
