# Feature Specification: Resumen Operativo Completo por Mes en Caja Central

**Feature Branch**: `014-resumen-operativo-mes-completo`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Mejorar el Resumen Operativo en Caja Central: tabla con desplegables anidados — año → meses → detalle del mes. Al final, Total General siempre visible."

## Clarifications

### Session 2026-06-18

- Q: ¿Acordeones expandibles o tabla compacta? → A: Tabla con desplegables anidados en 3 niveles: Año (expandir) → Meses (expandir) → Detalle del mes.
- Q: ¿Totales acumulados al final? → A: Sí — fila de Total General siempre visible al pie de la tabla.
- Q: ¿Estructura de niveles? → A: Nivel 1 = fila de Año (colapsada por defecto). Nivel 2 = filas de Meses (colapsadas, se muestran al expandir el año). Nivel 3 = desglose inline del mes (al hacer clic en el mes).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vista general por años y Total General (Priority: P1)

El dueño abre Caja Central y en el "Resumen Operativo" ve una tabla de alto nivel. Cada fila representa un **año** con columnas: Año, Ingresos, Egresos, Neto, 🎁 Bonos, 📊 Servicios. Las filas de año son cliqueables y muestran un ícono de expandir (▶/▼). Al pie, siempre visible, una fila destacada de **Total General** con la suma de todo el historial. La vista inicial es limpia y compacta — solo años + total general.

**Why this priority**: Vista gerencial inmediata: "¿cómo fue 2026 vs 2025?" sin ruido de meses. El Total General da la foto completa del negocio.

**Independent Test**: Abrir Caja Central, verificar que solo se ven filas de años (colapsadas) + Total General. Sin meses visibles hasta expandir.

**Acceptance Scenarios**:

1. **Given** que hay datos de 2025 y 2026, **When** el usuario abre Caja Central, **Then** ve 2 filas ("2025", "2026") con sus totales anuales, y al pie el Total General = 2025 + 2026.
2. **Given** que solo hay datos del año actual, **When** se abre Caja Central, **Then** se ve 1 fila de año y el Total General con el mismo valor.

---

### User Story 2 - Expandir año para ver el desglose mensual (Priority: P1)

Al hacer clic en una fila de año, se expande inline mostrando **todas las filas de meses** de ese año debajo de la fila del año. Cada mes muestra: Mes, Ingresos, Egresos, Neto, Bonos, Servicios. El año colapsado vuelve a ocultar los meses. Se puede tener varios años expandidos simultáneamente.

**Why this priority**: El dueño quiere ver el detalle mes a mes de un año específico para detectar tendencias, estacionalidad, o meses atípicos.

**Independent Test**: Hacer clic en "2026", verificar que aparecen filas de enero a junio debajo. Hacer clic de nuevo, verificar que se ocultan.

**Acceptance Scenarios**:

1. **Given** que la tabla muestra los años colapsados, **When** el usuario hace clic en "2026", **Then** se despliegan todos los meses de 2026 con sus 6 columnas de datos.
2. **Given** que 2026 está expandido, **When** el usuario hace clic en "2025", **Then** 2026 sigue expandido y 2025 también se expande (expansión múltiple permitida).
3. **Given** que un año no tiene datos en algún mes, **When** se expande, **Then** ese mes muestra $0 sin errores.

---

### User Story 3 - Expandir mes para ver el desglose detallado (Priority: P2)

Dentro de un año expandido, al hacer clic en una fila de **mes**, se despliega inline un tercer nivel debajo de ese mes con el desglose completo: lista de ingresos en efectivo, ingresos por transferencia, lista de egresos, servicios vendidos (nombre + cantidad + total facturado), y bonos entregados (servicio + cliente + valor). Un segundo clic colapsa este detalle.

**Why this priority**: Cuando un mes llama la atención (muy alto o muy bajo), el dueño quiere ver inmediatamente qué pasó sin abrir modales.

**Independent Test**: Expandir un año, hacer clic en "Junio 2026", verificar que aparece el desglose detallado debajo.

**Acceptance Scenarios**:

1. **Given** que los meses de 2026 están visibles, **When** el usuario hace clic en "Junio 2026", **Then** se despliega debajo: lista de ingresos efectivo, ingresos transferencia, egresos, servicios vendidos con cantidades, bonos canjeados.
2. **Given** que un detalle de mes está expandido, **When** el usuario hace clic en otro mes, **Then** el detalle anterior se colapsa y se expande el nuevo.
3. **Given** que el detalle de un mes está expandido, **When** el usuario colapsa el año, **Then** todo el año (incluido el detalle del mes) se oculta.

---

### Edge Cases

