# Tareas: Unificar Clientes Duplicados

**Entrada**: Documentos de diseño de `specs/003-unificar-clientes/`

**Prerrequisitos**: plan.md (requerido), spec.md (requerido), research.md, data-model.md, quickstart.md

**Pruebas**: No se solicitaron pruebas automatizadas. Verificación manual mediante `pnpm electron:dev` y `pnpm build`.

**Organización**: Tareas agrupadas por historia de usuario para permitir implementación y prueba independiente de cada una.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: Se puede ejecutar en paralelo (archivos distintos, sin dependencias)
- **[Historia]**: A qué historia de usuario pertenece esta tarea (ej. US4, US1, US2, US3)
- Incluir rutas exactas de archivos en las descripciones

---

## Fase 1: Configuración (Utilidades Compartidas + Tipos)

**Propósito**: Crear funciones utilitarias puras y definiciones de tipo que todas las historias de usuario necesitan

- [x] T001 [P] Crear utilidad de normalización de teléfono `normalizePhone` en `apps/shared/lib/normalizePhone.ts` — elimina todo carácter no numérico, retorna string vacío para entrada nula/indefinida/vacía
- [x] T002 [P] Crear utilidad de normalización de nombre `normalizeName` en `apps/shared/lib/normalizeName.ts` — descomposición Unicode NFKD, minúsculas, trim, colapsar espacios múltiples, eliminar puntuación (`. , ; : - _`)
- [x] T003 [P] Agregar tipos de la función RPC `merge_customers` en `apps/desktop/src/types/supabase.ts` — agregar a la sección Database Functions: args `{p_target_id: string, p_source_ids: string[], p_performed_by: string}`, retorna `{success: boolean, message: string, transfers: {sales: number, debts: number, vehicles: number}}`

---

## Fase 2: Fundacional (RPC de Base de Datos)

**Propósito**: Función de base de datos que habilita la unificación atómica — bloquea US2

**⚠️ CRÍTICO**: Sin esto, la unificación (US2) no puede funcionar. Detección (US1) y Prevención (US4) pueden avanzar en paralelo.

- [x] T004 Crear migración PostgreSQL `supabase/migrations/20260603_merge_customers_function.sql` — implementar `merge_customers(p_target_id uuid, p_source_ids uuid[], p_performed_by uuid) RETURNS jsonb` como función SECURITY DEFINER que: (1) valida que el target no está en los source_ids, (2) valida que el target no está ya unificado (`metadata->>'merged_into_id' IS NULL`), (3) valida que todos los clientes comparten el mismo `business_id`, (4) actualiza `sales.customer_id` de cada source al target, (5) actualiza `customer_debts.customer_id` de cada source al target, (6) actualiza `vehicles.customer_id` de cada source al target, (7) establece en el `metadata` de cada source: `merged_into_id`, `merged_at` (now()), `merged_by`, (8) agrega entradas de unificación al array JSONB `metadata.merged_from` del target, (9) retorna JSON con success, message y contadores de transferencias

**Punto de control**: Base de datos lista — prevención y detección ya pueden implementarse. La unificación se implementa después de que la UI de detección esté construida.

---

## Fase 3: Historia 4 — Prevenir registro de clientes duplicados (Prioridad: P1) 🛡️

**Objetivo**: Al crear un nuevo cliente desde cualquier formulario, el sistema verifica si ya existen duplicados por teléfono normalizado o nombre similar, muestra un diálogo con opciones "Usar existente" / "Crear de todos modos", y previene duplicados accidentales.

**Prueba independiente**: Intentar crear un cliente con un teléfono que ya existe — aparece el diálogo de prevención con las dos opciones.

### Implementación para Historia 4

- [x] T005 [US4] Actualizar lógica de verificación de duplicados en `apps/desktop/src/components/admin/config/CustomerCreateModal.tsx`: (a) importar `normalizePhone` y `normalizeName`, (b) reemplazar las verificaciones existentes de teléfono exacto y nombre ilike con una consulta que normalice el teléfono y verifique `metadata->>'merged_into_id' IS NULL` (solo clientes activos), (c) si se encuentra coincidencia por teléfono o nombre similar, mostrar un diálogo de confirmación ("Ya existe un cliente similar: ¿Deseas usar el existente o crear de todos modos?") con dos botones en lugar de `alert()`, (d) en "Usar existente" llamar a `onSuccess()` sin crear, (e) en "Crear de todos modos" proceder con la creación (registrar en metadata un flag `duplicate_override: true` para revisión posterior del admin)

