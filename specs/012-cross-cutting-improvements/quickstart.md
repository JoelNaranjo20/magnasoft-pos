# Quickstart: Mejoras Transversales

**Feature**: `012-cross-cutting-improvements` | **Date**: 2026-06-15

## Prerequisites

- `pnpm install` al día
- Supabase corriendo con migraciones al día
- Dashboard `010` y drill-down `011` implementados

## Migration

```bash
# Aplicar nueva migración de puntos
cd supabase
supabase db push
```

## Development

```bash
# Desktop
cd apps/desktop && pnpm electron:dev

# Web
cd apps/web && pnpm dev
```

## Verification Checklist

### US1 — Consumo Interno

- [ ] En inventario, seleccionar producto → botón "Consumo Interno"
- [ ] Modal muestra: producto, stock actual, costo promedio, precio venta
- [ ] Ingresar cantidad → confirmar
- [ ] Stock descuenta correctamente
- [ ] Aparece egreso en `cash_movements` con costo promedio × cantidad
- [ ] Sin stock suficiente → error

### US2 — Puntos

- [ ] Cliente con 6+ meses sin actividad → puntos expiran (status=expired)
- [ ] Cliente canjea puntos → `last_activity_at` se actualiza
- [ ] Cliente acumula puntos por compra → `last_activity_at` se actualiza
- [ ] Puntos expirados no disponibles para canje
- [ ] Tabla `customer_loyalty_points` tiene los campos correctos

### US3 — Caja Central 2 Columnas

- [ ] Clic en "Ver Historial Completo" → modal con nueva vista
- [ ] Columna izq: Ingresos Efectivo con lista y total
- [ ] Columna der: Ingresos Transferencia con lista y total
- [ ] Egresos con lista y total
- [ ] Ventas por Categoría con progress bars
- [ ] Servicios Vendidos con cantidad (no monto)
- [ ] Neto del mes = Balance Total del KPI

### Cross-Platform

- [ ] Desktop y web: consumo interno funciona en ambos
- [ ] Desktop y web: modal de historial 2 columnas idéntico

## Key Files

| File | Role |
|------|------|
| `supabase/migrations/20260615_add_loyalty_points.sql` | Nueva tabla loyalty |
| `apps/shared/hooks/useCentralCash.ts` | `serviceSalesCount` |
| `apps/shared/components/modals/CentralCashHistoryModal.tsx` | REWRITE: 2 columnas |
| `apps/desktop/src/components/finance/InventoryInternalConsumptionModal.tsx` | Modal consumo |
| `apps/desktop/src/components/finance/CentralCash.tsx` | Conectar nuevo modal |
| `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` | Conectar nuevo modal |
