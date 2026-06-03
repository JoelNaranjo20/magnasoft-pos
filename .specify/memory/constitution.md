# Magnasoft POS — Constitution

## Core Principles

### I. Multi-Industry Dynamism (NON-NEGOTIABLE)

Magnasoft POS es un sistema multi-industria donde el mismo código base sirve a talleres automotrices, restaurantes, barberías, salones de belleza, hoteles y tiendas retail. Toda lógica condicional por tipo de negocio debe canalizarse **exclusivamente** a través del sistema de módulos (`MODULE_REGISTRY` + `useModule` / `useModules`). Está **prohibido** condicionar UI o lógica de negocio con `business_type` directamente. Los presets de industria (`INDUSTRY_PRESETS`) son el único lugar donde se permite mapear `business_type` a módulos activos, y solo en el momento de crear o cambiar el tipo de negocio.

### II. Tenant Isolation via Supabase RLS

Cada negocio es un tenant aislado. La base de datos PostgreSQL garantiza esta separación mediante Row Level Security y el campo `business_id` en toda tabla de datos. Toda query desde el frontend se hereda el `business_id` del perfil autenticado. Super admins (SaaS) tienen función `is_super_admin()` que bypassea el scoping por negocio. Nunca se debe exponer datos cross-tenant en el cliente; cualquier consolidación multi-tenant debe hacerse con RPC o vistas que respeten el contexto del llamante.

### III. Spec-Driven Development (NON-NEGOTIABLE)

Todo cambio no trivial sigue el protocolo de 5 fases definido en `docs/spec-kit/`:

1. **Especificar** — Definir objetivos, requerimientos, UI afectada y análisis de stores/módulos impactados.
2. **Planificar** — Detallar archivos a crear/modificar/eliminar con análisis de impacto y no regresión.
3. **Tareas** — Desglosar el plan en tareas secuenciadas por fases.
4. **Implementar** — Ejecutar cambios siguiendo el plan aprobado.
5. **Verificar** — Probar funcionalidad en `electron:dev`, compilar con `pnpm build`, validar contra errores TDZ.

Cambios triviales (typos, ajustes de estilo de una línea, bumps de versión) pueden omitir la especificación formal pero deben documentarse en el mensaje de commit.

### IV. Store Integrity & Impact Analysis

Las stores de Zustand compartidas (`apps/shared/store/`) impactan simultáneamente a Electron (desktop) y Next.js (web). Antes de modificar cualquier firma de función, propiedad de estado o lógica en una store compartida, es obligatorio:

- Buscar todas las referencias en el monorepo (`grep` en `apps/desktop`, `apps/web`, `apps/shared`).
- Identificar componentes/hooks que dependen del contrato actual.
- Asegurar retrocompatibilidad o actualizar todos los consumidores coordinadamente.
- Prestar especial atención a `PaymentModal.tsx` (95KB, el componente más crítico del POS): cualquier cambio que lo afecte requiere revisión exhaustiva de no regresión.

### V. TypeScript Strict & Zero Shadowing

TypeScript strict mode está habilitado en todos los subproyectos. Reglas adicionales:

- **Prohibido `any`** — Usar `unknown` o genéricos. `any` solo se tolera en wrappers de librerías externas sin tipado.
- **Cero shadowing de variables** — Nunca redeclarar una variable con el mismo nombre en un ámbito anidado. Esto provoca errores de Temporal Dead Zone (TDZ) al minificar con Vite para producción: `ReferenceError: Cannot access 'X' before initialization`.
- **Verificación pre-build** — Antes de `pnpm build`, revisar scopes anidados en funciones modificadas buscando redeclaraciones accidentales.
- Los tipos de base de datos en `apps/desktop/src/types/supabase.ts` deben mantenerse sincronizados con el esquema real de Supabase.

## Architecture Constraints

### Monorepo Structure

El proyecto usa `pnpm workspaces` con tres subproyectos bajo `apps/`:

| Package | Path | Purpose |
|---|---|---|
| `magnasoft-pos` | `apps/desktop/` | POS Electron + React 19 + Vite |
| `magnasoft-web` | `apps/web/` | Portal admin Next.js 16 + React 19 |
| `@shared/logic` | `apps/shared/` | Stores, hooks, Supabase client, módulos |

**Reglas de dependencia**: `desktop` y `web` dependen de `shared` vía workspace alias. `shared` no debe depender de `desktop` ni de `web`. Código específico de Electron (IPC, `app-storage.json`, hardware ID) permanece en `apps/desktop/electron/` y no debe filtrarse a `shared`.

### No Custom Backend

No existe servidor backend propio. Toda la lógica de negocio reside en:
- **Frontend** (React) para lógica de presentación, validación y flujo de UI.
- **Base de Datos** (PostgreSQL) para triggers, funciones RPC, constraints e integridad referencial.

