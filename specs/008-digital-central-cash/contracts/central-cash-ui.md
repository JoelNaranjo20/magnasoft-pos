# UI Contract: Caja Central — 3 Vistas

**Feature**: 008-digital-central-cash  
**Version**: v3

---

## Contract 1: Barra de Tabs

```
┌──────────────────────────────────────────────────────────┐
│  [💰 Efectivo]    [🏦 Transferencia]    [📊 Total General] │
└──────────────────────────────────────────────────────────┘
```

- Tab activo: `bg-primary text-white shadow-md`
- Tab inactivo: `text-slate-500 hover:text-slate-700 dark:text-slate-400`
- Transición: `transition-colors duration-200`
- Badge con monto pequeño en cada tab: `$1.2M`, `$450K`, `$1.65M`

---

## Contract 2: Tab "Efectivo Disponible" y "Transferencia Disponible"

Estructura idéntica, solo cambia el origen de datos.

```
┌──────────────────────────────────────────────────────────┐
│  ┌─ Hero Card ────────────────────────────────────────┐  │
│  │  💰 Efectivo Disponible                            │  │
│  │  $1,234,567                                        │  │
│  │  ↑ +$45,000 este mes                               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ▼ Hoy                              Efectivo: +$385,000  │
│  │  ┌──────────────────────────────────────────────────┐ │
│  │  │ + $150,000  Cierre #a1b2  10:30 PM  🔵 Turno   │ │
│  │  │ + $235,000  Cierre #c3d4  11:45 PM  🔵 Turno   │ │
│  │  └──────────────────────────────────────────────────┘ │
│                                                          │
│  ▶ Ayer                             Efectivo: +$210,000  │
│  (colapsado)                                             │
│                                                          │
│  ▶ 7 junio                           Efectivo: +$95,000  │
│  (colapsado)                                             │
└──────────────────────────────────────────────────────────┘
```

### Reglas:
- Agrupación por día con acordeón
- Solo el día actual y el anterior expandidos por defecto
- Cada fila muestra: signo, monto, descripción, hora, badge de tipo
- Badge "Turno" = movimiento con `session_id`
- Badge "Manual" = sin `session_id`
- Total del día en el encabezado del acordeón

---

## Contract 3: Tab "Total General"

```
┌──────────────────────────────────────────────────────────┐
│  ┌─ Hero Card ────────────────────────────────────────┐  │
│  │  📊 Balance Total                                  │  │
│  │  $1,654,321                                        │  │
│  │  💰 Efectivo: $1.2M  |  🏦 Transferencia: $450K   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ─── Resumen Mensual ──────────────────────────────────  │
│                                                          │
│  ▼ Junio 2026          Entradas    Gastos      Neto     │
│  │                     $5.2M      −$1.8M     +$3.4M    │
│  │                                                      │
│  │  📥 Entradas del Mes                                │
│  │  ┌────────────────────────────────────────────────┐  │
│  │  │ Cierres de Turno (12 sesiones)       $4.8M     │  │
│  │  │   Efectivo: $3.2M · Transferencia: $1.6M       │  │
│  │  │ Ingresos Manuales (3)                 $0.4M     │  │
│  │  └────────────────────────────────────────────────┘  │
│  │                                                      │
│  │  📤 Gastos del Mes                                  │
│  │  ┌────────────────────────────────────────────────┐  │
│  │  │ 💰 Comisiones Pagadas a Trabajadores   −$0.8M  │  │
│  │  │ 👷 Salarios / Adelantos / Préstamos    −$0.6M  │  │
│  │  │ 📌 Otros Egresos Manuales              −$0.4M  │  │
│  │  └────────────────────────────────────────────────┘  │
│                                                          │
│  ▶ Mayo 2026           Entradas    Gastos      Neto     │
│  (colapsado)            $4.8M      −$1.5M     +$3.3M    │
│                                                          │
│  ▶ Abril 2026          Entradas    Gastos      Neto     │
│  (colapsado)            $4.2M      −$1.3M     +$2.9M    │
└──────────────────────────────────────────────────────────┘
```

### Reglas:
- Sección de resumen mensual usa los mismos movimientos, agrupados por `created_at` por mes
- Entradas = todos los `income` del mes (cierres + manuales)
- Gastos = todos los `expense` del mes, categorizados:
  - "Comisiones Pagadas": egresos con `description ILIKE '%comisión%'` o del metadata `commissions_paid`
  - "Salarios / Préstamos": egresos con `description ILIKE '%préstamo%' OR '%salario%'`
  - "Otros Egresos": el resto
- Solo el mes actual expandido por defecto
- Hasta 12 meses visibles (último año)

---

## Contract 4: Formulario de movimiento manual (actualizado)

```
┌─ Registrar Movimiento ──────────────────────────────────┐
│  [Egreso] [Ingreso]                                      │
│                                                          │
│  Monto: [$________]                                      │
│                                                          │
│  Método: [💰 Efectivo] [🏦 Transferencia]                │
│                                                          │
│  Descripción: [________________]                         │
│                                                          │
│  [Registrar Egreso / Ingreso]                            │
└──────────────────────────────────────────────────────────┘
```

- Selector de método de pago OBLIGATORIO (ya no opcional)
- Botones de método con estilo toggle (seleccionado = coloreado)
