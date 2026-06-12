# Tasks: Analytics de Ventas por CategorÃ­a y Servicio en Caja Central

**Input**: Design documents from `specs/009-central-cash-analytics/`

**Prerequisites**: plan.md âœ…, spec.md âœ… (clarified v2)

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup â€” Hook compartido en @shared/logic

**Purpose**: Mover `useCentralCash` a `apps/shared/` para que desktop y web compartan la misma lÃ³gica.

- [X] T001 Mover `apps/desktop/src/hooks/useCentralCash.ts` a `apps/shared/hooks/useCentralCash.ts` â€” copiar archivo con toda su lÃ³gica (balances, monthlySummary, backfill, analytics)
- [X] T002 [P] Actualizar imports en `apps/desktop/src/components/finance/CentralCash.tsx` â€” cambiar `from '../../hooks/useCentralCash'` a `from '@shared/hooks/useCentralCash'`
- [X] T003 [P] Actualizar imports en `apps/desktop/src/components/modals/CloseSessionModal.tsx` si usa `CentralCashMetadata` â€” verificar que el tipo se importa desde shared
- [X] T004 [P] Agregar `useCentralCash` al barrel export de `@shared/logic` si existe, o crear `apps/shared/index.ts` que lo re-exporte

**Checkpoint**: Desktop compila sin errores usando el hook desde shared.

---

## Phase 2: US1 â€” Modal de Analytics de Ventas (Priority: P1)

**Goal**: En Total General expandido, secciÃ³n compacta "ðŸ“Š Ventas por CategorÃ­a" con top 5 + botÃ³n "Ver detalle completo" que abre modal con desagregaciÃ³n por servicio.

- [X] T005 [US1] Agregar funciÃ³n `fetchCategorySales(month: string)` en `apps/shared/hooks/useCentralCash.ts` â€” consulta `sales` + `sale_items` + `services` + `products` + `categories` para el mes, agrupa por categorÃ­a y servicio, retorna array ordenado por monto descendente
- [X] T006 [US1] Crear componente `CategorySalesModal.tsx` en `apps/shared/components/modals/` â€” modal que recibe: `month` (string), `isOpen`, `onClose`, `categoryData` (array de categorÃ­as con servicios). Muestra total del mes, acordeones por categorÃ­a con lista de servicios (nombre, cantidad, monto, precio promedio)
- [X] T007 [US1] Agregar resumen compacto "ðŸ“Š Ventas por CategorÃ­a" en `apps/desktop/src/components/finance/CentralCash.tsx` dentro del acordeÃ³n del mes expandido â€” muestra top 5 categorÃ­as con nombre, monto y % del total
- [X] T008 [US1] Agregar botÃ³n "Ver detalle completo â†’" en la secciÃ³n compacta que abre `CategorySalesModal` con los datos completos del mes
- [X] T009 [US1] Agregar estado `categorySalesData` y `isCategoryModalOpen` en `CentralCash.tsx` â€” al expandir un mes, cargar datos de analytics para ese mes

**Checkpoint**: Expandir mes â†’ ver top 5 categorÃ­as â†’ clic en "Ver detalle" â†’ modal con desagregaciÃ³n completa.

---

## Phase 3: US2 â€” Caja Central en MÃ³dulo Web (Priority: P1)

**Goal**: Portal web (`apps/web`) tiene Caja Central idÃ©ntica al desktop: 3 tabs, resumen mensual, formulario, modal analytics.

- [X] T010 [US2] Crear componente `CentralCashPage.tsx` en `apps/web/src/components/` â€” mismo diseÃ±o que desktop adaptado a Next.js (3 tabs, hero card, formulario con payment_method, lista de movimientos, resumen mensual, botÃ³n backfill, modal analytics)
- [X] T011 [US2] Crear pÃ¡gina `apps/web/src/app/(dashboard)/dashboard/central-cash/page.tsx` â€” renderiza `CentralCashPage` con layout de dashboard
- [X] T012 [P] [US2] Agregar entrada de navegaciÃ³n en el sidebar/dashboard layout de web para "Caja Central" con Ã­cono `account_balance`
- [X] T013 [P] [US2] Verificar que `apps/web/package.json` tiene `@shared/logic: workspace:*` como dependencia para acceder al hook
- [X] T014 [US2] Verificar visualmente el componente web en `pnpm dev` (desktop: `electron:dev`) â€” confirmar que los 3 tabs muestran datos correctos, formulario funciona, modal analytics abre

**Checkpoint**: Navegar a /dashboard/central-cash en web â†’ ver Caja Central funcional idÃ©ntica al desktop.

---

## Phase 4: Polish & Build

- [X] T015 [P] Ejecutar `pnpm build` en `apps/desktop/` â€” verificar cero errores
- [X] T016 [P] Ejecutar `pnpm build` en `apps/web/` â€” verificar cero errores
- [X] T017 Verificar no regresiÃ³n: abrir desktop, cerrar turno de prueba, confirmar que Caja Central recibe el movimiento, abrir analytics del mes, confirmar categorÃ­as y servicios correctos

---

## Dependencies & Execution Order

- **Phase 1** â†’ Sin dependencias. BLOQUEA todo lo demÃ¡s.
- **Phase 2** â†’ Depende de Phase 1 (hook en shared). Independiente de Phase 3.
- **Phase 3** â†’ Depende de Phase 1 (hook en shared). Puede ejecutarse en paralelo con Phase 2.
- **Phase 4** â†’ Depende de Phase 2 + Phase 3 completadas.

### Parallel Opportunities

- **T002 + T003 + T004**: Paralelo (imports en archivos distintos)
- **Phase 2 + Phase 3**: Pueden ejecutarse en paralelo completo (diferentes archivos, mismo hook shared)
- **T015 + T016**: Paralelo (builds independientes)

---

## Implementation Strategy

### MVP (US1 only)

1. Phase 1: Mover hook a shared (T001-T004)
2. Phase 2: Modal analytics (T005-T009)
3. Build desktop, verificar

### Full Delivery

1. Phase 1 â†’ Phase 2 â†’ Phase 3 en paralelo â†’ Phase 4
2. Build ambos, verificar

---

## Notes

- Sin migraciones SQL nuevas
- Los datos de analytics se cachean por mes en estado local (no se re-fetchean al re-expandir)
- El modal de analytics se reutiliza idÃ©ntico en desktop y web (estÃ¡ en `apps/shared/`)
- Las categorÃ­as sin servicios vendidos en el mes no aparecen
