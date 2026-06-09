# Implementation Plan: Interfaz Correcta Según Tipo de Negocio al Primer Registro

**Branch**: `006-setup-multi-business` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-setup-multi-business/spec.md`

---

## Summary

Corregir la pantalla de configuración inicial (DesktopSetup) para que: (1) muestre solo los 4 tipos de negocio requeridos (Lavado de Carro, Barber Shop, Salón de Belleza, Restaurante), (2) muestre una vista previa de módulos antes de confirmar, y (3) cree el negocio con tipo y módulos en una sola operación atómica, garantizando que la interfaz sea correcta desde la primera carga.

**Technical approach**: Modificar el RPC `create_business_without_serial` para aceptar `business_type` y `config` como parámetros (atómico). Actualizar `DesktopSetup.tsx` con las 4 tarjetas correctas y una sección de vista previa que lee `getPresetModules()` de `apps/shared/modules.ts`. Cero migraciones nuevas de esquema.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 19, Vite 6

**Primary Dependencies**: @supabase/supabase-js, Zustand, Tailwind CSS 3.4

**Storage**: PostgreSQL vía Supabase. Modificación de RPC existente (`create_business_without_serial`). Sin nuevas tablas ni columnas.

**Testing**: Manual con `pnpm electron:dev`. Build con `pnpm build`.

**Target Platform**: Desktop (Electron) — solo afecta el flujo de primer registro

**Project Type**: Monorepo con 3 paquetes (desktop, web, shared)

**Performance Goals**: Vista previa de módulos instantánea (<50ms, solo cambio de estado React). Creación de negocio <3s.

**Constraints**: Sin refactor del RPC SaaS. Sin nuevas migraciones. Reutilizar `getPresetModules()` existente.

**Scale/Scope**: 3 user stories, 10 FRs. Modifica 2 archivos. 0 migraciones nuevas de tabla.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Evidencia |
|---|---|---|
| **I. Multi-Industry Dynamism** | ✅ PASA | La feature ES sobre multi-industria. Usa `INDUSTRY_PRESETS` existente sin condicionar por `business_type` directamente. |
| **II. Tenant Isolation** | ✅ PASA | El RPC usa `auth.uid()` para crear el negocio y vincular el perfil. Sin cambios en RLS. |
| **III. Spec-Driven Development** | ✅ PASA | Siguiendo protocolo de 5 fases. |
| **IV. Store Integrity** | ✅ PASA | Sin modificaciones a stores. Solo se leen `useAuthStore` y `useBusinessStore` (igual que ahora). |
| **V. TypeScript Strict** | ✅ PASA | `BusinessType` actualizado con los 4 tipos exactos. Sin `any`. Sin shadowing. |
| **Sin Backend Propio** | ✅ PASA | Solo se modifica un RPC PostgreSQL existente. |
| **Zustand Only** | ✅ PASA | Sin nuevas librerías de estado. |
| **Styling Stack** | ✅ PASA | Tailwind 3.4 existente, mismo estilo glass-panel del setup actual. |
| **YAGNI** | ✅ PASA | Sin tablas nuevas. Sin over-engineering. Solo 2 archivos. |

**GATE RESULT**: ✅ TODOS APROBADOS

**Post-Design Re-check**: ✅ Sin cambios.

---

## Project Structure

### Documentation (this feature)

```text
specs/006-setup-multi-business/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (by /speckit-tasks)
```

### Source Code — Files Modified

```text
supabase/migrations/
└── 20260526100000_remove_serial_and_hwid.sql    # RPC: +2 params (p_business_type, p_config)

apps/desktop/src/pages/setup/
└── DesktopSetup.tsx                              # 4 tarjetas, vista previa, llamada RPC actualizada
```

**Structure Decision**: 2 archivos. Sin nuevos archivos. Sin cambios en shared o web.

---

## Complexity Tracking

> Sin violaciones. Todos los gates pasaron.

---

## Implementation Phases

### Fase 1: RPC Atómico (1 archivo)

**Archivo**: `supabase/migrations/20260526100000_remove_serial_and_hwid.sql`

Modificar `create_business_without_serial`:

1. Agregar parámetros: `p_business_type text`, `p_config jsonb`
2. Después de INSERT INTO business: agregar `UPDATE business SET business_type = p_business_type, config = p_config WHERE id = new_business_id`
3. La función ya es atómica (PL/pgSQL transaccional). Si el UPDATE falla, el INSERT hace rollback.

```sql
CREATE OR REPLACE FUNCTION public.create_business_without_serial(
    p_name text,
    p_business_type text,   -- NUEVO
    p_config jsonb           -- NUEVO
)
-- ... misma lógica, más el UPDATE dentro de la transacción
```

### Fase 2: DesktopSetup.tsx (1 archivo)

**Archivo**: `apps/desktop/src/pages/setup/DesktopSetup.tsx`

**2a — Actualizar tipo y tarjetas**:
1. Cambiar `BusinessType` a `'automotive' | 'barbershop' | 'beauty_salon' | 'restaurant'`
2. Reemplazar las 4 tarjetas (líneas 121-126) con las nuevas:

```typescript
{ value: 'automotive', label: 'Lavado de Carro', icon: 'local_car_wash' },
{ value: 'barbershop', label: 'Barber Shop', icon: 'content_cut' },
{ value: 'beauty_salon', label: 'Salón de Belleza', icon: 'spa' },
{ value: 'restaurant', label: 'Restaurante', icon: 'restaurant' }
```

3. Cambiar default: `useState<BusinessType>('automotive')`

**2b — Vista previa de módulos**:
1. Agregar sección JSX debajo del grid de tarjetas
2. Usar `getPresetModules(businessType)` para obtener flags
3. Mapear flags a labels legibles vía `MODULE_REGISTRY`
4. Mostrar dos grupos: "✓ Incluye" (módulos true) y "✗ No incluye" (módulos false)
5. Solo mostrar módulos con `default: false` (omitir `module_pos`, `module_customers`, `module_inventory`)

**2c — Actualizar llamada al RPC**:
1. Pasar `businessType` y `getInitialConfig(businessType)` como parámetros al RPC
2. Eliminar el UPDATE separado (`supabase.from('business').update(...)`)
3. Simplificar `handleActivate`: RPC → checkSession. Sin paso intermedio.

```typescript
// ANTES (2 pasos)
const { data: business } = await supabase.rpc('create_business_without_serial', { p_name: businessName });
await supabase.from('business').update({ business_type: businessType, config: ..., status: 'active' }).eq('id', business.id);

// DESPUÉS (1 paso atómico)
await supabase.rpc('create_business_without_serial', { 
    p_name: businessName, 
    p_business_type: businessType, 
    p_config: getInitialConfig(businessType) 
});
```

### Fase 3: Deploy y Build

1. `supabase db push` — aplicar migración del RPC modificado
2. `pnpm build` — verificar compilación
3. `pnpm electron:dev` — prueba manual con quickstart.md
