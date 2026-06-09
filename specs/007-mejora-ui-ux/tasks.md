# Tasks: Mejora Visual y de Experiencia de Usuario

**Input**: Design documents from `specs/007-mejora-ui-ux/`

**Prerequisites**: plan.md âœ…, spec.md âœ…, research.md âœ…, data-model.md âœ…, contracts/ âœ…

**Tests**: No se solicitan tests automatizados. VerificaciÃ³n visual manual en `pnpm electron:dev`.

**Organization**: 6 user stories en orden de prioridad (P1 â†’ P3). Cada fase es independiente y agrega valor incremental.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: User story correspondiente (US1, US2, US3, US4, US5, US6)
- Las rutas son relativas a la raÃ­z del monorepo

---

## Phase 1: Setup â€” Infraestructura Visual Base

**Purpose**: Preparar tokens de diseÃ±o CSS, utilidades globales y verificar que la base de estilos estÃ¡ lista para la aplicaciÃ³n consistente en todos los mÃ³dulos.

- [X] T001 Refinar custom properties y utilidades CSS globales en `apps/desktop/src/index.css` â€” agregar animaciones `animate-in` consistentes con `duration-200` y `duration-300`, refinar glassmorphism y custom-scrollbar para dark mode completo
- [X] T002 [P] Agregar utilidades de skeleton/loading y estados vacÃ­os en `apps/desktop/src/index.css` â€” clases `.skeleton`, `.skeleton-text`, `.empty-state` con variantes dark
- [X] T003 [P] Crear constantes de paleta semÃ¡ntica documentadas como comentario en `apps/desktop/src/index.css` â€” mapeo completo de tokens de color (success/danger/warning/info/primary/neutros) con valores light y dark

**Checkpoint**: Base CSS lista. Todos los componentes nuevos usarÃ¡n estas utilidades.

---

## Phase 2: Foundational â€” Contratos de Componentes Compartidos

**Purpose**: Establecer los patrones visuales base que TODOS los user stories consumirÃ¡n. Sin esta fase, cada pantalla usarÃ­a estilos inconsistentes.

**âš ï¸ CRITICAL**: Los contratos de Button, Input, Card, Modal, Table, Badge deben aplicarse a los componentes compartidos antes de empezar con las pantallas especÃ­ficas.

- [X] T004 Refinar botones en `apps/desktop/src/components/modals/ConfirmationModal.tsx` â€” aplicar contrato de Primary Button, Secondary Button y Danger Button con 5 estados (normal, hover, focus, active, disabled) y variantes dark
- [X] T005 [P] Aplicar contrato de Modal a `apps/desktop/src/components/modals/ConfirmationModal.tsx` â€” estructura header/body/footer, overlay `bg-black/60 backdrop-blur-sm`, borde `border-slate-200 dark:border-slate-700`, sombra `shadow-2xl`
- [X] T006 [P] Refinar componente de paginaciÃ³n compartido en `apps/shared/components/ui/Pagination.tsx` con estados de botÃ³n, espaciado consistente y dark mode
- [X] T007 [P] Refinar componente de paginaciÃ³n local en `apps/desktop/src/components/ui/Pagination.tsx` con los mismos patrones que el shared (si difiere)
- [X] T008 [P] Aplicar contrato de Badge/Status en `apps/desktop/src/components/modals/SaleDetailsModal.tsx` â€” badges de mÃ©todo de pago, estado de venta con colores semÃ¡nticos
- [X] T009 [P] Aplicar contrato de Badge/Status en `apps/shared/components/modals/SaleDetailsModal.tsx` â€” igual que T008 para la versiÃ³n shared

**Checkpoint**: Contratos base aplicados. Los componentes compartidos ya siguen el sistema de diseÃ±o. Se puede proceder a las pantallas especÃ­ficas.

---

## Phase 3: User Story 1 â€” Mejora Visual del Punto de Venta (Priority: P1) ðŸŽ¯ MVP

**Goal**: El cajero ve una interfaz de POS con jerarquÃ­a visual clara, contraste mejorado, estados interactivos obvios en productos, carrito y modal de pago. La informaciÃ³n crÃ­tica (total, mÃ©todo de pago) es legible de un vistazo.

