# Implementation Plan: Analytics de Ventas por Categoría y Servicio en Caja Central

**Branch**: `009-central-cash-analytics` | **Date**: 2026-06-10 | **Spec**: [spec.md](./spec.md)

## Summary

Dos entregables: (1) En el tab Total General de Caja Central, cada mes expandido muestra un resumen compacto de ventas por categoría (top 5) y un botón "Ver detalle completo" que abre un modal con la desagregación de todos los servicios del mes. (2) El hook `useCentralCash` se mueve a `apps/shared/` como parte de `@shared/logic`, y el módulo web obtiene un componente `CentralCashPage` con la misma estructura de 3 tabs que el desktop.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.2, Next.js 16 (web)

**Primary Dependencies**: Supabase, Zustand 5, Tailwind CSS 3.4 (desktop) / Tailwind CSS 4 (web), date-fns 4, Recharts 3.6

**Storage**: Sin cambios. Datos de analytics desde `sales` + `sale_items` + `services` + `products` + `categories`.

**Testing**: `pnpm build` en desktop y web, verificación visual en `electron:dev`.

**Scale/Scope**: 1 hook movido, 1 componente web nuevo, 1 componente desktop modificado, 1 modal nuevo.

## Constitution Check

| Principle | Status |
|-----------|--------|
| I. Multi-Industry | ✅ Sin condicionales por business_type |
| II. RLS | ✅ business_id en toda query |
| III. SDD | ✅ Siguiendo protocolo spec → plan → tasks → implement |
| IV. Store Integrity | ✅ Hook compartido sin breaking changes |
| V. TypeScript Strict | ✅ Sin any, tipos explícitos |
| Architecture: Monorepo | ✅ Hook en shared, consumido por desktop + web |
| Architecture: No Custom Backend | ✅ RPC existentes, queries directas |
| Zustand Only | ✅ Sin nuevas librerías |

**GATE**: ✅ ALL PASS

## Project Structure

```text
apps/shared/
├── hooks/
│   └── useCentralCash.ts          # MOVED from apps/desktop/src/hooks/
├── components/
│   └── modals/
│       └── CategorySalesModal.tsx  # NEW: modal de analytics compartido

apps/desktop/src/
├── hooks/
│   └── useCentralCash.ts          # → re-export from @shared/logic
└── components/
    └── finance/
        └── CentralCash.tsx         # UPDATE: resumen top 5 + botón modal

apps/web/src/
├── app/
│   └── (dashboard)/
│       └── dashboard/
│           └── central-cash/
│               └── page.tsx        # NEW: página de Caja Central web
└── components/
    └── CentralCashPage.tsx         # NEW: componente Caja Central (3 tabs)
```

## UI Architecture

### Modal de Analytics

```
┌─ Modal: Ventas de Junio 2026 ──────────────────────────────┐
│                                                              │
│  📊 Total vendido en el mes: $7,464,500                     │
│                                                              │
│  ┌─ Lavados ───────────────────── $2,150,000 (28.8%) ────┐  │
│  │  Lavado de moto        45 × $20,000    $900,000       │  │
│  │  Lavado normal         60 × $15,000    $900,000       │  │
│  │  Lavado de 25          10 × $35,000    $350,000       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Mecánica ─────────────────── $1,850,000 (24.8%) ─────┐  │
│  │  Cambio de aceite       30 × $25,000    $750,000       │  │
│  │  Revisión general       15 × $40,000    $600,000       │  │
│  │  Frenos                 10 × $50,000    $500,000       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ... más categorías ...                                     │
│                                                              │
│                                              [Cerrar]       │
└──────────────────────────────────────────────────────────────┘
```

Cada categoría es expandible (acordeón dentro del modal). Los servicios se ordenan por monto (mayor primero).
