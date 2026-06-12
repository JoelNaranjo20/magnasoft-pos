# Quickstart: Dashboard Financiero de Caja Central

**Feature**: `010-central-cash-dashboard`
**Date**: 2026-06-12

## Prerequisites

- `pnpm install` ejecutado en raíz del monorepo
- Supabase local o remoto corriendo con migraciones al día
- Electron 30+ (desktop), Node 20+ (web)

## Development

### Desktop

```bash
cd apps/desktop
pnpm electron:dev
```

Esto arranca:
- Vite dev server en `localhost:5173`
- Electron window con hot reload
- Supabase client apuntando a la URL configurada en `.env.local`

Navegar a la sección de Finanzas → Caja Central para ver el dashboard.

### Web

```bash
cd apps/web
pnpm dev
```

Abrir `http://localhost:3000/dashboard/finanzas` en el navegador.

## Verification Checklist

### Dashboard Principal

- [ ] Columna izquierda muestra Balance Total (grande), Efectivo, Transferencia
- [ ] Botón "+ Nuevo Movimiento" visible bajo los KPIs de efectivo/transferencia
- [ ] Columna derecha muestra Resumen Operativo con Total Servicios, Egresos, Liquidaciones
- [ ] Card de Cartera muestra Cartera Total, Recuperación Efectivo, Recuperación Transferencia
- [ ] Card de Total Nómina visible (si `module_payroll` activo)

### Modales

- [ ] Clic en "+ Nuevo Movimiento" → abre modal con formulario (tipo, monto, método de pago, descripción)
- [ ] Clic en "Total Servicios" → abre CategorySalesModal con desglose por categoría/servicio
- [ ] Clic en "Egresos" → abre modal con detalle de movimientos de egreso del mes
- [ ] Clic en "Liquidaciones" → abre modal con detalle de comisiones pagadas del mes
- [ ] Clic en "Ver Historial" → abre modal con acordeones mensuales (Entradas/Gastos/Neto)

### Sistema de Módulos

- [ ] Si `module_customers = false` → Card de Cartera oculta
- [ ] Si `module_commissions = false` → "Liquidaciones" oculto (respetando espacio en Resumen Operativo)
- [ ] Si `module_payroll = false` → Card de Nómina oculta

### Multi-Tenant

- [ ] Cambiar de negocio → dashboard refresca todos los KPIs automáticamente
- [ ] Los datos corresponden al negocio seleccionado (no hay fuga cross-tenant)

### Cross-Platform

- [ ] Desktop (Electron) y Web (Next.js) muestran layout idéntico
- [ ] Ambos comparten el mismo hook `useCentralCash` desde `@shared/hooks/`

### Estados Edge

- [ ] Negocio sin sesiones cerradas en el mes → Total Servicios = $0
- [ ] Negocio sin deudas → Cartera Total = $0, Recuperación = $0
- [ ] Negocio sin trabajadores → Total Nómina = $0
- [ ] Error de red → cada KPI muestra estado de error individual, no bloquea el dashboard

## Key Files

| File | Role |
|------|------|
| `apps/shared/hooks/useCentralCash.ts` | Hook compartido con todos los datos del dashboard |
| `apps/shared/components/modals/CentralCashHistoryModal.tsx` | Modal de historial mensual |
| `apps/shared/components/modals/CashDashboardDetailModal.tsx` | Modal genérico de detalle (Egresos, Liquidaciones) |
| `apps/shared/components/modals/CategorySalesModal.tsx` | Modal de analytics (Total Servicios) — ya existe |
| `apps/desktop/src/components/finance/CentralCash.tsx` | Dashboard principal (desktop) |
| `apps/desktop/src/components/finance/CentralCashMovementModal.tsx` | Modal formulario ingreso/egreso (desktop) |
| `apps/web/app/(dashboard)/dashboard/finanzas/page.tsx` | Dashboard principal (web) |