**Independent Test**: Abrir el POS, verificar que botones de producto tienen hover/selected claros, el carrito muestra total prominente, el modal de pago tiene mÃ©todo activo resaltado y estados de carga/error definidos. Navegar entre categorÃ­as y verificar transiciones suaves.

### Implementation for User Story 1

- [X] T010 [US1] Mejorar barra superior del POS en `apps/desktop/src/components/pos/POSTopBar.tsx` â€” refinar indicadores de turno abierto/cerrado con colores semÃ¡nticos, reloj legible, botones de acciÃ³n con estados hover/focus
- [X] T011 [P] [US1] Refinar tabs de categorÃ­as en `apps/desktop/src/components/pos/CategoryTabs.tsx` â€” estado selected con `ring-2 ring-primary bg-primary/5`, hover con transiciÃ³n suave, scroll horizontal con gradiente de fade en bordes
- [X] T012 [P] [US1] Mejorar cuadrÃ­cula de productos en `apps/desktop/src/components/pos/POSProductGrid.tsx` â€” cards de producto con 3 estados (normal/hover/selected), badge de precio prominente, Ã­cono de categorÃ­a coloreado, skeleton loading mientras carga
- [X] T013 [P] [US1] Refinar carrito de venta en `apps/desktop/src/components/pos/POSCart.tsx` â€” total con `text-3xl font-black`, items con hover y botÃ³n de eliminar sutil, badge de cantidad, secciÃ³n de cliente asignado con card semÃ¡ntica, botÃ³n de cobrar con `bg-primary` y estado loading
- [X] T014 [P] [US1] Mejorar secciÃ³n de cliente en POS en `apps/desktop/src/components/pos/POSCustomerSection.tsx` â€” card con borde sutil, avatar/Ã­cono, nombre y placa destacados, botÃ³n de cambiar con ghost button
- [X] T015 [P] [US1] Refinar vista de mesas/patio en `apps/desktop/src/components/pos/POSPatio.tsx` â€” cards de mesa con estado ocupada/libre usando colores semÃ¡nticos (emerald/rose/slate), animaciÃ³n de transiciÃ³n al cambiar estado
- [X] T016 [US1] Mejorar layout principal del POS en `apps/desktop/src/components/pos/POSLayout.tsx` â€” espaciado consistente entre secciones (`gap-4`), fondo con `bg-slate-100 dark:bg-slate-900`, panel derecho con `bg-white dark:bg-slate-800`
- [X] T017 [US1] Refinar modal de pago en `apps/desktop/src/components/modals/PaymentModal.tsx` â€” aplicar contrato de Modal (header/body/footer), mÃ©todos de pago con estado selected obvio (`ring-2 ring-primary`), total restante con animaciÃ³n de cambio, botones de acciÃ³n con estados, secciÃ³n de cambio cruzado y propinas con bordes semÃ¡nticos

**Checkpoint**: POS completamente refinado. El cajero puede operar con claridad visual en tema claro y oscuro.

---

## Phase 4: User Story 2 â€” Mejora Visual de Finanzas y Caja (Priority: P1)

**Goal**: El administrador y cajero ven las pantallas de finanzas con nÃºmeros legibles, ingresos/egresos claramente diferenciados por color, y el cierre de caja muestra el descuadre de forma obvia e intuitiva.

**Independent Test**: Abrir cada pantalla de finanzas (CarteraHub, Caja Central, Caja), verificar colores semÃ¡nticos en montos, tablas con filas alternas y hover, modal de cierre con tarjetas de conciliaciÃ³n claras.

### Implementation for User Story 2

