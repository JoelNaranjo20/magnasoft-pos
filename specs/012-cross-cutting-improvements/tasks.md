# Tasks: Mejoras Transversales — Inventario, Puntos, Caja Central

**Input**: Design documents from `specs/012-cross-cutting-improvements/`

**Prerequisites**: plan.md ✅, spec.md ✅ (clarified), research.md ✅, data-model.md ✅

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup — Verificación

- [x] T001 Verificar build desktop: `cd apps/desktop && npx vite build` — compila sin errores
- [x] T002 [P] Verificar build web: `cd apps/web && npx next build` — compila sin errores

**Checkpoint**: Base funcional.

---

## Phase 2: Foundational — Migración de puntos

**Purpose**: Crear tabla `customer_loyalty_points`. BLOQUEA US2.

- [x] T003 Crear migración `supabase/migrations/20260615_add_loyalty_points.sql` — tabla `customer_loyalty_points` con: `id UUID PK`, `business_id UUID FK → business`, `customer_id UUID FK → customers UNIQUE`, `points INTEGER DEFAULT 0`, `last_activity_at TIMESTAMPTZ DEFAULT now()`, `status TEXT DEFAULT 'active' CHECK (active/expired)`. Con índices y RLS.
- [x] T004 Aplicar migración: `supabase db push`

**Checkpoint**: Tabla loyalty lista en DB.

---

## Phase 3: US1 — Consumo Interno de Inventario (P1)

**Goal**: El admin selecciona un producto del inventario, registra consumo interno, y se genera egreso en caja diaria con costo promedio de compra + descuento de stock.

**Independent Test**: Producto stock 10, costo promedio $15K → consumo 3 unidades → stock 7, cash_movements egreso $45K "Consumo interno: [Producto]".

- [x] T005 [US1] Crear RPC `get_product_avg_cost` en `supabase/migrations/20260615_add_loyalty_points.sql` — función SQL que recibe `product_id` y `business_id`, retorna costo promedio ponderado desde `inventory_movements` (`SUM(unit_cost*quantity)/SUM(quantity)`). Si no hay compras → retorna `products.price`.
- [x] T006 [US1] Crear `InventoryInternalConsumptionModal.tsx` en `apps/desktop/src/components/finance/InventoryInternalConsumptionModal.tsx` — modal que recibe `{ isOpen, onClose, product }`. Muestra: nombre producto, stock actual, costo promedio (calculado vía RPC), precio de venta (informativo). Input de cantidad. Botón confirmar que: (a) valida stock suficiente, (b) INSERT en `cash_movements` (type='expense', amount=avgCost×qty, description='Consumo interno: [nombre]'), (c) INSERT en `inventory_movements` (type='consumption', quantity=-qty, unit_cost=avgCost), (d) UPDATE `products.stock -= qty`.
- [x] T007 [US1] Agregar botón "Consumo Interno" en `apps/desktop/src/components/inventory/InventoryManager.tsx` — visible al seleccionar un producto, abre `InventoryInternalConsumptionModal`.
- [x] T008 [US1] Agregar botón "Consumo Interno" en `apps/web/app/(dashboard)/dashboard/inventario/page.tsx` — mismo comportamiento que desktop.

**Checkpoint**: Consumo interno funcional en desktop y web.

---

## Phase 4: US2 — Vencimiento de Puntos a 6 Meses (P2)

**Goal**: Puntos de cliente expiran si no hay actividad (acumular o canjear) en 6 meses. Cualquier actividad reinicia el contador.

**Independent Test**: Cliente 500 pts, última actividad 1-ene, hoy 2-jul (>6 meses) → puntos expiran. Si canjea 100 pts → contador reinicia a hoy.

- [x] T009 [US2] Agregar lógica de acumulación de puntos — al completar una venta (donde ya se generan puntos), INSERT/UPDATE `customer_loyalty_points`: `points += nuevos`, `last_activity_at = now()`, `status = 'active'`. Buscar dónde se generan puntos actualmente (trigger SQL o hook en frontend).
- [x] T010 [US2] Agregar lógica de canje de puntos — al canjear premio, UPDATE `customer_loyalty_points`: `points -= canjeados`, `last_activity_at = now()`. Validar puntos suficientes y que no estén expirados.
- [x] T011 [US2] Agregar verificación de vencimiento en `apps/shared/hooks/useLoyaltyPoints.ts` (o hook existente si hay) — al cargar puntos del cliente, verificar `last_activity_at < now() - 6 months`. Si expiró → `status = 'expired'`, `points = 0`.
- [x] T012 [US2] Actualizar UI de premios/bonos para reflejar puntos expirados — si `status = 'expired'`, mostrar mensaje "Puntos expirados" y deshabilitar canje.

