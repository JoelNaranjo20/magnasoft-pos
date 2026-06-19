# Research: Resumen Operativo Completo por Mes

**Feature**: 014-resumen-operativo-mes-completo
**Date**: 2026-06-18

## Decision 1: Estrategia de queries multi-mes

**Decision**: Refactorizar `fetchBonosData()` y `fetchVentasServiciosData()` para aceptar un rango de fechas opcional. Crear nuevo `fetchAllMonthsData()` que itera sobre los meses con datos en `sales` y consolida en una estructura `MonthlyTableData`.

**Rationale**: Las funciones actuales solo consultan el mes en curso (`currentMonthRange()`). Para la tabla multi-mes necesitamos:
1. Determinar el rango total: desde el primer mes con ventas hasta el mes actual
2. Para cada mes, obtener servicios y bonos (puede ser en paralelo con `Promise.all`)
3. Consolidar en `Map<string, MonthlyRow>` indexado por `YYYY-MM`

**Alternatives considered**:
- ❌ Una sola mega-query con GROUP BY mes: PostgREST no soporta agrupación compleja con joins
- ❌ RPC en PostgreSQL: requeriría migración, complejidad innecesaria
- ✅ Múltiples queries por mes en paralelo: máximo ~60 meses = 60 queries paralelas. Con `Promise.all` y `Promise.allSettled`, el tiempo total ≈ tiempo de la query más lenta (~500ms)

## Decision 2: Estructura de datos para la tabla

**Decision**: Nueva interfaz `MonthlyTableData` con agrupación año→meses:

```ts
interface MonthlyTableRow {
  monthKey: string;        // "2026-06"
  monthLabel: string;      // "Junio"
  year: number;            // 2026
  ingresos: number;
  egresos: number;
  neto: number;
  bonos: number;
  servicios: number;
  // Detalles para N3 (ya calculados en monthlyBreakdown)
  cashIngresos: DetailItem[];
  transferIngresos: DetailItem[];
  egresosDetalle: DetailItem[];
  serviciosDetalle: DetailItem[];
  bonosDetalle: DetailItem[];
}

interface YearGroup {
  year: number;
  months: MonthlyTableRow[];
  totalIngresos: number;
  totalEgresos: number;
  totalNeto: number;
  totalBonos: number;
  totalServicios: number;
}
```

**Rationale**: La agrupación por año con totales pre-calculados permite renderizar la tabla sin `useMemo` adicional en el componente. Los totales anuales y el Total General se derivan directamente de los datos agrupados.

**Alternatives considered**:
- ❌ Calcular totales en el componente con `useMemo`: más código en la UI, más props que pasar
- ✅ Pre-calcular en el hook: la UI solo itera y renderiza

## Decision 3: Estado de expansión de la tabla

**Decision**: Tres estados `useState` independientes en `CentralCash.tsx`:

```ts
const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
```

**Rationale**:
- `expandedYears`: Set — permite expandir varios años simultáneamente
- `expandedMonth`: string único — solo un mes expandido a la vez (FR-006)
- Colapsar un año automáticamente limpia `expandedMonth` si el mes pertenecía a ese año

**Alternatives considered**:
- ❌ Un solo estado de "expansión": demasiado complejo para los 3 niveles
- ❌ Estado en Zustand: innecesario, es estado puramente UI local

## Decision 4: Total General sticky

**Decision**: Usar CSS `position: sticky; bottom: 0` en la fila del Total General, con un contenedor de altura máxima con `overflow-y: auto`.

**Rationale**: Tailwind soporta `sticky bottom-0`. El contenedor padre tiene `max-h-[500px] overflow-y-auto`. La fila sticky requiere `bg-white dark:bg-slate-900` para cubrir el contenido al hacer scroll.

## Decision 5: Sin cambios en modales existentes

**Decision**: Las cards "🎁 Bonos Entregados" y "📊 Ventas Servicios" y sus modales (`BonosDetalleModal`, `VentasServiciosDetalleModal`) permanecen sin cambios. La tabla usa los mismos datos pero los muestra inline.

**Rationale**: FR-008: las cards del dashboard conservan su comportamiento actual (mes en curso + modal). La tabla complementa con vista histórica multi-mes.
