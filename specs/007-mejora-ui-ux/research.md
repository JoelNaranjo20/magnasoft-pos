# Research: Mejora Visual — Sistema de Diseño y Patrones

**Feature**: 007-mejora-ui-ux  
**Date**: 2026-06-08

## Decision 1: Paleta de Colores por Semántica

### Decisión
Refinar el uso de la paleta Tailwind existente (slate, emerald, rose, amber, indigo, sky) con reglas semánticas estrictas y verificación de contraste WCAG AA (4.5:1 para texto normal, 3:1 para texto grande).

### Rationale
La paleta actual ya está presente pero se usa inconsistentemente (ej. a veces emerald para éxito, a veces green; a veces rose para error, a veces red). Estandarizar elimina ambigüedad visual.

### Reglas definidas

| Semántica | Color Base | Uso |
|-----------|------------|-----|
| Éxito / Ingreso / Positivo | `emerald-600` (light), `emerald-400` (dark) | Fondos de ingresos, badges de completado, +montos |
| Error / Egreso / Negativo / Destructivo | `rose-600` (light), `rose-400` (dark) | Fondos de egresos, errores, −montos, botones delete |
| Advertencia / Pendiente / Descuadre | `amber-600` (light), `amber-400` (dark) | Badges pendientes, descuadres, alertas no críticas |
| Información / Neutral / Enlace | `indigo-600` (light), `indigo-400` (dark) | Enlaces, info boxes, tags neutros |
| Primario / Acción Principal | `primary` (#0d7ff2) | Botones primarios, links, focus rings |
| Texto Principal | `slate-900` (light), `slate-100` (dark) | Títulos, cuerpo de texto |
| Texto Secundario | `slate-500` (light), `slate-400` (dark) | Labels, descripciones, placeholders |
| Superficie | `white` / `slate-50` (light), `slate-800` / `slate-900` (dark) | Cards, modales, inputs |
| Fondo | `slate-100` (light), `slate-900` (dark) | Fondo de página |

### Alternativas consideradas
- **Paletas completamente nuevas**: Rechazado — es demasiado esfuerzo y rompe consistencia con componentes ya estilizados. Es preferible refinar la paleta existente.
- **Solo variables CSS (no Tailwind)**: Rechazado — Tailwind `dark:` es el mecanismo estándar del proyecto.

---

## Decision 2: Escala de Espaciado Consistente

### Decisión
Usar una escala de espaciado fija basada en múltiplos de 4px (Tailwind default):
- `p-2` / `gap-2` (8px) → Elementos compactos (chips, badges, botones pequeños)
- `p-3` / `gap-3` (12px) → Cards internos, filas de tabla
- `p-4` / `gap-4` (16px) → Cards estándar, padding de modales
- `p-5` / `gap-5` (20px) → Secciones, padding de página
- `p-6` / `gap-6` (24px) → Separación entre secciones mayores

### Rationale
Actualmente hay mezcla de `p-3`, `p-3.5`, `p-4` inconsistente. Estandarizar a valores enteros de Tailwind (sin fracciones `.5` excepto para texto muy pequeño).

### Reglas
- Padding de card estándar: `p-4` (16px)
- Padding de modal: `p-6` (24px)
- Gap entre items en lista: `gap-2` (8px) o `gap-3` (12px)
- Padding de input: `px-3 py-2` (12px horizontal, 8px vertical)

---

## Decision 3: Escala Tipográfica

### Decisión
Definir 6 niveles tipográficos fijos y usarlos consistentemente:

| Nivel | Clases | Uso |
|-------|--------|-----|
| Hero Number | `text-3xl font-black` | Total en caja, KPI principal |
| Page Title | `text-xl font-bold` | Título de cada página |
| Section Title | `text-sm font-bold` | Título de card/sección |
| Card Label | `text-[11px] font-semibold uppercase tracking-wider` | Labels pequeños sobre valores |
| Body | `text-sm` | Texto de tabla, formularios, descripciones |
| Caption | `text-xs text-slate-500` | Texto secundario, timestamps |

### Rationale
La inconsistencia tipográfica actual (mezcla de `text-[10px]`, `text-[11px]`, `text-xs`, `text-sm`) causa que pantallas similares se vean diferentes. Se admiten excepciones puntuales para `text-[10px]` solo en badges ultracompactos.

---

## Decision 4: Sistema de Estados de Componentes

### Decisión
Todo componente interactivo debe manejar 5 estados visuales con clases Tailwind consistentes:

| Estado | Patrón |
|--------|--------|
| **Normal** | Estilo base, sin modificadores |
| **Hover** | `hover:bg-{color}-50` (light), `hover:bg-{color}-900/20` (dark) + `hover:shadow-sm` si es card |
| **Focus** | `focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1` |
| **Active/Pressed** | `active:scale-[0.98]` + `active:bg-{color}-100` |
| **Disabled** | `opacity-50 cursor-not-allowed pointer-events-none` + sin hover effects |
| **Loading** | Mismo que disabled + spinner o skeleton |

### Rationale
Muchos componentes actualmente solo tienen estilo normal. Agregar hover/focus/active/disabled consistentes mejora drásticamente la percepción de calidad y usabilidad.

---

## Decision 5: Modales — Diseño Unificado

### Decisión
Todo modal debe seguir este contrato visual:

```
┌─ Overlay: bg-black/60 backdrop-blur-sm ─────────────────┐
│  ┌─ Modal: bg-white dark:bg-slate-800 rounded-xl ───┐   │
│  │  border border-slate-200 dark:border-slate-700   │   │
│  │  shadow-2xl                                       │   │
│  │  ┌─ Header: px-6 pt-6 pb-2 ──────────────────┐   │   │
│  │  │  Título + botón X (icono ×)               │   │   │
│  │  └────────────────────────────────────────────┘   │   │
│  │  ┌─ Body: px-6 py-3 ─────────────────────────┐   │   │
│  │  │  Contenido scrolleable                     │   │   │
│  │  └────────────────────────────────────────────┘   │   │
│  │  ┌─ Footer: px-6 pb-6 pt-2 ──────────────────┐   │   │
│  │  │  Botones de acción (Cancelar + Confirmar)  │   │   │
│  │  └────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Rationale
Actualmente cada modal maneja su propio padding y estructura. Unificar da cohesión inmediata al producto.

---

## Decision 6: Tablas — Patrón Unificado

### Decisión

```text
┌─ Table Container: rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ─┐
│  ┌─ Header: bg-slate-100 dark:bg-slate-800/50 sticky top-0 z-10 ───────────────────────┐   │
│  │  th: px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider │
│  └──────────────────────────────────────────────────────────────────────────────────────┘   │
│  ┌─ Row (odd): bg-white dark:bg-slate-800 ────────────────────────────────────────────┐   │
│  │  td: px-4 py-2.5 text-sm                                                            │   │
│  └──────────────────────────────────────────────────────────────────────────────────────┘   │
│  ┌─ Row (even): bg-slate-50/50 dark:bg-slate-800/30 ────────────────────────────────┐   │
│  │  td: px-4 py-2.5 text-sm                                                            │   │
│  └──────────────────────────────────────────────────────────────────────────────────────┘   │
│  ┌─ Row Hover: hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ───────┐   │
│  └──────────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Rationale
Las tablas actuales varían entre pantallas — algunas sin hover, otras sin filas alternas. Unificar mejora legibilidad.

---

## Decision 7: Dark Mode — Verificación Sistemática

### Decisión
Revisar cada componente contra la regla: **todo elemento con clase de color/texto/bg en light mode DEBE tener su correspondiente `dark:` variant**. Priorizar componentes donde actualmente el dark mode falla (texto negro sobre fondo oscuro, inputs sin estilo dark).

### Rationale
El dark mode actual funciona parcialmente. Muchos componentes nuevos y algunos existentes no tienen variantes dark. La cobertura debe ser 100%.

---

## Decision 8: Animaciones y Transiciones

### Decisión
Estandarizar las transiciones con un solo token de timing:

- **Duración**: `duration-200` (200ms) para micro-interacciones (hover, focus), `duration-300` (300ms) para transiciones de layout
- **Easing**: `ease-out` para entradas, `ease-in` para salidas (usar las utilities de Tailwind)
- **Propiedades**: `transition-colors` para cambios de color, `transition-all` + `duration-200` para cambios complejos

### Rationale
Actualmente hay mezcla de `duration-150`, `duration-200`, `duration-300` y `cubic-bezier` personalizado sin criterio. Simplificar a dos duraciones estándar.
