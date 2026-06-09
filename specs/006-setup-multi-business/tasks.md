# Tasks: Interfaz Correcta Según Tipo de Negocio al Primer Registro

**Input**: Design documents from `/specs/006-setup-multi-business/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Validación manual con quickstart.md (6 pruebas). Sin test suite automatizada.

**Organization**: Tasks grouped by user story. Feature pequeña — 2 archivos, 3 stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths in all descriptions

---

## Phase 1: Setup — RPC Atómico (Foundational)

**Purpose**: Modificar el RPC para que la creación del negocio sea atómica (tipo + módulos en una sola transacción). Esto es prerequisito para US1 y US2.

**⚠️ CRITICAL**: Sin este cambio, el UPDATE separado puede fallar y dejar negocios sin config.

- [x] T001 Modificar `create_business_without_serial` para aceptar `p_business_type text` y `p_config jsonb`, y hacer el UPDATE dentro de la misma transacción PL/pgSQL en `supabase/migrations/20260526100000_remove_serial_and_hwid.sql`

**Checkpoint**: RPC atómico listo. Si falla el UPDATE, el INSERT hace rollback automático.

---

## Phase 2: User Story 1 — Vista previa de módulos (Priority: P1) 🎯 MVP

**Goal**: Al seleccionar un tipo de negocio en el setup, el usuario ve inmediatamente qué módulos estarán activos y cuáles no.

**Independent Test**: Seleccionar "Lavado de Carro" → ver módulos activos. Cambiar a "Restaurante" → ver que la lista cambia completamente.

### Implementation for User Story 1

- [x] T002 [US1] Reemplazar las 4 tarjetas de tipo de negocio con los nuevos valores: `automotive` (local_car_wash, "Lavado de Carro"), `barbershop` (content_cut, "Barber Shop"), `beauty_salon` (spa, "Salón de Belleza"), `restaurant` (restaurant, "Restaurante") en `apps/desktop/src/pages/setup/DesktopSetup.tsx`
- [x] T003 [US1] Actualizar el tipo `BusinessType` a `'automotive' | 'barbershop' | 'beauty_salon' | 'restaurant'` y cambiar default a `'automotive'` en `apps/desktop/src/pages/setup/DesktopSetup.tsx`
- [x] T004 [US1] Agregar sección de vista previa de módulos debajo del grid de tarjetas: leer `getPresetModules(businessType)`, mapear flags a labels vía `MODULE_REGISTRY`, mostrar dos grupos "✓ Incluye" y "✗ No incluye" en `apps/desktop/src/pages/setup/DesktopSetup.tsx`

**Checkpoint**: Vista previa funcional. Al cambiar de tipo de negocio, la lista de módulos se actualiza instantáneamente.

---

## Phase 3: User Story 2 — Interfaz diferente según negocio (Priority: P1)

**Goal**: Después de crear el negocio, la pantalla principal refleja exactamente los módulos del tipo seleccionado. Sin reinicio manual.

**Independent Test**: Crear "Lavado de Carro" → ver vehículos y cola de servicio en el POS. Crear "Restaurante" → ver plano de mesas, sin vehículos.

### Implementation for User Story 2

- [x] T005 [US2] Actualizar `handleActivate` para pasar `p_business_type` y `p_config` al RPC, y **eliminar** el `supabase.from('business').update(...)` separado en `apps/desktop/src/pages/setup/DesktopSetup.tsx`
- [x] T006 [US2] Verificar que `checkSession()` recarga correctamente el negocio con `business_type` y `config` ya establecidos desde el RPC — la interfaz debe ser correcta en la primera carga sin pasos adicionales en `apps/desktop/src/App.tsx`

**Checkpoint**: Negocio creado con tipo y módulos en 1 paso. Interfaz correcta desde la primera carga.

---

## Phase 4: User Story 3 — Configuración atómica: todo o nada (Priority: P2)

**Goal**: Si algo falla durante la creación del negocio, no queda un negocio a medias. El usuario ve un mensaje de error claro y puede reintentar.

**Independent Test**: Desconectar internet durante la creación → mensaje de error → reconectar → el negocio NO existe (no quedó huérfano).

### Implementation for User Story 3

- [x] T007 [US3] Simplificar `handleActivate`: remover el UPDATE separado. Si el RPC falla, el error se muestra y no hay negocio creado parcialmente en `apps/desktop/src/pages/setup/DesktopSetup.tsx`
- [x] T008 [US3] Mejorar el mensaje de error en el catch: "Error al crear el negocio. Verifica tu conexión e intenta de nuevo." en `apps/desktop/src/pages/setup/DesktopSetup.tsx`

**Checkpoint**: Creación atómica. Sin negocios huérfanos. Errores claros.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Deploy, build, y validación final.

- [x] T009 Aplicar migración del RPC modificado con `npx supabase db push` 
- [x] T010 Ejecutar `pnpm build` desde `apps/desktop` y corregir errores si existen
- [x] T011 Validar flujo completo según quickstart.md: crear los 4 tipos de negocio, verificar interfaz de cada uno

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (RPC)**: Sin dependencias. Ejecutar primero. Bloquea US2.
- **US1 (Phase 2)**: Depende de Phase 1 completada. Independiente de US2.
- **US2 (Phase 3)**: Depende de Phase 1 (necesita el RPC nuevo). T005 depende de T002 (tipos actualizados).
- **US3 (Phase 4)**: Es la simplificación del catch — puede hacerse junto con US2.
- **Polish (Phase 5)**: Depende de todo lo anterior.

### Within DesktopSetup.tsx

T002, T003, T004, T005, T007, T008 modifican el mismo archivo. **Orden recomendado**:
```
T002 → T003 → T004 → T005 → T007 → T008
(las 6 tareas son secuenciales porque tocan el mismo archivo)
```

### Parallel Opportunities

Ninguna — son 2 archivos y las tareas dentro de DesktopSetup.tsx son secuenciales.

---

## Implementation Strategy

### Single Developer

```
T001 → T002→T003→T004 → T005→T006→T007→T008 → T009→T010→T011
└─F1─┘└────── F2 (US1) ──────┘└── F3+F4 (US2+US3) ──┘└─── F5 ───┘
```

### MVP First (User Story 1 Only)

1. T001 (RPC atómico)
2. T002-T004 (tarjetas + vista previa)
3. **STOP**: El usuario ya puede ver qué módulos tendrá antes de crear el negocio

### Full Delivery

1. T001 → RPC atómico
2. T002-T004 → US1: Vista previa funcional
3. T005-T008 → US2+US3: Creación en 1 paso, error handling
4. T009-T011 → Deploy + build + validación

### Tiempo estimado

| Phase | Tasks | Estimado |
|---|---|---|
| Phase 1 (RPC) | 1 | 5 min |
| Phase 2 (US1) | 3 | 30 min |
| Phase 3 (US2) | 2 | 15 min |
| Phase 4 (US3) | 2 | 10 min |
| Phase 5 (Polish) | 3 | 10 min |
| **Total** | **11** | **~1 hora** |

---

## Notes

- [P] tasks = different files, no dependencies (no hay en esta feature por ser 2 archivos)
- [US1]/[US2]/[US3] label maps task to specific user story for traceability
- Sin migraciones nuevas de tabla — solo `CREATE OR REPLACE FUNCTION`
- La vista previa usa `getPresetModules()` existente (sin código nuevo en shared)
- Validar con `pnpm build` al final