- [X] T018 [US2] Refinar cartera de clientes en `apps/desktop/src/components/finance/CarteraHub.tsx` â€” tabla con contrato unificado (header sticky, filas alternas, hover), badges de estado de deuda (al dÃ­a/prÃ³ximo/vencido) con colores semÃ¡nticos, cards de resumen con KPI numÃ©rico grande
- [X] T019 [P] [US2] Mejorar caja central en `apps/desktop/src/components/finance/CentralCash.tsx` â€” ingresos/egresos con `text-emerald-600`/`text-rose-600` y dark variants, tabla de movimientos con contrato unificado, badge `+`/`âˆ’` con Ã­cono direccional
- [X] T020 [P] [US2] Refinar estado de cajero en `apps/desktop/src/components/finance/CashierStatus.tsx` â€” card de estado con color semÃ¡ntico (abierto/cerrado), monto en caja con `text-3xl font-black`, botones de acciÃ³n con estados completos
- [X] T021 [P] [US2] Mejorar prÃ©stamos a trabajadores en `apps/desktop/src/components/finance/WorkerLoans.tsx` â€” tabla con contrato unificado, badges de estado de prÃ©stamo (pendiente/pagado), montos con alineaciÃ³n derecha y `tabular-nums`
- [X] T022 [P] [US2] Refinar gestiÃ³n de crÃ©ditos en `apps/desktop/src/components/finance/CreditManagement.tsx` â€” cards de crÃ©dito con colores semÃ¡nticos por estado, tabla de pagos con contrato unificado
- [X] T023 [US2] Refinar modal de cierre de turno en `apps/desktop/src/components/modals/CloseSessionModal.tsx` â€” tarjeta de conciliaciÃ³n con hero metric para total en caja, ingresos (emerald) y egresos (rose) en cards separadas, descuadre con `bg-amber-50 dark:bg-amber-950/20` y texto descriptivo
- [X] T024 [P] [US2] Mejorar modal de apertura de turno en `apps/desktop/src/components/modals/OpenSessionModal.tsx` â€” input de base inicial con estados (normal/focus/error), teclado numÃ©rico con botones de hover/active claros
- [X] T025 [P] [US2] Refinar modales de caja central en `apps/desktop/src/components/modals/CentralCashModal.tsx` y `apps/desktop/src/components/modals/CashMovementModal.tsx` â€” aplicar contrato de Modal unificado, inputs con estados, botones de acciÃ³n con colores semÃ¡nticos
- [X] T026 [P] [US2] Mejorar historial de movimientos de caja en `apps/shared/components/modals/CashMovementsModal.tsx` y `apps/desktop/src/components/modals/CashMovementsModal.tsx` â€” tabla con contrato unificado, badges `+`/`âˆ’`, filtros con diseÃ±o consistente
- [X] T027 [P] [US2] Refinar modal de pago de comisiones en `apps/desktop/src/components/modals/CommissionPaymentModal.tsx` â€” cards de trabajador con monto destacado, botÃ³n de liquidar con estado loading
- [X] T028 [P] [US2] Mejorar modal de ediciÃ³n de deuda en `apps/desktop/src/components/modals/EditDebtModal.tsx` â€” inputs con estados completos, botones de acciÃ³n con contrato, espaciado consistente

**Checkpoint**: MÃ³dulo de finanzas completamente refinado. NÃºmeros legibles, colores semÃ¡nticos, descuadres obvios.

---

## Phase 5: User Story 3 â€” Mejora Visual de AdministraciÃ³n y ConfiguraciÃ³n (Priority: P2)

**Goal**: Los administradores usan formularios con estados de campo claros, tablas con mejor legibilidad, y modales de confirmaciÃ³n con jerarquÃ­a visual que guÃ­a la acciÃ³n correcta.

**Independent Test**: Navegar por cada secciÃ³n de admin (trabajadores, servicios, productos, clientes, configuraciÃ³n), verificar formularios con estados de validaciÃ³n, tablas con filas alternas y hover, modales de confirmaciÃ³n con botones semÃ¡nticos.

### Implementation for User Story 3