La capa de API es Supabase/PostgREST. No se introducirá Express, Fastify ni otro framework de servidor sin aprobación explícita del arquitecto.

### Zustand as Single State Manager

Zustand es la única librería de gestión de estado global. No se introducirán Redux, MobX, Jotai, Recoil ni Context API para estado global. React Context se reserva para inyección de dependencias (auth context, UI context en web) y wrappers que no cambian frecuentemente.

### Styling Stack

- **Desktop**: Tailwind CSS 3.4 + CSS vanilla para glassmorphism, animaciones personalizadas y scrollbars.
- **Web**: Tailwind CSS 4 (PostCSS-based).
- No se introducirán librerías de componentes UI (Material UI, Chakra, Ant Design, shadcn/ui) sin aprobación — el sistema de diseño es propio.

## Development Workflow

### Conventional Commits

Todos los commits siguen el estándar Conventional Commits:

```
feat(scope): descripción en español
fix(scope): descripción en español
chore(scope): descripción en español
docs(scope): descripción en español
revert(scope): descripción en español
```

El scope debe identificar el componente o módulo afectado (ej. `CarteraHub`, `supabase`, `desktop`, `web`, `shared`, `release`).

### Release Process

1. Bump de versión en los 4 `package.json` (root, desktop, shared, web).
2. Commit `chore(release): bump version to X.Y.Z`.
3. Generar `RELEASE_NOTES_vX.Y.Z.md` documentando cambios, fixes y breaking changes.
4. Tag y push. El desktop se distribuye vía electron-updater desde GitHub Releases; el web despliega desde Vercel.

### Branch Strategy

- `main` es la rama de producción. Commits directos solo para hotfixes triviales y bumps de versión.
- Features y fixes se desarrollan en branches con nombres descriptivos (ej. `001-operacion-offline-sync`, `fix-jwt-session-keeper`).
- El framework Specify puede asignar numeración secuencial (`001-`, `002-`) para features con spec formal.

### Quality Gates

- `pnpm build` debe pasar sin errores en desktop, web y shared.
- TypeScript `tsc -b` sin errores de tipo.
- Verificación manual de no regresión en `PaymentModal.tsx` si fue afectado directa o indirectamente.
- Búsqueda de shadowing de variables en funciones modificadas antes de build de producción.

## Module System & Feature Flags

Los módulos del negocio son feature flags dinámicas almacenadas en `business.config` (JSONB) y activadas mediante presets de industria. Las 10 claves semánticas del `MODULE_REGISTRY` son:

| Clave | DB Config Key | Propósito |
|---|---|---|
| `pos` | `module_pos` | Ventas y cobros (siempre activo) |
| `vehicles` | `module_vehicles` | Registro de vehículos por placa |
| `vehicle_queue` | `module_service_queue` | Cola de espera automotriz |
| `tables` | `module_tables` | Mesas y comandas para restaurantes |
| `commissions` | `module_commissions` | Cálculo de comisiones a trabajadores |
| `commission_payment` | `module_commission_payment` | Liquidación y pago de comisiones |
| `customers` | `module_customers` | Base de clientes y fidelización (siempre activo) |
| `inventory` | `module_inventory` | Control de stock (siempre activo) |
| `payroll` | `module_payroll` | Salarios y pagos |
| `appointments` | `module_appointments` | Citas y calendario |

**Principio de extensibilidad**: Agregar un nuevo módulo requiere registrarlo en `MODULE_REGISTRY`, agregar su flag en los presets de industria, y usar `useModule(nuevaKey)` en los componentes que condicionan su visibilidad.

## Governance

Esta constitución es el documento supremo de estándares para Magnasoft POS. Prevalece sobre cualquier preferencia individual de estilo o conveniencia de implementación.

- **Enmiendas**: Requieren documentación del cambio propuesto, justificación técnica, análisis de impacto en el monorepo, y aprobación antes de aplicar. La enmienda se refleja en el historial de git con un commit `docs(constitution): ...`.
- **Cumplimiento**: Todo PR y cambio no trivial debe verificarse contra los principios aquí establecidos. Las violaciones a principios NON-NEGOTIABLE son motivo de rechazo del cambio.
- **Deuda técnica documentada**: Los hardcodeos de `business_type` en `POSLayout.tsx` y `POSCart.tsx` son deuda reconocida y planificada para migración. No se debe introducir nueva deuda del mismo tipo.
- **Complejidad debe justificarse**: Toda abstracción nueva (store, hook genérico, utilidad compartida) debe resolver un problema concreto que ya existe — no uno hipotético. Principio YAGNI.

**Version**: 1.0.0 | **Ratified**: 2026-06-03 | **Last Amended**: 2026-06-03
