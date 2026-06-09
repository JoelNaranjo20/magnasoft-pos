# Plan de Implementación: Unificar Clientes Duplicados

**Rama**: `003-unificar-clientes` | **Fecha**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificación de funcionalidad de `specs/003-unificar-clientes/spec.md`

## Resumen

Implementar un sistema completo de gestión de clientes duplicados con tres capacidades: (1) **detección** automática de duplicados por teléfono normalizado y similitud de nombre en una nueva vista "Unificar Clientes", (2) **unificación** atómica de clientes duplicados reasignando ventas, deudas y vehículos al cliente principal vía RPC de PostgreSQL, y (3) **prevención** de nuevos duplicados en todos los formularios de creación de cliente mediante verificación mejorada con diálogo "Usar existente / Crear de todos modos".

## Contexto Técnico

**Lenguaje/Versión**: TypeScript 5.x (strict mode), React 19, Vite 6

**Dependencias principales**: @supabase/supabase-js, Zustand (estado), Tailwind CSS 3.4 (estilos), PostgreSQL (base de datos), Electron (shell de escritorio), Google Material Symbols (íconos)

**Almacenamiento**: PostgreSQL vía Supabase/PostgREST. Seguimiento de unificación mediante `customers.metadata` JSONB (sin nuevas columnas). Unificación atómica vía función RPC `merge_customers` (SECURITY DEFINER).

**Pruebas**: Pruebas manuales mediante `pnpm electron:dev` desde `apps/desktop/`. Verificación de compilación con `pnpm build` en los 3 paquetes. No hay framework de pruebas automatizadas en uso.

**Plataforma objetivo**: App de escritorio Electron (Windows/macOS/Linux). El portal web (Next.js) NO se modifica — la gestión de clientes es solo desktop.

**Tipo de proyecto**: App de escritorio (Electron + React) dentro de un monorepo

**Metas de rendimiento**: Vista "Unificar Clientes" carga en < 3 segundos para 500 clientes (CE-004). RPC de unificación se completa en una sola transacción de base de datos (típicamente < 500ms para 3 tablas).

**Restricciones**: Unificación atómica todo-o-nada (CE-003). Sin migración de esquema — todo el estado nuevo en `metadata` JSONB existente. Cero shadowing de variables (riesgo TDZ). Sin tipos `any`. Solo rol admin puede acceder a funciones de unificar.

**Escala/Alcance**: 4 historias de usuario, 15 requerimientos funcionales, 7 criterios de éxito. Modifica 3 formularios de creación de cliente, 1 vista de listado admin, 1 nuevo componente de unificación, 1 nueva función RPC, 2 utilidades compartidas.

## Verificación de Constitución

*GATE: Debe pasar antes de investigación Fase 0. Re-verificar después de diseño Fase 1.*

### Verificación Pre-Diseño (Fase 0)

| Principio | Estado | Evidencia |
|---|---|---|
| **I. Dinamismo Multi-Industria** | ✅ PASA | La funcionalidad usa `useModule('customers')` que siempre está activo. Sin condicionamiento por `business_type`. La vista de unificar se muestra/oculta vía `selectIsAdmin`, no por tipo de industria. |
| **II. Aislamiento de Tenant** | ✅ PASA | Todas las consultas usan `business_id` de `useBusinessStore`. El RPC de merge valida mismo negocio vía comparación SQL de `business_id`. Las políticas RLS ya imponen aislamiento de tenant en `customers`, `sales`, `customer_debts`, `vehicles`. |
| **III. Desarrollo Spec-Driven** | ✅ PASA | Este plan sigue el protocolo de 5 fases. Spec escrito → Plan (este) → Tareas → Implementar → Verificar. |
| **IV. Integridad de Stores** | ✅ PASA | Sin modificaciones a stores Zustand compartidas. El nuevo componente usa estado local React. `useBusinessStore` y `useAuthStore` se consumen en modo solo lectura. |
| **V. TypeScript Strict** | ✅ PASA | Sin `any` planificado. Nuevas utilidades retornan strings tipados. El resultado RPC será tipado. Todo el código nuevo en tsconfig `strict: true`. |
| **Sin Backend Propio** | ✅ PASA | Toda la lógica del servidor en función RPC de PostgreSQL (`merge_customers`). Sin Express/Fastify. |
| **Solo Zustand** | ✅ PASA | Sin nueva librería de estado global. Estado local React para la UI de unificar. |
| **Stack de Estilos** | ✅ PASA | Tailwind CSS 3.4 + glassmorphism/animaciones existentes de `index.css`. Sin librería UI externa. |
| **YAGNI** | ✅ PASA | Sin nuevas abstracciones sin necesidad concreta. Las utilidades compartidas (`normalizePhone`, `normalizeName`) resuelven un problema real de duplicación en 3+ archivos. Sin nuevo store Zustand (el estado es local a la página). |