- [X] T029 [US3] Refinar gestiÃ³n de trabajadores en `apps/desktop/src/components/admin/workers/WorkerManager.tsx` â€” layout de pÃ¡gina con tÃ­tulo y botÃ³n de acciÃ³n, tabla de workers con contrato unificado
- [X] T030 [P] [US3] Mejorar lista de trabajadores en `apps/desktop/src/components/admin/workers/WorkerList.tsx` â€” filas con hover, avatar/Ã­cono por worker, badges de rol, botones de acciÃ³n con ghost button
- [X] T031 [P] [US3] Refinar formulario de trabajador en `apps/desktop/src/components/admin/workers/WorkerForm.tsx` â€” inputs con contrato unificado (label, focus ring, error state, hint), selects con estilo consistente
- [X] T032 [P] [US3] Mejorar modal de trabajador en `apps/desktop/src/components/admin/workers/WorkerModal.tsx` â€” aplicar contrato de Modal, campos con estados de validaciÃ³n
- [X] T033 [P] [US3] Refinar calculadora de pagos en `apps/desktop/src/components/admin/workers/WorkerPaymentCalculator.tsx` â€” cards de resumen con KPI, tabla de detalle con contrato unificado
- [X] T034 [P] [US3] Mejorar gestiÃ³n de servicios en `apps/desktop/src/components/admin/services/ServiceManager.tsx`, `ServiceList.tsx`, `ServiceForm.tsx` â€” tabla con contrato, formulario con estados de campo, cards de categorÃ­a con selecciÃ³n visual
- [X] T035 [P] [US3] Refinar gestiÃ³n de productos en `apps/desktop/src/components/admin/products/ProductStockManager.tsx` â€” tabla de stock con niveles bajos en `text-amber-600`, inputs de cantidad con estados
- [X] T036 [P] [US3] Mejorar modal de uso interno en `apps/desktop/src/components/admin/products/InternalUseModal.tsx` â€” aplicar contrato de Modal, inputs con estados
- [X] T037 [P] [US3] Refinar gestiÃ³n de clientes en `apps/desktop/src/components/admin/config/CustomerManager.tsx` â€” tabla con contrato unificado, barra de bÃºsqueda con estados
- [X] T038 [P] [US3] Mejorar modales de cliente en `apps/desktop/src/components/admin/config/CustomerCreateModal.tsx`, `CustomerEditModal.tsx` â€” aplicar contrato de Modal, formulario con estados de validaciÃ³n
- [X] T039 [US3] Refinar unificador de clientes en `apps/desktop/src/components/admin/config/CustomerUnify.tsx` â€” cards de selecciÃ³n (principal: borde emerald, secundario: borde amber), preview modal con colores organizados, botÃ³n de unificar con danger button
- [X] T040 [P] [US3] Mejorar modal de vehÃ­culos de cliente en `apps/desktop/src/components/admin/config/CustomerVehicleManagerModal.tsx` â€” tabla con contrato, inputs con estados
- [X] T041 [P] [US3] Refinar pantalla de configuraciÃ³n general en `apps/desktop/src/components/admin/config/GeneralSettings.tsx` â€” secciones con cards, switches/toggles con estados, inputs con contrato
- [X] T042 [P] [US3] Mejorar sub-pantallas de config en `apps/desktop/src/components/admin/config/CategoriesSettings.tsx`, `DiscountSettings.tsx`, `LoyaltySettings.tsx` â€” consistencia con GeneralSettings
- [X] T043 [P] [US3] Refinar gestor de roles en `apps/desktop/src/components/admin/config/RoleManager.tsx` â€” tabla de permisos con badges, toggles con estados
- [X] T044 [P] [US3] Mejorar historial de sesiones en `apps/desktop/src/components/admin/sessions/SessionHistory.tsx` â€” tabla con contrato, badges de estado de sesiÃ³n, filtros de fecha con diseÃ±o consistente
- [X] T045 [P] [US3] Refinar pÃ¡ginas de auditorÃ­a en `apps/desktop/src/components/admin/audit/AnnualDeletionModal.tsx`, `MonthlyReportView.tsx` â€” aplicar contrato de Modal, tabla con contrato
- [X] T046 [P] [US3] Mejorar gestor de categorÃ­as de inventario en `apps/desktop/src/components/inventory/CategoryManager.tsx` â€” cards de categorÃ­a con estados, inputs con contrato
- [X] T047 [P] [US3] Refinar selector de categorÃ­a compartido en `apps/desktop/src/components/common/CategorySelect.tsx` â€” dropdown con opciones hover, selected state

**Checkpoint**: MÃ³dulo de administraciÃ³n completamente refinado. Formularios con validaciÃ³n visual, tablas legibles, modales consistentes.

---

## Phase 6: User Story 4 â€” Mejora Visual del Dashboard y Reportes (Priority: P2)

**Goal**: El dashboard presenta datos con tarjetas de KPI de buena jerarquÃ­a, grÃ¡ficos legibles con colores distinguibles, y filtros de fecha intuitivos.

**Independent Test**: Abrir dashboard, verificar KPIs con valor grande y variaciÃ³n porcentual, grÃ¡ficos con colores distinguibles, cambiar perÃ­odo y verificar transiciÃ³n suave.

### Implementation for User Story 4

