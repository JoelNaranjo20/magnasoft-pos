# Quickstart: Modales Drill-Down Caja Central

**Feature**: `011-central-cash-drilldown` | **Date**: 2026-06-12

## Prerequisites

- `pnpm install` al día
- Supabase corriendo con migraciones al día
- Feature `010-central-cash-dashboard` implementada (dashboard base)

## Development

```bash
# Desktop
cd apps/desktop && pnpm electron:dev

# Web
cd apps/web && pnpm dev
```

## Verification Checklist

### Drill-Down Efectivo/Transferencia

- [ ] Clic en "Efectivo Disponible" → modal con ingresos/egresos del mes en efectivo
- [ ] Clic en "Transferencia Disponible" → modal con ingresos/egresos del mes en transferencia
- [ ] Neto del modal coincide con el KPI del dashboard
- [ ] Sin movimientos → muestra "Sin movimientos este mes"

### Nómina

- [ ] Clic en "Total Nómina" → modal con Total General = Semanal + Liquidaciones
- [ ] Sección "Nómina Semanal" muestra semanas correctas + trabajadores asalariados
- [ ] Sección "Liquidaciones Diarias" muestra comisionistas con total y cantidad
- [ ] Trabajador con salario + comisiones → aparece en ambas secciones
- [ ] Sin asalariados → mensaje descriptivo
- [ ] Sin comisionistas → mensaje descriptivo

### Cartera

- [ ] Clic en "Cartera Total" → modal con clientes ordenados por deuda
- [ ] Clic en "Recuperación Efectivo" → modal con abonos en efectivo del mes
- [ ] Clic en "Recuperación Transferencia" → modal con abonos transferencia del mes
- [ ] Sin deudas/abonos → mensaje descriptivo

### Cross-Platform

- [ ] Desktop y web muestran los mismos modales con los mismos datos
- [ ] Cambiar de negocio refresca los datos de los modales

### Performance

- [ ] Cada modal abre en <1s tras el clic
- [ ] Skeleton/spinner visible mientras carga

## Key Files

| File | Role |
|------|------|
| `apps/shared/hooks/useCentralCash.ts` | Datos computados para modales |
| `apps/shared/components/modals/EfectivoTransferenciaDetailModal.tsx` | Drill-down Efectivo/Transferencia |
| `apps/shared/components/modals/NominaDetailModal.tsx` | Nómina Semanal + Liquidaciones Diarias |
| `apps/shared/components/modals/CarteraDetailModal.tsx` | Cartera 3 modos |
| `apps/shared/components/modals/CashDashboardDetailModal.tsx` | Extendido (showIncomes) |
| `apps/desktop/src/components/finance/CentralCash.tsx` | Conectar KPIs → modales |
| `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` | Conectar KPIs → modales |