- [x] T006 [P] [US4] Actualizar lógica de verificación de duplicados en `apps/desktop/src/components/modals/SimpleCustomerModal.tsx`: (a) importar `normalizePhone` y `normalizeName`, (b) reemplazar verificaciones existentes con chequeo de teléfono normalizado + nombre similar filtrando clientes ya unificados, (c) al encontrar coincidencia mostrar diálogo con "Usar existente" (llama a `onSelect(existingCustomer)` + `onClose()`) y "Crear de todos modos" (procede con la creación, establece `duplicate_override: true` en metadata)

- [x] T007 [P] [US4] Actualizar lógica de verificación de duplicados en `apps/desktop/src/components/modals/CustomerVehicleModal.tsx`: (a) importar `normalizePhone` y `normalizeName`, (b) reemplazar verificaciones existentes con chequeo de teléfono normalizado + nombre similar filtrando clientes ya unificados, (c) al encontrar coincidencia mostrar diálogo con "Usar existente" (selecciona el cliente existente, transiciona a selección de vehículo) y "Crear de todos modos" (procede con la creación, establece `duplicate_override: true` en metadata)

- [x] T008 [P] [US4] Filtrar clientes unificados de la búsqueda rápida del POS en `apps/desktop/src/components/pos/POSCart.tsx`: en la función `handleQuickSearch`, agregar filtro `.is('metadata->merged_into_id', null)` a la consulta de búsqueda de clientes para que los clientes unificados/inactivos nunca aparezcan en la selección de cliente del POS

**Punto de control**: En este punto, la creación de nuevos clientes en todos los formularios previene duplicados. Los duplicados existentes pueden seguir existiendo pero no se crean nuevos.

---

## Fase 4: Historia 1 — Detectar clientes potencialmente duplicados (Prioridad: P1) 🎯 MVP

**Objetivo**: El admin ve una vista "Unificar Clientes" que obtiene todos los clientes (incluyendo unificados para auditoría), agrupa duplicados potenciales por teléfono y similitud de nombre, muestra contadores de actividad por cliente, y permite seleccionar cuáles unificar.

**Prueba independiente**: Acceder a la vista "Unificar Clientes" y verificar que los grupos de duplicados aparecen correctamente cuando hay clientes que comparten el mismo teléfono normalizado o nombre similar.

### Implementación para Historia 1

- [x] T009 [US1] Crear `apps/desktop/src/components/admin/config/CustomerUnify.tsx` con estructura inicial: (a) obtener TODOS los clientes del negocio (incluyendo unificados — para trazabilidad de auditoría), (b) también obtener conteos relacionados mediante una consulta por tabla: conteo de `sales` agrupado por `customer_id`, conteo de `customer_debts` agrupado por `customer_id` donde `status = 'pending'`, conteo de `vehicles` agrupado por `customer_id`, (c) almacenar datos en `useState` local, (d) excluir "Público General" de todos los grupos (FR-010), (e) renderizar un modal de página completa o sección inline con título "Unificar Clientes", botón de cerrar, y spinner de carga mientras se obtienen los datos

- [x] T010 [US1] Implementar algoritmo de detección de duplicados en `CustomerUnify.tsx`: (a) importar `normalizePhone` y `normalizeName`, (b) pasada 1: agrupar clientes activos (sin `merged_into_id`) por teléfono normalizado — crear grupos de 2+ clientes que comparten los mismos dígitos normalizados, etiquetar como "Coincidencia por teléfono", (c) pasada 2: agrupar clientes activos restantes por nombre normalizado — crear grupos de 2+ clientes con el mismo nombre normalizado, etiquetar como "Posible duplicado por nombre", (d) fusionar grupos solapados: si los clientes A, B comparten teléfono X y A, D comparten nombre normalizado, unir en un solo grupo {A, B, D}, (e) ordenar clientes dentro de cada grupo por actividad total (ventas + deudas + vehículos) descendente, (f) renderizar cada grupo como una tarjeta con: etiqueta del grupo (teléfono o nombre), lista de clientes con nombre, teléfono, email, conteo de ventas, deudas, vehículos, radio button para seleccionar cliente "principal", y checkboxes para seleccionar cuáles unificar

