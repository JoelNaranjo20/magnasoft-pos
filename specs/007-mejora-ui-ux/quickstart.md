# Quickstart: Aplicar Mejora Visual a un Componente

**Feature**: 007-mejora-ui-ux

## Flujo Rápido

### 1. Identificar el tipo de componente
Determinar si es: botón, input, card, modal, tabla, badge, o layout. Consultar el contrato correspondiente en [contracts/component-styles.md](./contracts/component-styles.md).

### 2. Aplicar estados interactivos
Asegurar que el componente tiene los 5 estados:

| Estado | Acción |
|--------|--------|
| Normal | ✅ Ya tiene (estilo base) |
| Hover | Agregar `hover:bg-{surface-hover} hover:shadow-sm transition-colors duration-200` |
| Focus | Agregar `focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1` |
| Active | Agregar `active:scale-[0.98]` |
| Disabled | Agregar `disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none` |

### 3. Verificar dark mode
- Todo `bg-white` → `dark:bg-slate-800`
- Todo `text-slate-900` → `dark:text-slate-100`
- Todo `text-slate-700` → `dark:text-slate-300`
- Todo `text-slate-500` → `dark:text-slate-400`
- Todo `border-slate-200` → `dark:border-slate-700`
- Todo valor de color explícito (ej. `text-emerald-600`) → ver si necesita `dark:text-emerald-400`

### 4. Revisar espaciado
Alinear con la escala de tokens: `p-4` (cards), `p-6` (modals), `gap-2`/`gap-3` (listas).

### 5. Verificar tipografía
Alinear con la escala tipográfica: `text-sm` para body, `text-[11px]` para labels, `text-xl font-bold` para títulos de página.

### 6. Probar
Ejecutar `pnpm electron:dev` y verificar el componente en tema claro y oscuro.

## Checklist por Componente

- [ ] ¿El componente tiene los 5 estados visuales (normal, hover, focus, active, disabled)?
- [ ] ¿Todas las clases de color/bg tienen su variante `dark:`?
- [ ] ¿El espaciado usa valores de la escala definida (p-2, p-3, p-4, p-6)?
- [ ] ¿La tipografía respeta la jerarquía (text-xl → text-sm → text-xs)?
- [ ] ¿Los colores semánticos corresponden (emerald=ingreso, rose=egreso, amber=advertencia)?
- [ ] ¿Las animaciones usan `duration-200` o `duration-300` consistente?
- [ ] ¿El componente se ve correctamente en 1366×768?
- [ ] ¿No se modificó ninguna lógica de negocio, store, o RPC?