**Checkpoint**: Puntos expiran correctamente. Actividad reinicia contador.

---

## Phase 5: US3 — Resumen Caja Central 2 Columnas (P1)

**Goal**: "Ver Historial Completo" abre modal con ingresos efectivo (izq) + ingresos transferencia (der) + egresos + categorías + servicios vendidos (cantidad).

**Independent Test**: Abrir dashboard → clic "Ver Historial Completo" → 2 columnas de ingresos, egresos, categorías, servicios con cantidades.

- [x] T013 [US3] Agregar `serviceSalesCount` en `apps/shared/hooks/useCentralCash.ts` — `useMemo` que aplana `categorySales[].services[]` y agrupa por `serviceName` sumando `quantity`. Retorna `{ name: string; quantity: number }[]` ordenado descendente.
- [x] T014 [US3] Reescribir `CentralCashHistoryModal.tsx` en `apps/shared/components/modals/CentralCashHistoryModal.tsx` — nueva estructura:
  - Header: Total Ingresos Efectivo, Total Ingresos Transferencia, Total Egresos, Neto
  - Grid 2 columnas: Ingresos Efectivo (izq, fondo verde) + Ingresos Transferencia (der, fondo azul). Cada columna lista movimientos con descripción y monto.
  - Sección Egresos (full width, fondo rojo claro) con lista y total
  - Sección "Ventas por Categoría" con progress bars (reutilizar diseño de `CategorySalesModal`)
  - Sección "Servicios Vendidos" con nombre y cantidad (nº de ventas, no monto)
  - Props: `{ isOpen, onClose, cashIngresos, transferIngresos, egresos, categorySales, serviceSalesCount, totalCash, totalTransfer, totalEgresos, neto, loading }`
- [x] T015 [US3] Actualizar `CentralCash.tsx` en `apps/desktop/src/components/finance/CentralCash.tsx` — pasar nuevas props a `CentralCashHistoryModal`: `cashIngresos`, `transferIngresos`, `egresos`, `serviceSalesCount`, totales.
- [x] T016 [P] [US3] Actualizar `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` — mismas props que T015.

**Checkpoint**: Modal historial 2 columnas funcional en desktop y web.

---

## Phase 6: Polish & Build

- [x] T017 Ejecutar build desktop: `cd apps/desktop && npx vite build` — cero errores
- [x] T018 [P] Ejecutar build web: `cd apps/web && npx next build` — cero errores
- [x] T019 Verificar no regresión en `CloseSessionModal.tsx` — cierre de sesión intacto
- [x] T020 Seguir quickstart.md y confirmar todos los checkboxes

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** → sin dependencias
- **Phase 2 (Foundational)** → depende de Phase 1. BLOQUEA US2.
- **Phase 3 (US1)** → depende de Phase 1. Independiente de US2/US3.
- **Phase 4 (US2)** → depende de Phase 2 (migración). Independiente de US1/US3.
- **Phase 5 (US3)** → depende de Phase 1. Independiente de US1/US2.
- **Phase 6 (Polish)** → depende de US1+US2+US3 completadas.

### Parallel Opportunities

| Grupo | Tareas |
|-------|--------|
| Setup | T001 + T002 |
| US1 + US3 (independientes) | Phase 3 y Phase 5 pueden ejecutarse en paralelo |
| US1 internals | T006 + T007 (desktop), T008 (web) — después de T005 |
| Desktop + Web | T015 + T016 |
| Builds | T017 + T018 |

### MVP Scope

→ **Phase 1 + 2 + 3 + 5** (US1 + US3, 15 tareas): Consumo interno + Caja Central 2 columnas. US2 (puntos) es independiente.

---

## Notes

- 1 migración SQL nueva (`customer_loyalty_points` + RPC `get_product_avg_cost`).
- `serviceSalesCount` es un `useMemo` simple que aplana `categorySales` — no requiere nuevas queries.
- El modal de historial se reescribe completamente (~200 líneas). El anterior (acordeones) se descarta.
- Consumo interno afecta `cash_movements` (caja diaria), no `central_cash_movements` directamente.
- La lógica de puntos existente (dónde se acumulan/canjean) debe localizarse en T009-T010 — puede estar en triggers SQL o en frontend.
