# Implementation Plan: Base Diaria de Caja Configurable

**Branch**: `018-base-diaria-caja` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/018-base-diaria-caja/spec.md`

## Summary

Añadir un ajuste **"Base Diaria de Caja"** (monto en efectivo, uno por negocio) que:

1. Se configura en el panel de Configuración del POS de escritorio y se persiste en la
   tabla existente `business_settings` (`setting_type = 'cash'`, `value = { daily_base }`)
   — **sin migración SQL**.
2. Se expone en la store compartida `useBusinessStore` como `dailyCashBase`.
3. **Apertura de Caja** pre-carga el monto inicial con `dailyCashBase` (editable).
4. **Cierre de Caja** pre-carga la base a retener con `dailyCashBase` (editable) y
   **elimina el movimiento de egreso `💵 Base próximo día`** de la Caja Central. El
   ingreso de efectivo a Caja Central ya excluye de forma natural el `opening_balance`
   (que es físicamente la base heredada del día anterior), por lo que retirar ese egreso
   basta para que la base nunca entre ni se sume a la Caja Central, sin descuadre.

Alcance: `apps/desktop` + `apps/shared`. No se toca `apps/web`, ni RPCs, ni el esquema.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode), React 19

**Primary Dependencies**: Vite 7 + Electron 33 (desktop), Zustand 5, Supabase JS client, Tailwind CSS 3.4

**Storage**: PostgreSQL via Supabase (PostgREST + RLS). Tabla `business_settings` ya existe con `UNIQUE (business_id, setting_type)` y políticas RLS por `business_id` que permiten cualquier `setting_type`. **No requiere migración.**

**Testing**: Sin framework formal. Validación manual con `pnpm build` (tsc -b) + ejecución en `electron:dev`.

**Target Platform**: Desktop (Electron) únicamente.

**Project Type**: Monorepo pnpm workspaces (`apps/desktop`, `apps/shared`; `apps/web` NO afectado).

**Performance Goals**: 1 consulta adicional a `business_settings` (índice `idx_business_settings_type`) durante `fetchBusinessProfile`. Sin impacto de latencia perceptible.

**Constraints**:
- No cambiar firmas ni propiedades existentes de `useBusinessStore` (solo añadir `dailyCashBase`).
- No tocar `PaymentModal.tsx`.
- Cero shadowing de variables en `handleConfirmClose` de `CloseSessionModal` (riesgo TDZ en build de producción Vite).
- El canal de Apertura/Cierre de Caja debe seguir funcionando sin regresión.

**Scale/Scope**: 1 store compartida, 3 componentes desktop, 1 documento. Sin migración, sin RPC, sin web.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Notas |
|-----------|--------|-------|
| **I. Multi-Industry Dynamism** (NON-NEGOTIABLE) | ✅ PASS | La Base Diaria es un ajuste global de manejo de efectivo (como el PIN o los descuentos), aplica a todo negocio por igual. Sin condicional por `business_type`, sin necesidad de `MODULE_REGISTRY`. |
| **II. Tenant Isolation via Supabase RLS** | ✅ PASS | `business_settings` está RLS-scoped por `business_id = profiles.business_id`. Lectura y `upsert` heredan el negocio del perfil autenticado. |
| **III. Spec-Driven Development** (NON-NEGOTIABLE) | ✅ PASS | Se sigue el protocolo de 5 fases. |
| **IV. Store Integrity & Impact Analysis** | ✅ PASS | `useBusinessStore` gana la propiedad **nueva** `dailyCashBase` + un bloque de fetch en `fetchBusinessProfile` (mismo patrón que el fetch de `security`). No se altera ninguna firma ni propiedad existente. Consumidores del contrato actual (`id`, `config`, `isModuleEnabled`, …) no se ven afectados. El fetch extra corre también en web (código compartido) pero es de solo lectura e inofensivo. `PaymentModal.tsx` **no** se toca. Ver [research.md](./research.md) §3. |
| **V. TypeScript Strict & Zero Shadowing** | ✅ PASS | Sin `any` nuevo. Se tipa `dailyCashBase: number` en la interfaz de la store. `OpenSessionModal` y `CloseSessionModal` ya son `// @ts-nocheck` (no se introduce deuda nueva). Verificación anti-shadowing en `handleConfirmClose` antes del build. |
| **Architecture: No Custom Backend** | ✅ PASS | Sin servidor propio. Sin RPC nueva. Sin migración. Solo frontend + tabla existente. |
| **Architecture: Zustand as Single State Manager** | ✅ PASS | Se reutiliza `useBusinessStore`. |
| **Architecture: Styling Stack** | ✅ PASS | Tailwind 3.4 en desktop, sin librerías de componentes nuevas. |

## Project Structure

### Documentation (this feature)

```text
specs/018-base-diaria-caja/
├── plan.md              # Este archivo
├── research.md          # Phase 0 — decisión de la fórmula de cierre + impacto en store
├── data-model.md        # Phase 1 — entidades y cambios de comportamiento
├── quickstart.md        # Phase 1 — pasos de verificación manual
├── checklists/
│   └── requirements.md  # Checklist de calidad del spec
└── tasks.md             # Phase 2 (/speckit-tasks) — NO creado por /speckit-plan
```

### Source Code (repository root)

```text
apps/
├── shared/
│   └── store/
│       └── useBusinessStore.ts        # MODIFICADO: + dailyCashBase:number; fetch business_settings setting_type='cash' en fetchBusinessProfile
└── desktop/
    └── src/
        └── components/
            ├── admin/config/
            │   └── GeneralSettings.tsx  # MODIFICADO: sección "Caja" con campo "Base Diaria de Caja"; upsert business_settings {setting_type:'cash', value:{daily_base}}; refresca store tras guardar
            └── modals/
                ├── OpenSessionModal.tsx # MODIFICADO: estado `amount` inicial = dailyCashBase (string), editable con numpad; la sesión abre con el valor en pantalla
                └── CloseSessionModal.tsx# MODIFICADO: nextDayBase por defecto = dailyCashBase (no opening_balance); ELIMINAR el INSERT de central_cash_movements type:'expense' "💵 Base próximo día"; ajustar textos de la tarjeta "Base Próximo Día"

docs/
└── features/
    └── cash-flow.md                    # MODIFICADO: flujo de Apertura (base predeterminada) y Cierre (base excluida de Caja Central, sin movimiento "Base próximo día")

# SIN migración SQL. SIN cambios en apps/web. SIN cambios de RPC.
```

**Structure Decision**: Monorepo existente. La lógica de estado va en `apps/shared/store/useBusinessStore.ts` (fuente única, consumida por desktop). La UI de configuración y los modales de caja son específicos de `apps/desktop`. La persistencia usa la tabla `business_settings` tal cual está — el mismo mecanismo que el ajuste `security` que ya vive en `GeneralSettings.tsx`.

## Complexity Tracking

> Sin violaciones. Todos los gates de la constitución pasan. No se añade abstracción nueva (se reutiliza `useBusinessStore` y `business_settings`).