- [x] T011 [US1] Agregar controles de "Seleccionar todos" y "Deseleccionar todos" por grupo, un contador global de duplicados seleccionados, y validación que impide seleccionar el mismo cliente como principal y fuente (caso límite: unificar cliente consigo mismo)

**Punto de control**: El admin ya puede ver todos los grupos de duplicados y seleccionar cuáles clientes unificar. La acción de unificar se construye en la Fase 5.

---

## Fase 5: Historia 2 — Unificar clientes duplicados (Prioridad: P1) 🔀

**Objetivo**: El admin selecciona clientes a unificar, designa cuál es el cliente "principal" (el que se conserva), ve una vista previa de lo que se transferirá, confirma, y el sistema ejecuta la unificación atómica vía RPC, mostrando resultados.

**Prueba independiente**: Seleccionar 2 clientes duplicados, ejecutar unificación, verificar que todas las ventas/deudas/vehículos ahora pertenecen al cliente destino y el origen queda marcado como unificado.

### Implementación para Historia 2

- [x] T012 [US2] Implementar modal de vista previa de unificación en `CustomerUnify.tsx`: (a) cuando el admin presiona "Unificar seleccionados", validar que hay un principal seleccionado (FR-004), (b) mostrar advertencia si no hay clientes fuente marcados además del principal, (c) construir panel de vista previa mostrando: nombre del cliente principal (se conservará), lista de clientes fuente (se unificarán), contadores de transferencias por tipo (ventas, deudas, vehículos) calculados desde los datos de actividad ya obtenidos, (d) renderizar con botones "Cancelar" y "Confirmar unificación", (e) mostrar spinner de procesamiento en el botón de confirmar mientras se ejecuta el RPC (usar patrón de estado `isProcessing` de `ConfirmationModal`)

- [x] T013 [US2] Implementar ejecución de unificación en `CustomerUnify.tsx`: (a) al confirmar, llamar a `supabase.rpc('merge_customers', { p_target_id: principalId, p_source_ids: sourceIds, p_performed_by: currentUserId })`, (b) importar `selectIsAdmin` y `useAuthStore` para obtener el ID del usuario actual, (c) en éxito: mostrar overlay de éxito con resumen de transferencias (siguiendo patrón de éxito de PaymentModal — overlay verde con ícono check y auto-cierre vía setTimeout), (d) en error: mostrar banner de error con mensaje del RPC (patrón de PaymentModal — `bg-rose-50 text-rose-600 border-rose-100`), (e) después del éxito, re-obtener todos los datos de clientes y conteos de actividad para refrescar los grupos de duplicados (los clientes unificados ahora se filtran de grupos activos, visibles solo en trazabilidad de auditoría)

**Punto de control**: Flujo completo de unificación funciona de extremo a extremo. El admin puede detectar, seleccionar, previsualizar y ejecutar unificaciones.

---

## Fase 6: Historia 3 — Buscar e identificar manualmente cliente duplicado (Prioridad: P2) 🔍

**Objetivo**: El admin puede buscar manualmente clientes por nombre o teléfono desde la vista de unificación para encontrar duplicados que el algoritmo automático podría no haber detectado, e iniciar manualmente una unificación para los resultados de búsqueda.

**Prueba independiente**: Escribir un nombre parcial en la búsqueda manual, ver clientes coincidentes, seleccionarlos manualmente y unificarlos — aunque no estuvieran agrupados automáticamente.

### Implementación para Historia 3

- [x] T014 [US3] Agregar búsqueda manual en `CustomerUnify.tsx`: (a) agregar un input de búsqueda en la parte superior de la vista de unificar con placeholder "Buscar cliente por nombre o teléfono...", (b) al cambiar el input (debounced 300ms), filtrar todos los clientes activos donde el teléfono normalizado contenga la consulta (solo dígitos) O el nombre normalizado contenga la consulta normalizada, (c) renderizar resultados en una sección separada "Resultados de búsqueda manual" debajo de los grupos automáticos, (d) cada resultado muestra nombre del cliente, teléfono, conteos de actividad, y un checkbox para selección, (e) mostrar "No se encontraron duplicados para esta búsqueda" cuando solo un resultado coincide, (f) cuando 2+ clientes son seleccionados manualmente, mostrar un botón "Unificar seleccionados" que reutiliza el flujo de vista previa + ejecución de US2 (T012/T013)