- [X] T048 [US4] Refinar dashboard principal en `apps/shared/features/dashboard/Dashboard.tsx` â€” KPI cards con `text-3xl font-black`, variaciÃ³n con Ã­cono direccional y color semÃ¡ntico, espaciado `gap-4` entre cards
- [X] T049 [P] [US4] Mejorar dashboard admin en `apps/shared/features/admin/AdminDashboard.tsx` y `apps/desktop/src/pages/admin/AdminDashboard.tsx` â€” consistencia con dashboard principal, mÃ©tricas de negocio con hero numbers
- [X] T050 [P] [US4] Refinar grÃ¡fico de evoluciÃ³n del negocio en `apps/shared/components/dashboard/BusinessEvolution.tsx` â€” colores de serie distinguibles (paleta accesible), tooltips con `bg-white dark:bg-slate-800 shadow-lg rounded-lg`, leyendas ordenadas
- [X] T051 [P] [US4] Mejorar resumen operativo en `apps/shared/components/dashboard/OperationalSummary.tsx` â€” cards de mÃ©tricas con hero numbers, colores semÃ¡nticos por tipo de mÃ©trica
- [X] T052 [P] [US4] Mejorar resumen operativo local en `apps/desktop/src/components/dashboard/OperationalSummary.tsx` â€” consistencia con versiÃ³n shared, dark mode completo
- [X] T053 [P] [US4] Refinar widgets operativos dinÃ¡micos en `apps/desktop/src/components/dashboard/DynamicOperationalWidgets.tsx` â€” cards de widget con estados, animaciÃ³n de entrada sutil
- [X] T054 [P] [US4] Mejorar resumen de ventas por categorÃ­a en `apps/desktop/src/components/dashboard/CategorySalesSummary.tsx` â€” grÃ¡fico/barras con colores por categorÃ­a, tabla resumen con contrato
- [X] T055 [P] [US4] Refinar settings de dashboard en `apps/desktop/src/components/dashboard/DashboardSettings.tsx` â€” toggles con estados, layout de opciones con cards
- [X] T056 [P] [US4] Mejorar pantalla de ventas (historial + evoluciÃ³n) en `apps/shared/features/sales/Sales.tsx` â€” tabla de ventas con contrato unificado, filtros de fecha con diseÃ±o consistente, conciliaciÃ³n con tarjetas semÃ¡nticas
- [X] T057 [P] [US4] Refinar pÃ¡ginas de finanzas en `apps/desktop/src/pages/FinancePage.tsx` y `FinanceDashboard.tsx` â€” layout consistente con otras pÃ¡ginas, tÃ­tulos y breadcrumbs

**Checkpoint**: Dashboard y reportes refinados. KPIs legibles, grÃ¡ficos con buena paleta, filtros intuitivos.

---

## Phase 7: User Story 5 â€” Mejora Visual de AutenticaciÃ³n y Setup (Priority: P3)

**Goal**: Las pantallas de login, recuperaciÃ³n, aprobaciÃ³n pendiente y setup inicial se ven profesionales con buen uso del espacio y mensajes de estado claros.

**Independent Test**: Cerrar sesiÃ³n y verificar login. Probar flujo de recuperaciÃ³n de contraseÃ±a. Ver pantalla de aprobaciÃ³n pendiente y setup inicial.

### Implementation for User Story 5

- [X] T058 [US5] Refinar pantalla de login en `apps/desktop/src/pages/auth/LoginPage.tsx` â€” logo prominente, inputs con contrato unificado (icono + input), botÃ³n primario con ancho completo y estado loading, mensaje de error con card de alerta, fondo con gradiente sutil
- [X] T059 [P] [US5] Mejorar pantalla de recuperaciÃ³n de contraseÃ±a en `apps/desktop/src/pages/auth/ResetPasswordPage.tsx` â€” consistencia visual con login, mensaje de Ã©xito con card `emerald`, inputs con estados
- [X] T060 [P] [US5] Refinar pantalla de aprobaciÃ³n pendiente en `apps/desktop/src/pages/auth/ApprovalPendingPage.tsx` â€” ilustraciÃ³n/Ã­cono central, texto descriptivo, botÃ³n de reintentar con ghost button
- [X] T061 [US5] Mejorar setup inicial en `apps/desktop/src/pages/setup/DesktopSetup.tsx` â€” cards de tipo de negocio con Ã­cono representativo, vista previa de mÃ³dulos, selected state con `ring-2 ring-primary`, stepper visual si aplica, inputs con contrato, mensaje de error amigable