### Re-Verificación Post-Diseño (Fase 1)

| Principio | Estado | Evidencia |
|---|---|---|
| **I. Dinamismo Multi-Industria** | ✅ PASA | El componente `CustomerUnify` verifica `selectIsAdmin` solamente — sin condicionamiento por industria. El módulo `customer` siempre activo. |
| **II. Aislamiento de Tenant** | ✅ PASA | La función RPC valida `business_id` tanto en el target como en todos los sources. SECURITY DEFINER asegura que corre con privilegios elevados pero aún verifica el alcance del tenant. Todas las consultas del frontend filtran por `business_id`. |
| **III. Desarrollo Spec-Driven** | ✅ PASA | Todos los artefactos presentes: spec.md, plan.md (este), research.md, data-model.md, quickstart.md. |
| **IV. Integridad de Stores** | ✅ PASA | Confirmado: sin modificaciones a `useCartStore`, `useAuthStore`, `useBusinessStore`, `useSessionStore`, ni `useTableStore`. Solo se lee `selectIsAdmin` y `businessId` de stores existentes. |
| **V. TypeScript Strict** | ✅ PASA | `normalizePhone` retorna `string`. `normalizeName` retorna `string`. `CustomerUnify` usa estado tipado (sin `any`). Sin shadowing de variables en la estructura propuesta del componente. |
| **Sin Backend Propio** | ✅ PASA | `merge_customers` es una función PostgreSQL — dentro de la arquitectura permitida. |
| **Solo Zustand** | ✅ PASA | Sin nueva librería de estado introducida. |
| **Stack de Estilos** | ✅ PASA | Todos los componentes nuevos usan Tailwind + clases CSS de glassmorphism existentes. Sin nuevos frameworks CSS. |
| **YAGNI** | ✅ PASA | `normalizePhone`/`normalizeName` resuelven duplicación concreta en 5+ archivos. `CustomerUnify` es un solo componente, no una abstracción sobre-diseñada. |

**RESULTADO DEL GATE**: ✅ TODOS APROBADOS — Sin violaciones que justificar.

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/003-unificar-clientes/
├── spec.md              # Especificación de la funcionalidad
├── plan.md              # Este archivo (salida de /speckit-plan)
├── research.md          # Salida Fase 0: Decisiones técnicas y justificación
├── data-model.md        # Salida Fase 1: Definiciones de entidades y contrato RPC
├── quickstart.md        # Salida Fase 1: Referencia rápida de implementación
├── checklists/
│   └── requirements.md  # Validación de calidad de la spec
└── tasks.md             # Salida Fase 2 (/speckit-tasks — NO creado por /speckit-plan)
```

### Código Fuente (raíz del repositorio)

```text
# Base de datos
supabase/migrations/
└── 20260603_merge_customers_function.sql    # NUEVO: función RPC merge_customers

# Utilidades compartidas (funciones puras, reutilizables)
apps/shared/lib/
├── normalizePhone.ts                         # NUEVO: normalización de teléfono
└── normalizeName.ts                          # NUEVO: normalización de nombre

# App desktop — Componentes de administración
apps/desktop/src/components/admin/config/
├── CustomerManager.tsx                       # MODIFICAR: agregar botón "Unificar Clientes"
├── CustomerCreateModal.tsx                   # MODIFICAR: verificación de duplicados mejorada
└── CustomerUnify.tsx                         # NUEVO: vista de unificación (detección + merge UI)

# App desktop — Modales del POS
apps/desktop/src/components/modals/
├── SimpleCustomerModal.tsx                   # MODIFICAR: verificación mejorada + diálogo de prevención
└── CustomerVehicleModal.tsx                  # MODIFICAR: verificación mejorada + diálogo de prevención

# App desktop — Carrito POS
apps/desktop/src/components/pos/
└── POSCart.tsx                               # MODIFICAR: excluir clientes unificados de búsqueda

# App desktop — Tipos
apps/desktop/src/types/
└── supabase.ts                               # MODIFICAR: agregar tipos del RPC merge_customers

# App desktop — Estilos (solo si se necesitan clases nuevas)
apps/desktop/src/
└── index.css                                 # POSIBLE MODIFICACIÓN: estilos para UI de unificar
```

**Decisión de estructura**: Estructura de app desktop de proyecto único. La funcionalidad toca solo la app Electron de escritorio — el portal web (`apps/web/`) y la capa de stores compartidas (`apps/shared/store/`) no se modifican. Dos nuevas utilidades compartidas van en `apps/shared/lib/` ya que son funciones puras potencialmente reutilizables por web en el futuro.

## Seguimiento de Complejidad

> Sin violaciones que justificar. Todos los gates de constitución aprobados.