- [x] T015 [US3] Manejar casos límite: (a) "Maria" encuentra "María" (insensible a acentos, usando normalizeName), (b) "Juan   Pérez" encuentra "Juan Pérez" (espacios colapsados), (c) "8095551234" encuentra clientes con teléfono "(809) 555-1234" (coincidencia por teléfono normalizado), (d) si la búsqueda coincide con un cliente que ya está en un grupo auto-detectado, resaltar el grupo y hacer scroll hacia él

**Punto de control**: Las 4 historias de usuario son funcionales independientemente. La búsqueda manual complementa la detección automática.

---

## Fase 7: Pulido e Integración

**Propósito**: Conectar la vista de unificar en CustomerManager y validar todo

- [x] T016 Integrar `CustomerUnify` en `apps/desktop/src/components/admin/config/CustomerManager.tsx`: (a) importar `CustomerUnify`, (b) importar `selectIsAdmin` de `useAuthStore`, (c) agregar un botón "Unificar Clientes" en la barra superior (visible solo cuando `isAdmin` es true), junto al botón "NUEVO CLIENTE", (d) usar ícono Material Symbols `merge_type` o `account_tree` para el botón, (e) renderizar `CustomerUnify` como un modal (patrón overlay de modales existentes) que se abre al hacer clic en el botón, (f) no pasar props — `CustomerUnify` internamente lee `businessId` de `useBusinessStore`

- [x] T017 Validar compilación completa con `pnpm build` desde la raíz del repo — debe pasar en los 3 paquetes (desktop, shared, web) con cero errores de TypeScript, sin tipos `any`, sin shadowing de variables. Ejecutar `pnpm electron:dev` desde `apps/desktop/` y verificar manualmente: (a) el diálogo de prevención aparece al crear cliente duplicado, (b) el botón de unificar es visible para admin, oculto para cajero, (c) los grupos de duplicados se renderizan correctamente, (d) la vista previa de unificación muestra contadores correctos, (e) la unificación se ejecuta exitosamente, (f) los clientes unificados no aparecen en la búsqueda del POS, (g) las operaciones existentes de CRUD de clientes siguen funcionando

---

## Dependencias y Orden de Ejecución

### Dependencias entre Fases

- **Configuración (Fase 1)**: Sin dependencias — puede iniciar de inmediato. T001, T002, T003 son paralelizables.
- **Fundacional (Fase 2)**: Depende de Configuración (necesita contexto de tipos). BLOQUEA la ejecución de unificación US2.
- **US4 Prevención (Fase 3)**: Depende de Configuración (utilidades T001, T002). Independiente de Fundacional.
- **US1 Detección (Fase 4)**: Depende de Configuración (utilidades T001, T002). Independiente de Fundacional.
- **US2 Unificar (Fase 5)**: Depende de Configuración + Fundacional (T004 RPC) + US1 (T009–T011 construyen la UI donde US2 agrega la acción de merge). **No puede ejecutarse antes que US1.**
- **US3 Búsqueda (Fase 6)**: Depende de US2 (reutiliza vista previa/ejecución de merge de T012/T013). Puede ejecutarse en paralelo con Pulido.
- **Pulido (Fase 7)**: Depende de que todas las historias de usuario estén completas.

### Dependencias entre Historias de Usuario

- **Historia 4 (P1)**: Inicia después de Fase 1. Sin dependencias de otras historias. **Puede ejecutarse en paralelo con US1.**
- **Historia 1 (P1)**: Inicia después de Fase 1. Sin dependencias de otras historias. **Puede ejecutarse en paralelo con US4.**
- **Historia 2 (P1)**: Depende de Fase 2 (RPC) + US1 (componente compartido CustomerUnify.tsx).
- **Historia 3 (P2)**: Depende de US2 (reutiliza flujo de merge). Encaja naturalmente como extensión del componente CustomerUnify existente.