**Checkpoint**: Auth y setup refinados. Primera impresiÃ³n profesional del producto.

---

## Phase 8: User Story 6 â€” Consistencia Global y Tema (Priority: P3)

**Purpose**: Asegurar que el 100% de las pantallas funcionan correctamente en tema oscuro, que la tipografÃ­a y espaciados son consistentes en toda la app, y que no hay componentes huÃ©rfanos con estilos antiguos.

**Independent Test**: Navegar por CADA pantalla en tema claro y oscuro. Verificar que no hay texto ilegible, fondos rotos, o componentes sin dark mode.

### Implementation for User Story 6

- [X] T062 [US6] Auditar y corregir dark mode en `apps/desktop/src/components/modals/` â€” todos los modales: PaymentModal, SaleDetailsModal, SalesSummaryModal, RewardDetailsModal, ManualRewardModal, CustomerHistoryModal, CustomerVehicleModal, SimpleCustomerModal, ServiceQueueModal, TableOrderModal, EditPriceModal, ChangeAdminModal, ChangePasswordModal, SecurityPinModal, InvitationModal, ConfirmationModal
- [X] T063 [P] [US6] Auditar y corregir dark mode en `apps/desktop/src/pages/` â€” SalesPage, CustomersPage, PayrollPage, InventoryPage, ConfigPage, AuditPage
- [X] T064 [P] [US6] Auditar y corregir dark mode en `apps/shared/` â€” todos los componentes: SaleDetailsModal, SalesSummaryModal, CashMovementsModal, RewardDetailsModal, StrategyModal, WhatsNewModal, BusinessEvolution, OperationalSummary, AdminDashboard, Dashboard, Pagination
- [X] T065 [P] [US6] Verificar consistencia tipogrÃ¡fica global â€” asegurar que todas las pÃ¡ginas usan la escala: `text-xl font-bold` para tÃ­tulo de pÃ¡gina, `text-sm font-bold` para tÃ­tulos de card, `text-[11px] font-semibold uppercase` para labels sobre valores, `text-sm` para body
- [X] T066 [P] [US6] Verificar consistencia de espaciado global â€” cards con `p-4`, modales con `p-6`, gaps de `gap-2`/`gap-3`/`gap-4` segÃºn jerarquÃ­a
- [X] T067 [P] [US6] Refinar componente de notificaciÃ³n de actualizaciÃ³n en `apps/desktop/src/components/UpdateNotification.tsx` â€” toast con contrato unificado, botones de acciÃ³n con estados
- [X] T068 [US6] Refinar `apps/desktop/src/App.css` â€” eliminar estilos residuales no utilizados, asegurar que `#root` tiene el fondo correcto en dark mode
- [X] T069 [US6] Verificar estados de carga globales â€” reemplazar spinners por skeletons donde aplique (tablas, cards de datos), mantener spinners solo en botones durante acciones
- [X] T070 [US6] Verificar estados vacÃ­os globales â€” asegurar que toda tabla/lista sin datos muestra Ã­cono + tÃ­tulo + subtÃ­tulo con acciÃ³n sugerida, no solo "No hay datos"
- [X] T071 [US6] Prueba de humo final â€” ejecutar `pnpm build` en root para verificar cero errores de compilaciÃ³n TypeScript y Vite, verificar visualmente 3 flujos completos (venta simple, cierre de caja, admin de trabajador) en tema claro y oscuro

**Checkpoint**: AplicaciÃ³n completamente consistente. Cobertura 100% dark mode, tipografÃ­a y espaciado uniformes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias â€” inicia inmediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 (CSS base lista) â€” BLOQUEA todos los user stories
- **User Stories (Phase 3-8)**: Todas dependen de Phase 2 completada
  - US1 y US2 (ambas P1) pueden proceder en paralelo
  - US3 y US4 (ambas P2) pueden proceder en paralelo despuÃ©s de P1
  - US5 (P3) despuÃ©s de P2 completado
  - US6 (P3) DEBE ser la Ãºltima fase (audita todo lo anterior)

### User Story Dependencies

