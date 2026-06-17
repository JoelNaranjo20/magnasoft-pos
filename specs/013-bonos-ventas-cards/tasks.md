# Tasks: Cards de Bonos y Ventas Servicios en Caja Central

**Input**: Design documents from `specs/013-bonos-ventas-cards/`

**Prerequisites**: spec.md ✅ (clarified)

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Verificar build desktop: `cd apps/desktop && npx vite build`
- [x] T002 [P] Verificar build web: `cd apps/web && npx next build`

---

## Phase 2: Foundational — Datos en el hook

**Purpose**: Agregar queries al hook para Bonos y Ventas Servicios. BLOQUEA US1-US2.

- [x] T003 Agregar `fetchBonosData()` en `apps/shared/hooks/useCentralCash.ts` — query que busca `sale_items` con `unit_price = 0` y `service_id` no nulo, en ventas completadas (`sales.status = 'completed'`) del mes. Joinea `services(price, name)` y `sales(customer:customers(name), created_at)`. Retorna `{ totalBonos, bonosDetalle: { cliente, servicio, fecha, puntosGastados }[] }`. El valor del bono se calcula con `services.price × quantity`.
- [x] T004 [P] Agregar `fetchVentasServiciosData()` en `apps/shared/hooks/useCentralCash.ts` — query que consulta `sale_items` con `service_id` no nulo en ventas completadas del mes. Agrupa por `service_id`. Retorna `{ totalVentasServicios, ventasServiciosDetalle: { servicio, cantidad, totalFacturado }[] }`. Reutiliza parcialmente `fetchCategorySales`.
- [x] T005 Exponer `bonosTotal`, `bonosDetalle`, `bonosLoading`, `ventasServiciosTotal`, `ventasServiciosDetalle`, `ventasServiciosLoading` en el return del hook. Llamar `fetchBonosData()` y `fetchVentasServiciosData()` desde `fetchDashboardData()`.

---

## Phase 3: US1 — Card Bonos Entregados (P1)

- [x] T006 [US1] Crear `BonosDetalleModal.tsx` en `apps/shared/components/modals/BonosDetalleModal.tsx` — modal con lista de canjes: cliente, servicio, fecha, puntos gastados. Header con total en $.
- [x] T007 [US1] Agregar card "🎁 Bonos Entregados" en `apps/desktop/src/components/finance/CentralCash.tsx` — reemplaza la card de Total Nómina. Muestra `bonosTotal` en $. Cliqueable → `BonosDetalleModal`.
- [x] T008 [P] [US1] Agregar card "🎁 Bonos Entregados" en `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` — mismo que T007.

---

## Phase 4: US2 — Card Total Ventas Servicios (P1)

- [x] T009 [US2] Crear `VentasServiciosDetalleModal.tsx` en `apps/shared/components/modals/VentasServiciosDetalleModal.tsx` — modal con lista de servicios: nombre, cantidad vendida, total facturado. Header con total.
- [x] T010 [US2] Agregar card "📊 Total Ventas Servicios" en `apps/desktop/src/components/finance/CentralCash.tsx` — al lado de Bonos Entregados (grid 2 cols). Muestra `ventasServiciosTotal`. Cliqueable → `VentasServiciosDetalleModal`.
- [x] T011 [P] [US2] Agregar card "📊 Total Ventas Servicios" en `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` — mismo que T010.

---

## Phase 5: Polish & Build

- [x] T012 Ejecutar build desktop: `cd apps/desktop && npx vite build` — cero errores
- [x] T013 [P] Ejecutar build web: `cd apps/web && npx next build` — cero errores
- [x] T014 Verificar: card de Nómina ya no se muestra. Las 2 cards nuevas aparecen con datos correctos.

---

## Dependencies

- **Phase 2 (hook)** → BLOQUEA US1 y US2.
- **US1 y US2** → Independientes entre sí. Pueden implementarse en paralelo.
- **Phase 5** → Depende de US1+US2.

### Parallel Opportunities

| Grupo | Tareas |
|-------|--------|
| Queries hook | T003 + T004 |
| Modals | T006 + T009 |
| Desktop + Web | T007+T008, T010+T011 |
| Builds | T012 + T013 |

### MVP Scope

→ Phase 1 + 2 + 3 (8 tareas): Bonos card funcional.

---

## Notes

- Sin migraciones SQL. Solo SELECTs sobre `sale_items`, `services`, `sales`, `customers`.
- Las cards reemplazan la existente "Total Nómina" — se elimina del dashboard.
- `BonosDetalleModal`: estructura similar a `CarteraDetailModal`, adaptado.
- `VentasServiciosDetalleModal`: reutiliza el mismo componente base.
- Los modales usan `DetailItem` del hook o una interfaz específica.
