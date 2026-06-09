# Component Style Contracts: Mejora Visual y UX

**Feature**: 007-mejora-ui-ux  
**Purpose**: Definir las clases Tailwind exactas que cada tipo de componente debe usar. Estos contratos son el estándar contra el cual se verifica la consistencia visual.

---

## Contract 1: Button

### Primary Button
```html
<!-- Base classes -->
<button class="
  inline-flex items-center justify-center gap-2
  px-4 py-2.5
  text-sm font-semibold text-white
  bg-primary hover:bg-[#0b6ddb] dark:hover:bg-[#3b9eff]
  rounded-lg
  shadow-sm hover:shadow-md
  transition-all duration-200 ease-out
  focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
  active:scale-[0.98]
  disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
">
  <Icon /> Label
</button>
```

### Secondary / Cancel Button
```html
<button class="
  inline-flex items-center justify-center gap-2
  px-4 py-2.5
  text-sm font-semibold text-slate-700 dark:text-slate-300
  bg-white dark:bg-slate-800
  border border-slate-300 dark:border-slate-600
  rounded-lg
  hover:bg-slate-50 dark:hover:bg-slate-700
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1
  active:scale-[0.98]
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Cancelar
</button>
```

### Danger Button
```html
<button class="
  inline-flex items-center justify-center gap-2
  px-4 py-2.5
  text-sm font-semibold text-white
  bg-rose-600 hover:bg-rose-700
  dark:bg-rose-500 dark:hover:bg-rose-600
  rounded-lg
  shadow-sm
  transition-all duration-200 ease-out
  focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:ring-offset-1
  active:scale-[0.98]
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Eliminar
</button>
```

### Ghost / Icon Button
```html
<button class="
  p-2
  text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
  hover:bg-slate-100 dark:hover:bg-slate-800
  rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-primary/30
">
  <Icon class="!text-[18px]" />
</button>
```

---

## Contract 2: Input Field

```html
<div class="space-y-1.5">
  <!-- Label -->
  <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
    Nombre del campo
    <span class="text-rose-500" aria-hidden="true">*</span><!-- si requerido -->
  </label>
  
  <!-- Input wrapper (para icono + input) -->
  <div class="relative">
    <Icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-[18px]" />
    <input class="
      w-full pl-10 pr-3 py-2.5
      text-sm text-slate-900 dark:text-slate-100
      bg-white dark:bg-slate-800
      border border-slate-300 dark:border-slate-600
      rounded-lg
      placeholder:text-slate-400 dark:placeholder:text-slate-500
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/50
    " />
  </div>
  
  <!-- Error state -->
  <div class="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
    <Icon class="!text-[14px]">error</Icon>
    <p class="text-xs">Mensaje de error descriptivo.</p>
  </div>
  
  <!-- Hint (optional) -->
  <p class="text-xs text-slate-400 dark:text-slate-500">Texto de ayuda opcional.</p>
</div>
```

---

## Contract 3: Card

### Standard Card
```html
<div class="
  bg-white dark:bg-slate-800
  border border-slate-200 dark:border-slate-700
  rounded-xl
  shadow-sm
  overflow-hidden
">
  <!-- Card content with p-4 -->
</div>
```

### Interactive Card (clickable/hoverable)
```html
<div class="
  bg-white dark:bg-slate-800
  border border-slate-200 dark:border-slate-700
  rounded-xl
  shadow-sm hover:shadow-md
  hover:bg-slate-50 dark:hover:bg-slate-700/50
  transition-all duration-200 ease-out
  cursor-pointer
  active:scale-[0.99]
">
  <!-- Card content -->
</div>
```

### Semantic Card (success/danger/warning/info)
```html
<div class="
  bg-{semantic}-50 dark:bg-{semantic}-950/20
  border border-{semantic}-200 dark:border-{semantic}-800
  rounded-xl
  overflow-hidden
">
  <!-- Header: bg-{semantic}-100/40 dark:bg-{semantic}-900/15 -->
  <!-- Body: standard padding -->
</div>
```

### Hero Metric Card
```html
<div class="
  bg-white dark:bg-slate-800
  border-2 border-{semantic}-200 dark:border-{semantic}-800
  rounded-2xl
  p-5
  text-center
  shadow-sm
">
  <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Label</p>
  <p class="text-3xl font-black text-{semantic}-600 dark:text-{semantic}-400 tabular-nums">
    $1,234,567
  </p>
  <p class="text-[11px] text-slate-400 font-medium mt-1">Subtitle / delta</p>
</div>
```

