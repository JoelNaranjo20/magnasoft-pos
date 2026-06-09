# Implementation Plan: Mejora Visual y de Experiencia de Usuario

**Branch**: `007-mejora-ui-ux` | **Date**: 2026-06-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-mejora-ui-ux/spec.md`

## Summary

Refinamiento visual de toda la aplicación Magnasoft POS sin modificar lógica de negocio, stores, RPC ni estructura de datos. Se aplican mejoras de contraste, jerarquía visual, estados interactivos, consistencia tipográfica y compatibilidad total con tema oscuro a todos los módulos (POS, Finanzas, Admin, Dashboard, Auth/Setup). El alcance es exclusivamente la capa de presentación: clases Tailwind, CSS y reorganización de JSX.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode), React 19.2, Vite 7.2

**Primary Dependencies**: Tailwind CSS 3.4 (desktop), Tailwind CSS 4 (web), Zustand 5 (state), React Router DOM 7, Recharts 3.6, Lucide React 0.469

**Storage**: N/A (solo cambios de presentación, sin modificar persistencia ni RPC)

**Testing**: Verificación visual manual en `electron:dev` + `pnpm build` sin errores

**Target Platform**: Electron 33 (Windows x64), Next.js 16 web portal

**Project Type**: Monorepo — Electron desktop app + Next.js web portal + shared library

**Performance Goals**: 60 fps en animaciones, sin layout shift >0.1s en transiciones de tema

**Constraints**: 
- Cero modificaciones a stores de Zustand, RPC de Supabase, migraciones o lógica de negocio
- Solo cambios en archivos `.tsx` (clases Tailwind + estructura JSX) y `.css`
- Tailwind `dark:` variants para todo lo nuevo/modificado
- Sin introducir librerías UI externas (constitution IV)

**Scale/Scope**: ~70 archivos TSX afectados, ~2 archivos CSS, 6 pantallas principales + modales compartidos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Industry Dynamism | ✅ PASS | No se condiciona por `business_type`. Mejoras visuales genéricas aplican a todos los tipos de negocio. |
| II. Tenant Isolation via RLS | ✅ PASS | Sin cambios a queries ni acceso a datos — solo presentación. |
| III. Spec-Driven Development | ✅ PASS | Siguiendo protocolo SDD: spec → plan → tasks → implement → verify. |
| IV. Store Integrity | ✅ PASS | Sin modificaciones a stores de Zustand. Solo cambios en capa de renderizado. |
| V. TypeScript Strict & Zero Shadowing | ✅ PASS | Se verificará `tsc -b` antes de build. Si se extraen componentes, se usarán tipos estrictos sin `any`. |
| Architecture: Monorepo Structure | ✅ PASS | Cambios en `apps/desktop/`, `apps/shared/`, `apps/web/` respetando dependencias. |
| Architecture: No Custom Backend | ✅ PASS | Sin nuevos servicios ni endpoints. |
| Architecture: Zustand as Single State Manager | ✅ PASS | Sin introducir otras librerías de estado. |
| Architecture: Styling Stack | ✅ PASS | Tailwind + CSS vanilla, sin librerías UI externas. |
| Complexity: YAGNI | ✅ PASS | Sin nuevas abstracciones. Se refactorizan estilos existentes, no se crean nuevos sistemas. |

**GATE RESULT**: ✅ ALL PASS — Procede a Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/007-mejora-ui-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (design tokens)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (component API contracts)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/
├── desktop/
│   └── src/
│       ├── App.css                          # Ajustes globales de animación/transición
│       ├── index.css                        # Refinamiento de custom properties y utilidades
│       ├── components/
│       │   ├── pos/
│       │   │   ├── POSLayout.tsx            # Layout principal del POS
│       │   │   ├── POSTopBar.tsx            # Barra superior (estado turno, negocio)
│       │   │   ├── POSProductGrid.tsx       # Cuadrícula de productos/servicios
│       │   │   ├── POSCart.tsx              # Carrito de venta actual
│       │   │   ├── POSCustomerSection.tsx   # Sección cliente en POS
│       │   │   ├── POSPatio.tsx             # Vista de mesas/patio (restaurante)
│       │   │   └── CategoryTabs.tsx         # Tabs de categorías
│       │   ├── modals/
│       │   │   ├── PaymentModal.tsx         # Modal de pago (95KB, crítico)
│       │   │   ├── CloseSessionModal.tsx    # Cierre de turno
│       │   │   ├── OpenSessionModal.tsx     # Apertura de turno
│       │   │   ├── SaleDetailsModal.tsx     # Detalle de venta
│       │   │   ├── SalesSummaryModal.tsx    # Resumen de ventas
│       │   │   ├── CentralCashModal.tsx     # Caja central
│       │   │   ├── CashMovementModal.tsx    # Movimiento de caja
│       │   │   ├── CashMovementsModal.tsx   # Historial movimientos
│       │   │   ├── CommissionPaymentModal.tsx
│       │   │   ├── CustomerHistoryModal.tsx
│       │   │   ├── CustomerVehicleModal.tsx
│       │   │   ├── EditDebtModal.tsx
│       │   │   ├── EditPriceModal.tsx
│       │   │   ├── ManualRewardModal.tsx
│       │   │   ├── RewardDetailsModal.tsx
│       │   │   ├── ServiceQueueModal.tsx
│       │   │   ├── TableOrderModal.tsx
│       │   │   ├── ConfirmationModal.tsx
│       │   │   ├── ChangeAdminModal.tsx
│       │   │   ├── ChangePasswordModal.tsx
│       │   │   ├── SecurityPinModal.tsx
│       │   │   └── InvitationModal.tsx
│       │   ├── admin/
│       │   │   ├── workers/
│       │   │   │   ├── WorkerManager.tsx
│       │   │   │   ├── WorkerList.tsx
│       │   │   │   ├── WorkerForm.tsx
│       │   │   │   ├── WorkerModal.tsx
│       │   │   │   └── WorkerPaymentCalculator.tsx
│       │   │   ├── config/
│       │   │   │   ├── GeneralSettings.tsx
│       │   │   │   ├── CategoriesSettings.tsx
│       │   │   │   ├── DiscountSettings.tsx
│       │   │   │   ├── LoyaltySettings.tsx
│       │   │   │   ├── RoleManager.tsx
│       │   │   │   ├── CustomerManager.tsx
│       │   │   │   ├── CustomerCreateModal.tsx
│       │   │   │   ├── CustomerEditModal.tsx
│       │   │   │   ├── CustomerUnify.tsx
│       │   │   │   └── CustomerVehicleManagerModal.tsx
│       │   │   ├── services/
│       │   │   │   ├── ServiceManager.tsx
│       │   │   │   ├── ServiceList.tsx
│       │   │   │   └── ServiceForm.tsx
│       │   │   ├── products/
│       │   │   │   ├── ProductStockManager.tsx
│       │   │   │   └── InternalUseModal.tsx
│       │   │   ├── sessions/
│       │   │   │   └── SessionHistory.tsx
│       │   │   └── audit/
│       │   │       ├── AnnualDeletionModal.tsx
│       │   │       └── MonthlyReportView.tsx
│       │   ├── finance/
│       │   │   ├── CarteraHub.tsx            # Cartera de clientes
│       │   │   ├── CreditManagement.tsx      # Gestión de créditos
│       │   │   ├── CashierStatus.tsx         # Estado de cajero
│       │   │   ├── CentralCash.tsx           # Caja central
│       │   │   └── WorkerLoans.tsx           # Préstamos a trabajadores
│       │   ├── dashboard/
│       │   │   ├── OperationalSummary.tsx
│       │   │   ├── DynamicOperationalWidgets.tsx
│       │   │   ├── DashboardSettings.tsx
│       │   │   └── CategorySalesSummary.tsx
│       │   ├── auth/
│       │   │   ├── AuthProvider.tsx
│       │   │   ├── AdminGuard.tsx
│       │   │   └── ConfigGuard.tsx
│       │   ├── inventory/
│       │   │   └── CategoryManager.tsx
│       │   ├── common/
│       │   │   └── CategorySelect.tsx
│       │   ├── ui/
│       │   │   ├── IconSelector.tsx
│       │   │   └── Pagination.tsx
│       │   └── UpdateNotification.tsx
│       └── pages/
│           ├── SalesPage.tsx
│           ├── FinancePage.tsx
│           ├── FinanceDashboard.tsx
│           ├── CustomersPage.tsx
│           ├── PayrollPage.tsx
│           ├── InventoryPage.tsx
│           ├── admin/
│           │   ├── AdminDashboard.tsx
│           │   ├── ConfigPage.tsx
│           │   └── AuditPage.tsx
│           ├── auth/
│           │   ├── LoginPage.tsx
│           │   ├── ResetPasswordPage.tsx
│           │   └── ApprovalPendingPage.tsx
│           └── setup/
│               └── DesktopSetup.tsx
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   │   └── Pagination.tsx
│   │   ├── modals/
│   │   │   ├── SaleDetailsModal.tsx
│   │   │   ├── SalesSummaryModal.tsx
│   │   │   ├── CashMovementsModal.tsx
│   │   │   ├── RewardDetailsModal.tsx
│   │   │   ├── StrategyModal.tsx
│   │   │   └── WhatsNewModal.tsx
│   │   └── dashboard/
│   │       ├── BusinessEvolution.tsx
│   │       └── OperationalSummary.tsx
│   └── features/
│       ├── admin/
│       │   └── AdminDashboard.tsx
│       ├── dashboard/
│       │   └── Dashboard.tsx
│       └── sales/
│           └── Sales.tsx
└── web/
    └── src/                                  # Portal web (si tiene componentes propios)
```

**Structure Decision**: Se usa la estructura existente del monorepo. Los archivos afectados están en `apps/desktop/src/`, `apps/shared/`, y `apps/web/src/`. El plan prioriza por pantalla (POS primero, finanzas, admin, dashboard, auth) y agrupa cambios por archivo para minimizar conflictos.

## Complexity Tracking

> No hay violaciones a la constitución. No se requiere justificación adicional.

| Aspect | Justificación |
|--------|--------------|
| Sin nuevas librerías UI | La constitución prohíbe MUI, Chakra, Ant, shadcn/ui. Se usa Tailwind puro + CSS. |
| Sin nuevas abstracciones | YAGNI — los patrones existentes (Tailwind classes, CSS utilities) bastan. |
| Sin cambios en shared stores | FR-015 restringe explícitamente a capa de presentación. |
