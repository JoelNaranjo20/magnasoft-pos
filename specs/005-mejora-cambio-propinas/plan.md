# Implementation Plan: Mejora del Sistema de Cambio y Propinas en POS

**Branch**: `005-mejora-cambio-propinas` | **Date**: 2026-06-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-mejora-cambio-propinas/spec.md`

---

## Summary

Agregar soporte para cambio cruzado (pago por un método, cambio devuelto por otro) directamente en el modal de pago del POS, mejoras de UX en propinas (porcentajes rápidos, distribución entre múltiples trabajadores, método de pago independiente), y visualización de estos datos en el historial de ventas y cierres de caja.

**Technical approach**: Extender el metadata JSONB de `sales` con nuevos campos (`cross_change`, `tip_distribution`, `tip_payment_method`, `tip_percentage`), generar `cash_movements` automáticos para cambios cruzados, modificar `PaymentModal.tsx` (cambios focalizados, sin refactor), y extender `SaleDetailsModal` y `CloseSessionModal` para visualización. Cero migraciones SQL de esquema — solo campos JSONB.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 19, Vite 6

**Primary Dependencies**: @supabase/supabase-js, Zustand, Tailwind CSS 3.4

**Storage**: PostgreSQL vía Supabase. Uso de JSONB `sales.metadata` para nuevos campos. Tablas existentes: `cash_movements`, `worker_commissions`.

**Testing**: Manual con `pnpm electron:dev`. Build con `pnpm build`. No hay test suite automatizada.

**Target Platform**: Desktop (Electron) + Web (Next.js, solo visualización)

**Project Type**: Monorepo con 3 paquetes (desktop, web, shared)

**Performance Goals**: Operación de cambio cruzado <15s (cajero). Sin impacto en performance de ventas normales.

**Constraints**: PaymentModal tiene 95KB — cambios mínimos, sin refactor. Cero migraciones de esquema SQL.

**Scale/Scope**: 3 user stories, 12 FRs, 6 CEs. Modifica 7 archivos. 0 migraciones SQL nuevas.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Evidencia |
|---|---|---|
| **I. Multi-Industry Dynamism** | ✅ PASA | Sin condicionamiento por `business_type`. Cambio cruzado y propinas funcionan igual para todos los giros. |
| **II. Tenant Isolation** | ✅ PASA | `cash_movements` y `sales` tienen RLS por `business_id`. Los cambios usan `session_id` de la sesión activa. |
| **III. Spec-Driven Development** | ✅ PASA | Siguiendo protocolo de 5 fases. Spec → Plan → Tasks → Implement → Verify. |
| **IV. Store Integrity** | ✅ PASA | Sin modificaciones a stores compartidas. Solo lectura de `useCartStore.globalWorkerId` (ya existente). |
| **V. TypeScript Strict** | ✅ PASA | `SaleMetadata` extendido con tipos explícitos. Sin `any`. Sin shadowing. |
| **Sin Backend Propio** | ✅ PASA | Sin nuevos endpoints. Todo es frontend + JSONB en PostgreSQL existente. |
| **Zustand Only** | ✅ PASA | Sin nuevas librerías de estado. |
| **Styling Stack** | ✅ PASA | Tailwind 3.4 existente. |
| **YAGNI** | ✅ PASA | Sin tablas nuevas. Se extiende metadata JSONB que ya existe. Sin over-engineering. |

**GATE RESULT**: ✅ TODOS APROBADOS

**Post-Design Re-check**: ✅ Sin cambios.

---

## Project Structure

### Documentation (this feature)

```text
specs/005-mejora-cambio-propinas/
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
apps/desktop/src/
├── types/
│   └── pos.ts                              # Extender SaleMetadata
├── components/
│   ├── modals/
│   │   ├── PaymentModal.tsx                # ★ CORE: Cross-change UI + % tips + split workers
│   │   ├── CloseSessionModal.tsx           # Mostrar cambios entregados en resumen
│   │   └── SaleDetailsModal.tsx            # Mostrar cross-change + tip en detalle
│   └── admin/
│       └── sessions/
│           └── SessionHistory.tsx          # Mejorar badge de propinas
apps/shared/
├── components/
│   └── modals/
│       └── SaleDetailsModal.tsx            # Ídem desktop
└── features/
    └── sales/
        └── Sales.tsx                       # Separar cross-change en reconciliación