---

## Contract 4: Modal

```html
<!-- Overlay -->
<div class="
  fixed inset-0 z-40
  bg-black/60 backdrop-blur-sm
  transition-opacity duration-300
">
  <!-- Modal panel -->
  <div class="
    fixed inset-0 z-50
    flex items-center justify-center
    p-4
    overflow-y-auto
  ">
    <div class="
      relative w-full max-w-{size}
      bg-white dark:bg-slate-800
      border border-slate-200 dark:border-slate-700
      rounded-xl
      shadow-2xl
      animate-in slide-in-from-bottom-4 duration-300
    ">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 pt-6 pb-2">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Título</h2>
        <button class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200">
          <Icon class="!text-[20px] text-slate-400">close</Icon>
        </button>
      </div>
      
      <!-- Body (scrolleable if needed) -->
      <div class="px-6 py-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
        <!-- Content -->
      </div>
      
      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
        <button class="...(secondary button)">Cancelar</button>
        <button class="...(primary or danger button)">Confirmar</button>
      </div>
    </div>
  </div>
</div>
```

---

## Contract 5: Table

```html
<div class="
  bg-white dark:bg-slate-800
  border border-slate-200 dark:border-slate-700
  rounded-xl
  overflow-hidden
  shadow-sm
">
  <!-- Table header (optional: search/filter bar) -->
  <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
    <!-- Filters, search, actions -->
  </div>
  
  <!-- Table -->
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead>
        <tr class="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <th class="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Columna
          </th>
          <!-- ... more th -->
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
        <!-- Row odd: bg-white dark:bg-slate-800 -->
        <!-- Row even: bg-slate-50/50 dark:bg-slate-800/30 -->
        <tr class="
          hover:bg-slate-50 dark:hover:bg-slate-700/50
          transition-colors duration-150
        ">
          <td class="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">
            <!-- Numeric columns: text-right tabular-nums -->
            <!-- Status badges: badge component -->
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <!-- Empty state (if no data) -->
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <Icon class="!text-[48px] text-slate-300 dark:text-slate-600 mb-3">inbox</Icon>
    <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">No hay datos</p>
    <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Descripción de por qué no hay datos o qué acción tomar.</p>
  </div>
  
  <!-- Pagination -->
  <div class="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
    <!-- Pagination component -->
  </div>
</div>
```

---

## Contract 6: Badge / Status Indicator

```html
<!-- Success -->
<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
  Completado
</span>

<!-- Danger -->
<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/30 rounded-full">
  <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
  Vencido
</span>

<!-- Warning -->
<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded-full">
  Pendiente
</span>

<!-- Info / Neutral -->
<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-full">
  Info
</span>
```

---

## Contract 7: Loading States

### Skeleton (for data content)
```html
<div class="animate-pulse space-y-3">
  <!-- Skeleton card -->
  <div class="bg-slate-200 dark:bg-slate-700 rounded-lg h-24"></div>
  <!-- Skeleton row -->
  <div class="flex gap-3">
    <div class="bg-slate-200 dark:bg-slate-700 rounded-full h-8 w-8"></div>
    <div class="flex-1 space-y-2">
      <div class="bg-slate-200 dark:bg-slate-700 rounded h-4 w-3/4"></div>
      <div class="bg-slate-200 dark:bg-slate-700 rounded h-3 w-1/2"></div>
    </div>
  </div>
</div>
```

### Spinner (for button actions)
```html
<svg class="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
</svg>
```

---

## Contract 8: Toast / Notification

```html
<div class="
  fixed top-4 right-4 z-60
  flex items-start gap-3
  max-w-sm w-full
  p-4
  bg-white dark:bg-slate-800
  border border-slate-200 dark:border-slate-700
  rounded-xl
  shadow-lg
  animate-in slide-in-from-right-8 duration-300
">
  <!-- Icon (semantic color) -->
  <Icon class="!text-[20px] text-{semantic}-500 flex-shrink-0 mt-0.5">check_circle</Icon>
  
  <div class="flex-1 min-w-0">
    <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Title</p>
    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Description</p>
  </div>
  
  <button class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex-shrink-0">
    <Icon class="!text-[16px] text-slate-400">close</Icon>
  </button>
</div>
```