- **US1 (POS)**: Independiente â€” solo depende de Phase 2
- **US2 (Finanzas)**: Independiente â€” solo depende de Phase 2
- **US3 (Admin)**: Independiente â€” solo depende de Phase 2
- **US4 (Dashboard)**: Independiente â€” solo depende de Phase 2
- **US5 (Auth/Setup)**: Independiente â€” solo depende de Phase 2
- **US6 (Consistencia Global)**: Depende de US1-US5 completados (audita y corrige todos)

### Within Each User Story

- Tareas marcadas [P] pueden ejecutarse en paralelo (archivos distintos)
- Tareas sin [P] deben ejecutarse secuencialmente o son integradoras
- Fase completa antes de pasar a la siguiente (dentro del mismo nivel de prioridad)

### Parallel Opportunities

- **Phase 1**: T001 â†’ T002 y T003 en paralelo
- **Phase 2**: T004 â†’ T005-T009 en paralelo
- **US1**: T010 â†’ T011-T015 en paralelo â†’ T016 â†’ T017
- **US2**: T018 â†’ T019-T022 en paralelo â†’ T023 â†’ T024-T028 en paralelo
- **US3**: T029 â†’ T030-T033 en paralelo â†’ luego T034-T047 en lotes de 3-4
- **US4**: T048 â†’ T049-T057 en paralelo
- **US5**: T058 â†’ T059-T060 en paralelo â†’ T061
- **US6**: T062-T067 en paralelo â†’ T068 â†’ T069 â†’ T070 â†’ T071

---

## Parallel Example: User Story 1

```bash
# Fase 1: Layout base secuencial
Task: "T010 Mejorar POSTopBar.tsx"

# Fase 2: Componentes en paralelo (archivos distintos, sin dependencias entre sÃ­)
Task: "T011 Refinar CategoryTabs.tsx"
Task: "T012 Mejorar POSProductGrid.tsx"
Task: "T013 Refinar POSCart.tsx"
Task: "T014 Mejorar POSCustomerSection.tsx"
Task: "T015 Refinar POSPatio.tsx"

# Fase 3: IntegraciÃ³n secuencial (depende de componentes anteriores)
Task: "T016 Mejorar POSLayout.tsx"

# Fase 4: Modal crÃ­tico (Ãºltimo, depende del layout)
Task: "T017 Refinar PaymentModal.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009)
3. Complete Phase 3: User Story 1 â€” POS (T010-T017)
4. Complete Phase 4: User Story 2 â€” Finanzas (T018-T028)
5. **STOP and VALIDATE**: Probar POS + Cierre de Caja en ambos temas
6. Build de verificaciÃ³n: `pnpm build`

### Incremental Delivery

1. Setup + Foundational â†’ Base lista
2. + US1 (POS) â†’ MVP visible â€” la pantalla mÃ¡s usada ya estÃ¡ mejorada
3. + US2 (Finanzas) â†’ El flujo completo de venta â†’ cierre estÃ¡ refinado
4. + US3 (Admin) â†’ ConfiguraciÃ³n y gestiÃ³n refinadas
5. + US4 (Dashboard) â†’ Vista de negocio refinada
6. + US5 (Auth/Setup) â†’ Primera impresiÃ³n profesional
7. + US6 (Consistencia) â†’ Producto cohesivo y pulido
8. Cada fase agrega valor sin romper las anteriores

### Estrategia de VerificaciÃ³n

- DespuÃ©s de cada fase: ejecutar `pnpm electron:dev` y verificar visualmente
- DespuÃ©s de cada user story: verificar tema claro Y oscuro
- Antes de US6: build de verificaciÃ³n `pnpm build` + `tsc -b`
- DespuÃ©s de US6: build final de verificaciÃ³n

---

## Notes

- [P] = Archivos distintos, sin dependencias entre sÃ­ â€” ejecutar en paralelo
- [Story] = Trazabilidad a user story del spec
- **FR-015**: PROHIBIDO modificar lÃ³gica de negocio, stores, RPC o estructura de datos
- Solo se cambian clases Tailwind, estilos CSS y estructura JSX
- Cada tarea debe verificar el componente en tema claro Y oscuro
- Commit despuÃ©s de cada fase completada
- Verificar `tsc -b` sin errores antes de avanzar a siguiente fase
- Si un componente no tiene versiÃ³n dark de alguna clase, AGREGARLA â€” no ignorar
- Usar los contratos de [contracts/component-styles.md](specs/007-mejora-ui-ux/contracts/component-styles.md) como referencia exacta de clases