- ¿Qué pasa si un mes tiene ventas de servicios pero cero bonos? → La columna de bonos muestra $0.
- ¿Qué pasa si un mes tiene bonos pero cero ventas de servicios pagados? → La columna de servicios muestra $0.
- ¿Qué pasa si hay ventas en un mes pero los sale_items no tienen `business_id` (registros antiguos)? → Las queries deben funcionar sin filtrar por `business_id` en `sale_items` (el filtro se aplica vía `sales.business_id`).
- ¿Qué pasa si hay muchos meses (más de 24)? → Scroll vertical en la tabla, altura máxima ~500px.
- ¿Qué pasa en mes sin movimientos en caja pero con ventas? → Se muestra igual: la tabla calcula desde `sales` + `sale_items`, no solo desde `central_cash_movements`.
- ¿Qué pasa si un año completo tiene todos los meses en $0? → La fila del año muestra $0 (sin errores).
- ¿Qué pasa si se colapsa un año con un detalle de mes expandido dentro? → Todo se oculta junto con el año. Al re-expandir el año, los meses aparecen colapsados (el detalle no persiste).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El Resumen Operativo DEBE mostrar una tabla con **3 niveles jerárquicos**: Año (nivel 1) → Meses (nivel 2) → Detalle del mes (nivel 3).
- **FR-002**: Nivel 1 — Filas de **Año**: DEBEN mostrarse colapsadas por defecto. Cada fila muestra: Año, Ingresos, Egresos, Neto, Bonos, Servicios. Cliqueable para expandir/colapsar los meses de ese año.
- **FR-003**: Nivel 2 — Filas de **Mes**: DEBEN aparecer al expandir el año. Cada fila muestra: Mes, Ingresos, Egresos, Neto, Bonos, Servicios. Cliqueable para expandir/colapsar el detalle de ese mes.
- **FR-004**: Nivel 3 — **Detalle del mes**: DEBE aparecer inline debajo del mes cliqueado, mostrando: lista de ingresos efectivo, ingresos transferencia, egresos, servicios vendidos (nombre + cantidad + $), y bonos canjeados (servicio + cliente + $).
- **FR-005**: **Total General**: Al pie de la tabla, siempre visible (no colapsable), DEBE mostrar la suma de todas las columnas de todo el historial, con estilo visual destacado.
- **FR-006**: La tabla DEBE permitir **expansión múltiple**: varios años expandidos simultáneamente, pero solo un detalle de mes expandido a la vez.
- **FR-007**: Los totales de Servicios y Bonos DEBEN calcularse para cada mes y año mostrado, no solo para el mes en curso.
- **FR-008**: Las cards "🎁 Bonos Entregados" y "📊 Ventas Servicios" DEBEN conservar su comportamiento actual (totales del mes en curso, cliqueables).
- **FR-009**: La tabla DEBE tener scroll vertical si el contenido excede ~500px de altura. El Total General siempre visible (sticky al fondo).
- **FR-010**: Si un mes o año no tiene datos, DEBE mostrar "$0" sin generar errores.
- **FR-011**: Los datos de servicios y bonos para todos los meses DEBEN cargarse junto con el dashboard (no bajo demanda por mes).

### Key Entities

- **Fila de Año (Nivel 1)**: Año, total ingresos, total egresos, neto, total bonos ($), total servicios ($). Colapsada por defecto. Expandible.
- **Fila de Mes (Nivel 2)**: Nombre del mes, total ingresos, total egresos, neto, total bonos ($), total servicios ($). Visible solo si el año padre está expandido. Expandible para detalle.
- **Detalle del Mes (Nivel 3)**: Secciones: Ingresos Efectivo (lista), Ingresos Transferencia (lista), Egresos (lista), Servicios Vendidos (nombre + cant + $), Bonos Canjeados (servicio + cliente + $). Visible solo si el mes padre está expandido.
- **Fila de Total General**: Etiqueta "Total General", suma global de todo el historial. Siempre visible, sticky al fondo. No expandible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La vista inicial (años + Total General) se renderiza en menos de 3 segundos tras abrir Caja Central.
- **SC-002**: Expandir un año muestra sus meses en menos de 200ms (datos ya en memoria).
- **SC-003**: Expandir un mes muestra su detalle en menos de 200ms (datos ya en memoria).
- **SC-004**: Los totales de servicios y bonos en la tabla coinciden exactamente con los que mostrarían los modales de detalle para ese mismo mes.
- **SC-005**: La tabla soporta hasta 60 meses (5 años) sin degradación visible de rendimiento.
- **SC-006**: El Total General es matemáticamente exacto (suma de todas las filas de año = Total General).

## Assumptions

- Los `sale_items` existentes pueden no tener `business_id`. Las queries usarán `sales.business_id` como filtro de tenant.
- Las funciones `fetchBonosData()` y `fetchVentasServiciosData()` se refactorizarán para devolver datos agrupados por mes y año de una sola vez.
- El componente `CentralCash.tsx` reemplazará los acordeones actuales por esta tabla de 3 niveles.
- El estado de expansión/colapso se maneja con `useState` local (no se persiste entre recargas).
- El diseño visual sigue el estilo compacto tipo "fintech".
- Los servicios vendidos incluyen `service_id` y `product_id`.
- La agrupación por año se determina del `created_at` de la venta/movimiento.