```

**Structure Decision**: Monorepo con 3 paquetes. Cambios en `desktop` (cobro y cierre) y `shared` (vistas de historial). Sin nuevos archivos.

---

## Complexity Tracking

> Sin violaciones. Todos los gates pasaron.

---

## Implementation Phases

### Fase 1: Tipos (1 archivo)

**Archivo**: `apps/desktop/src/types/pos.ts`

Extender la interfaz `SaleMetadata` con los campos documentados en `data-model.md`:
- `tip_amount?: number`
- `tip_worker_id?: string | null`
- `tip_payment_method?: 'cash' | 'transfer' | 'card'`
- `tip_percentage?: number`
- `tip_distribution?: Array<{ worker_id: string; amount: number }>`
- `cross_change?: { from_method: string; to_method: string; amount: number }`

### Fase 2: PaymentModal — Cambio Cruzado + Propinas Mejoradas (1 archivo grande)

**Archivo**: `apps/desktop/src/components/modals/PaymentModal.tsx`

**2a — Cambio Cruzado (US1, FR-001 a FR-005, FR-012)**:
1. Agregar estado: `crossChangeEnabled`, `crossChangeToMethod`, `crossChangeAmount`
2. En método `transfer`/`card`: cuando `receivedAmount > total`, mostrar toggle "¿Dar cambio en efectivo?"
3. En método `cash`: cuando `receivedAmount > total`, mostrar toggle "¿Dar cambio por transferencia?"
4. Validar que `crossChangeAmount <= receivedAmount - total`
5. Validar saldo en caja (FR-012): warning si `to_method === 'cash'` y saldo insuficiente
6. En `handleConfirm`: después de crear la venta, insertar `cash_movement` tipo `expense`
7. Guardar `cross_change` en `sale.metadata`

**2b — Propinas con porcentaje (US2, FR-006, FR-011)**:
1. Agregar botones: [10%] [15%] [20%] junto al input de propina
2. `onClick`: calcular `Math.round(total * percentage / 100)` y setear `tipAmount`
3. Mantener input manual para ajustes finos
4. Mejorar botón "Dejar cambio como propina"

**2c — Split de propinas (US2, FR-008)**:
1. Botón "Repartir propina" → filas dinámicas (trabajador + monto)
2. Total de splits debe sumar `tipAmount`
3. Guardar `tip_distribution` en metadata + múltiples `worker_commissions`

**2d — Método de pago independiente (US2, FR-007)**:
1. Selector "Método de propina" (efectivo/transferencia/tarjeta)
2. Si es distinto al método de venta, NO sumar tip al payment amount
3. Guardar `tip_payment_method` en metadata

### Fase 3: SaleDetailsModal — Visualización (2 archivos, US3, FR-009)

**Archivos**: `apps/shared/components/modals/SaleDetailsModal.tsx` + `apps/desktop/src/components/modals/SaleDetailsModal.tsx`

1. Leer `metadata.cross_change` → badge: "🔀 Cambio: $X devuelto en [método]"
2. Leer `metadata.tip_amount`, `tip_percentage`, `tip_worker_id` → badge: "💰 Propina: $X (Y%) → Trabajador"
3. Si `tip_distribution`, mostrar distribución detallada
4. Si `tip_payment_method` != método de venta, mostrar método de propina

### Fase 4: CloseSessionModal — Resumen (1 archivo, US3, FR-010)

**Archivo**: `apps/desktop/src/components/modals/CloseSessionModal.tsx`

1. Sumar cambios entregados por método desde `cash_movements` con "Cambio cruzado" en descripción
2. Mostrar "Cambios Entregados" en columna de resumen con breakdown por método
3. Validar que `expectedTotal` sigue siendo correcto (los cash_movements expense ya se restan automáticamente)

### Fase 5: Sales.tsx — Reconciliación (1 archivo, US3)

**Archivo**: `apps/shared/features/sales/Sales.tsx`

1. Respetar `tip_payment_method` al reconciliar tips (efectivo vs digital)
2. Agregar línea de "Cambios cruzados" en vista de movimientos/detalle

### Fase 6: SessionHistory — Badge visual (1 archivo, US3)

**Archivo**: `apps/desktop/src/components/admin/sessions/SessionHistory.tsx`

1. Mejorar badge de propinas en comisiones (`tip` y `tip_split`)
2. Mostrar total de propinas en resumen de sesión

---

## Risk Assessment

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Romper flujo de pago existente | Media | Alto | Cambios mínimos. Probar cash, transfer, card, mixed, credit. |
| Error en cierre de caja | Baja | Alto | Cash movements expense se restan automáticamente. Probar cierre con cross-change. |
| Regresión en propinas existentes | Baja | Medio | `tip_worker_id` único sigue soportado. Nuevos campos opcionales. |
| Performance con JSONB más grande | Muy baja | Bajo | Metadata ya tiene ~10 campos. 3-4 más es insignificante. |