### Dentro de Cada Historia de Usuario

- Utilidades importadas primero (ya en Fase 1)
- Estructura del componente (fetching, estado) antes de renderizado UI
- Renderizado UI antes de acciones (merge, búsqueda)
- Manejo de errores después del camino feliz
- Cada punto de control de historia verificado antes de continuar

### Oportunidades de Paralelismo

- **Fase 1**: T001, T002, T003 tocan archivos distintos — ejecutar los 3 en paralelo
- **Fase 3**: T006, T007, T008 tocan archivos distintos — ejecutar en paralelo después de que T005 establezca el patrón. T005 debe ir primero como implementación de referencia.
- **US4 + US1**: Estas dos fases pueden ejecutarse en paralelo (archivos distintos: formularios vs nuevo componente)
- **US3 + Pulido**: Pueden ejecutarse en paralelo después de que US2 se complete

---

## Ejemplo Paralelo: Fase 1 Configuración

```bash
# Lanzar todas las tareas de configuración juntas (archivos distintos, sin dependencias):
Tarea: "Crear normalizePhone en apps/shared/lib/normalizePhone.ts"
Tarea: "Crear normalizeName en apps/shared/lib/normalizeName.ts"
Tarea: "Agregar tipos del RPC merge_customers en apps/desktop/src/types/supabase.ts"
```

## Ejemplo Paralelo: Fase 3 (US4 - Prevención)

```bash
# Después de que T005 establece el patrón, lanzar en paralelo:
Tarea: "Actualizar lógica de duplicados en SimpleCustomerModal.tsx"
Tarea: "Actualizar lógica de duplicados en CustomerVehicleModal.tsx"
Tarea: "Filtrar clientes unificados de búsqueda rápida en POSCart.tsx"
```

---

## Estrategia de Implementación

### MVP Primero (US4 + US1)

1. Completar Fase 1: Configuración (utilidades + tipos)
2. Completar Fase 2: Fundacional (función RPC)
3. Completar Fase 3: US4 Prevención — **DETENER nuevos duplicados inmediatamente**
4. Completar Fase 4: US1 Detección — **El admin ya puede ver duplicados**
5. **DETENER y VALIDAR**: Probar prevención + detección independientemente
6. Este es el MVP: detener la hemorragia + ver el daño

### Entrega Completa

1. MVP (arriba)
2. Completar Fase 5: US2 Unificar → El admin ya puede corregir duplicados
3. Completar Fase 6: US3 Búsqueda manual → El admin puede encontrar duplicados en casos límite
4. Completar Fase 7: Pulido e integración → Todo conectado
5. Validación completa con `pnpm build`

### Orden Recomendado (Un Solo Desarrollador)

1. T001, T002, T003 en paralelo (Configuración)
2. T004 (RPC Fundacional)
3. T005 → T006, T007, T008 (US4 Prevención — T005 primero, luego en paralelo)
4. T009 → T010 → T011 (US1 Detección — secuencial, mismo archivo)
5. T012 → T013 (US2 Unificar — secuencial, construye sobre US1)
6. T014 → T015 (US3 Búsqueda — secuencial, extiende CustomerUnify)
7. T016 → T017 (Pulido — integración + build)

---

## Notas

- Tareas [P] = archivos distintos, sin dependencias de tareas incompletas
- Etiqueta [Historia] mapea la tarea a una historia de usuario específica (US1–US4) para trazabilidad
- Cada historia de usuario debe ser independientemente completable y testeable
- `CustomerUnify.tsx` es modificado por US1, US2 y US3 — implementar incrementalmente dentro del mismo archivo
- Los formularios de prevención (US4) tocan 4 archivos separados que pueden trabajarse en paralelo después de que el primero establezca el patrón
- Hacer commit después de cada tarea o grupo lógico con formato conventional commit: `feat(CustomerUnify): ...`
- Detenerse en cualquier punto de control para validar la historia independientemente
- Evitar: shadowing de variables (riesgo TDZ), tipos `any`, condicionamiento por `business_type`, nuevos stores Zustand
- Todas las consultas deben filtrar por `business_id` (aislamiento de tenant)
- El cambio en POSCart.tsx es mínimo — solo agregar filtro `.is()` a consulta existente, sin cambios estructurales
