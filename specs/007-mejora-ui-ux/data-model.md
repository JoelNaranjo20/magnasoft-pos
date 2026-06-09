# Design Tokens: Mejora Visual y UX

**Feature**: 007-mejora-ui-ux  
**Date**: 2026-06-08

> Esta feature no introduce entidades de base de datos. En su lugar, define **design tokens** — los valores atómicos que gobiernan la apariencia visual de toda la aplicación.

## 1. Color Tokens

### 1.1 Paleta Semántica

| Token | Light Mode | Dark Mode | Aplicación |
|-------|-----------|-----------|------------|
| `--color-success` | `emerald-600` | `emerald-400` | Montos positivos, badges éxito, ingresos |
| `--color-success-bg` | `emerald-50` | `emerald-950/20` | Fondos de ingresos, cards de éxito |
| `--color-success-border` | `emerald-200` | `emerald-800` | Bordes de cards de éxito |
| `--color-danger` | `rose-600` | `rose-400` | Montos negativos, errores, botones delete |
| `--color-danger-bg` | `rose-50` | `rose-950/20` | Fondos de egresos, cards de error |
| `--color-danger-border` | `rose-200` | `rose-800` | Bordes de cards de error |
| `--color-warning` | `amber-600` | `amber-400` | Descuadres, pendientes, alertas |
| `--color-warning-bg` | `amber-50` | `amber-950/20` | Fondos de alerta |
| `--color-warning-border` | `amber-200` | `amber-800` | Bordes de alerta |
| `--color-info` | `indigo-600` | `indigo-400` | Información neutra, enlaces |
| `--color-info-bg` | `indigo-50` | `indigo-950/20` | Info boxes |
| `--color-primary` | `#0d7ff2` | `#0d7ff2` | Acciones principales, focus rings |
| `--color-primary-hover` | `#0b6ddb` | `#3b9eff` | Hover de botones primarios |

### 1.2 Escala de Neutros

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| Texto principal | `slate-900` | `slate-100` | HEADINGS, body text |
| Texto secundario | `slate-500` | `slate-400` | Labels, captions, placeholders |
| Texto terciario | `slate-400` | `slate-500` | Texto deshabilitado, timestamps |
| Borde sutil | `slate-200` | `slate-700` | Bordes de cards, inputs, tablas |
| Borde prominente | `slate-300` | `slate-600` | Bordes de secciones mayores |
| Fondo página | `slate-100` | `slate-900` | `bg` de la app |
| Superficie 1 | `white` | `slate-800` | Cards, modales, dropdowns |
| Superficie 2 | `slate-50` | `slate-800/50` | Filas alternas, headers de tabla |
| Superficie hover | `slate-50` | `slate-700/50` | Hover de filas, cards interactivas |

## 2. Spacing Tokens

| Token | Valor Tailwind | px | Uso |
|-------|---------------|-----|-----|
| `xs` | `p-1 gap-1` | 4px | Iconos, badges compactos |
| `sm` | `p-2 gap-2` | 8px | Botones pequeños, chips, filas tabla |
| `md` | `p-3 gap-3` | 12px | Cards internos, listados compactos |
| `lg` | `p-4 gap-4` | 16px | Cards estándar, padding de input groups |
| `xl` | `p-6 gap-6` | 24px | Padding de modal, separación de secciones |

## 3. Typography Tokens

| Token | Clases Tailwind | Tamaño efectivo | Uso |
|-------|----------------|-----------------|-----|
| `hero` | `text-3xl font-black` | ~30px | Total caja, KPI estrella |
| `h1` | `text-xl font-bold` | ~20px | Título de página |
| `h2` | `text-lg font-semibold` | ~18px | Título de sección |
| `h3` | `text-sm font-bold` | ~14px | Título de card |
| `label` | `text-[11px] font-semibold uppercase tracking-widest` | 11px | Etiquetas sobre valores |
| `body` | `text-sm` | 14px | Texto de tabla, formularios |
| `body-sm` | `text-xs` | 12px | Texto secundario, timestamps |
| `caption` | `text-[10px]` | 10px | Solo badges ultracompactos |

## 4. Border Radius Tokens

| Token | Clase | Uso |
|-------|-------|-----|
| `sm` | `rounded-lg` (8px) | Inputs, botones, chips, badges |
| `md` | `rounded-xl` (12px) | Cards, modales, dropdowns |
| `lg` | `rounded-2xl` (16px) | Cards principales, hero sections |
| `full` | `rounded-full` | Botones circulares, avatares |

## 5. Shadow Tokens

| Token | Clase | Uso |
|-------|-------|-----|
| `card` | `shadow-sm` | Cards estándar |
| `card-hover` | `shadow-md` | Cards en hover |
| `modal` | `shadow-2xl` | Modales |
| `dropdown` | `shadow-lg` | Dropdowns, popovers |

## 6. Transition Tokens

| Token | Clase | Uso |
|-------|-------|-----|
| `micro` | `transition-colors duration-200 ease-out` | Hover, focus en botones/inputs/links |
| `layout` | `transition-all duration-300 ease-out` | Expansión de cards, cambio de layout |

## 7. Component State Tokens

| Estado | Modificadores |
|--------|--------------|
| **Normal** | Solo clases base |
| **Hover** | `hover:bg-{surface-hover} hover:shadow-sm transition-colors duration-200` |
| **Focus** | `focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1` |
| **Active** | `active:scale-[0.98] active:bg-{color}-100` |
| **Disabled** | `opacity-50 cursor-not-allowed pointer-events-none` |
| **Selected** | `ring-2 ring-primary bg-primary/5` |

## 8. Z-Index Scale

| Token | Valor | Uso |
|-------|-------|-----|
| `base` | `z-0` | Contenido normal |
| `sticky` | `z-10` | Headers de tabla, navbars |
| `dropdown` | `z-20` | Dropdowns, popovers |
| `overlay` | `z-40` | Modal overlay |
| `modal` | `z-50` | Modal content |
| `toast` | `z-60` | Notificaciones toast |
