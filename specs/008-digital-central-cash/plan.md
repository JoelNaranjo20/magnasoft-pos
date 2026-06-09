# Implementation Plan: Ingresos Completos a Caja Central con Trazabilidad

**Branch**: `008-digital-central-cash` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-digital-central-cash/spec.md` (v3 — 3 vistas)

## Summary

Al cerrar turno: un solo movimiento `income` con `payment_method = 'mixed'`, `amount = total`, `session_id`, y `metadata` JSONB con desglose por origen y método. Caja Central se rediseña con 3 pestañas: Efectivo Disponible, Transferencia Disponible, Total General (con resumen mensual de entradas/gastos). Backfill unifica sesiones históricas y migra movimientos legacy.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.2, PL/pgSQL

**Primary Dependencies**: Supabase, Zustand 5, Tailwind CSS 3.4, date-fns 4

**Storage**: PostgreSQL — migración: ALTER TABLE + CHECK constraint + RPC backfill

**Testing**: `electron:dev` + `pnpm build`

**Target Platform**: Electron 33 (Windows x64)

**Scale/Scope**: 1 migración, 1 RPC, 1 hook modificado, 1 componente rediseñado, 1 modal actualizado, tipos TS

## Constitution Check

| Principle | Status |
|-----------|--------|
| I. Multi-Industry | ✅ Sin lógica por business_type |
| II. RLS | ✅ business_id en toda query |
| III. SDD | ✅ Siguiendo protocolo |
| IV. Store Integrity | ✅ Hook expandido sin breaking changes |
| V. TypeScript Strict | ✅ Tipos nuevos sin any |
| No Custom Backend | ✅ RPC + frontend |
| Zustand Only | ✅ Sin nuevas librerías |

**GATE**: ✅ ALL PASS

## Project Structure

```text
supabase/migrations/
└── 20260609_add_session_id_metadata_central_cash.sql  # NEW

apps/desktop/src/
├── types/supabase.ts                    # UPDATE
├── hooks/useCentralCash.ts              # UPDATE
├── components/finance/CentralCash.tsx   # REDESIGN (3 tabs)
└── components/modals/CloseSessionModal.tsx  # UPDATE
```

## UI Architecture — 3 Tabs

```
┌─────────────────────────────────────────────────────────┐
│  [💰 Efectivo]  [🏦 Transferencia]  [📊 Total General]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Hero ───────────────────────────────────────────┐  │
│  │  Efectivo Disponible: $1,234,567                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ▼ 9 junio 2026                    Efectivo: +$385,000  │
│  │  + Cierre #abc123  10:30 PM    $150,000             │
│  │  + Cierre #def456  11:45 PM    $235,000             │
│                                                         │
│  ▶ 8 junio 2026                    Efectivo: +$210,000  │
└─────────────────────────────────────────────────────────┘
```

**Tab 3 (Total General)** agrega sección mensual:

```
┌─ Resumen Mensual ─────────────────────────────────────┐
│                                                        │
│  ▼ Junio 2026            Entradas  Gastos    Neto     │
│  │                        $5.2M    −$1.8M   +$3.4M   │
│  │  ┌─ Entradas ──────────────────────────────────┐  │
│  │  │  Cierres de Turno (12)           $4.8M      │  │
│  │  │  Ingresos Manuales (3)           $0.4M      │  │
│  │  └─────────────────────────────────────────────┘  │
│  │  ┌─ Gastos ────────────────────────────────────┐  │
│  │  │  Comisiones Pagadas              −$0.8M     │  │
│  │  │  Salarios / Préstamos Trab.      −$0.6M     │  │
│  │  │  Otros Egresos                   −$0.4M     │  │
│  │  └─────────────────────────────────────────────┘  │
│                                                        │
│  ▶ Mayo 2026              Entradas  Gastos    Neto     │
│                           $4.8M    −$1.5M   +$3.3M    │
└────────────────────────────────────────────────────────┘
```
