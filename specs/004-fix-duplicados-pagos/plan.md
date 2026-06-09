# Plan de Implementación: Corregir Duplicados y Pagos a Caja Central

**Rama**: `004-fix-duplicados-pagos` | **Fecha**: 2026-06-04 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificación de funcionalidad de `specs/004-fix-duplicados-pagos/spec.md`

## Resumen

Corregir tres problemas del sistema actual: (1) **bloquear totalmente** la creación de clientes duplicados eliminando la opción "Crear de todos modos", (2) **eliminar físicamente** los clientes duplicados durante la unificación en vez de solo marcarlos, y (3) **redirigir todos los pagos** de deudas de clientes a Caja Central, eliminando el selector de destino y la dependencia de sesión de caja diaria.

## Contexto Técnico

**Lenguaje/Versión**: TypeScript 5.x (strict mode), React 19, Vite 6

**Dependencias principales**: @supabase/supabase-js, Zustand, Tailwind CSS 3.4, PostgreSQL, Electron

**Almacenamiento**: PostgreSQL vía Supabase. La RPC `merge_customers` se reescribe para hacer DELETE físico. Pagos se registran en `central_cash_movements`.

**Pruebas**: Manuales con `pnpm electron:dev`. Build con `pnpm build`.

**Plataforma objetivo**: Desktop (Electron) + Web (Next.js, solo RegisterAbonoModal)

**Tipo de proyecto**: Monorepo con 3 paquetes (desktop, web, shared)

**Escala/Alcance**: 3 historias de usuario, 10 FRs, 6 CEs. Modifica 10 archivos. 1 RPC se reescribe.

## Verificación de Constitución

*GATE: Debe pasar antes de investigación Fase 0.*

| Principio | Estado | Evidencia |
|---|---|---|
| **I. Dinamismo Multi-Industria** | ✅ PASA | Sin condicionamiento por `business_type`. Cambios aplican a todos los tipos de negocio. |
| **II. Aislamiento de Tenant** | ✅ PASA | RPC `merge_customers` valida `business_id` entre target y sources. `central_cash_movements` tiene RLS por negocio. |
| **III. Desarrollo Spec-Driven** | ✅ PASA | Siguiendo protocolo de 5 fases. |
| **IV. Integridad de Stores** | ✅ PASA | Sin modificaciones a stores compartidas. |
| **V. TypeScript Strict** | ✅ PASA | Sin `any`. Sin shadowing. |
| **Sin Backend Propio** | ✅ PASA | RPC PostgreSQL. |
| **Zustand Only** | ✅ PASA | Sin nuevas librerías de estado. |
| **Styling Stack** | ✅ PASA | Tailwind 3.4 existente. |
| **YAGNI** | ✅ PASA | Se remueve código muerto (filtros `.is()`, selector cashTarget). |

**GATE RESULT**: ✅ TODOS APROBADOS

## Estructura del Proyecto

### Documentación

```text
specs/004-fix-duplicados-pagos/
├── spec.md
├── plan.md              # Este archivo
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md             # /speckit-tasks (próximo paso)
```

### Código Fuente

```text
# RPC
supabase/migrations/
└── 20260603_merge_customers_function.sql    # REESCRIBIR: DELETE en vez de metadata

# Desktop — Formularios de creación (bloqueo total)
apps/desktop/src/components/admin/config/
├── CustomerCreateModal.tsx                   # MODIFICAR: quitar "Crear de todos modos"
└── CustomerUnify.tsx                         # MODIFICAR: vista previa advierte DELETE
apps/desktop/src/components/modals/
├── SimpleCustomerModal.tsx                   # MODIFICAR: quitar "Crear de todos modos" + quitar filtro .is()
└── CustomerVehicleModal.tsx                  # MODIFICAR: quitar "Crear de todos modos" + quitar filtro .is()

# Desktop — Simplificar queries
apps/desktop/src/components/admin/config/
└── CustomerManager.tsx                       # MODIFICAR: quitar filtro .is()
apps/desktop/src/components/pos/
└── POSCart.tsx                               # MODIFICAR: quitar filtro .is()

# Desktop — Pagos a Caja Central
apps/desktop/src/components/finance/
├── CarteraHub.tsx                            # MODIFICAR: goToCentral=true, quitar UI cashTarget, quitar requisito cashSession
└── CreditManagement.tsx                      # MODIFICAR: goToCentral=true, quitar UI cashTarget, quitar requisito cashSession

# Web — Pagos a Caja Central
apps/web/app/components/modals/
└── RegisterAbonoModal.tsx                    # MODIFICAR: goToCentral=true, quitar UI cashTarget, quitar requisito activeSession
```

## Seguimiento de Complejidad

> Sin violaciones que justificar.
