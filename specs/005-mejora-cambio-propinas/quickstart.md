# Quickstart: Mejora del Sistema de Cambio y Propinas en POS

**Feature**: [spec.md](./spec.md) | **Date**: 2026-06-05

---

## Para el Desarrollador

### Archivos a modificar (orden de implementación)

| Fase | Archivo | Qué cambia | Tamaño |
|---|---|---|---|
| 1 | `apps/desktop/src/types/pos.ts` | Extender `SaleMetadata` con nuevos campos | +15 líneas |
| 2 | `apps/desktop/src/components/modals/PaymentModal.tsx` | Agregar cross-change UI + % propinas + split workers | +120 líneas |
| 3 | `apps/shared/components/modals/SaleDetailsModal.tsx` | Mostrar cross-change y tip info | +40 líneas |
| 4 | `apps/desktop/src/components/modals/SaleDetailsModal.tsx` | Misma vista que shared | +40 líneas |
| 5 | `apps/desktop/src/components/modals/CloseSessionModal.tsx` | Mostrar cambios entregados en resumen | +30 líneas |
| 6 | `apps/desktop/src/components/admin/sessions/SessionHistory.tsx` | Mejorar badge de propinas en comisiones | +15 líneas |
| 7 | `apps/shared/features/sales/Sales.tsx` | Separar cross-change en reconciliación | +20 líneas |

### Orden de implementación recomendado

1. **Tipos primero** — `pos.ts` (Fase 1)
2. **PaymentModal** — el componente central (Fase 2)  
3. **Visualización** — SaleDetailsModal + CloseSessionModal (Fases 3-5)
4. **Vistas de historial** — SessionHistory + Sales.tsx (Fases 6-7)

### Cómo probar

```bash
# 1. Iniciar el app en modo desarrollo
cd apps/desktop && pnpm electron:dev

# 2. Probar flujo básico (sin cambios)
- Crear venta normal con efectivo → confirmar que cierre y movimientos funcionan igual

# 3. Probar cambio cruzado
- Crear venta de $2,000 con pago "transferencia"
- Ingresar monto recibido: $3,500
- Seleccionar "Dar cambio en efectivo: $1,500"
- Verificar:
  ✅ La venta registra transferencia $3,500
  ✅ Se crea cash_movement expense por $1,500 en efectivo
  ✅ El cierre de caja refleja -$1,500 en efectivo

# 4. Probar propinas con porcentaje
- Crear venta de $5,000
- Presionar botón "15%" → debe mostrar $750
- Ajustar si es necesario → asignar trabajador

# 5. Probar propina con método independiente
- Venta de $3,000 con tarjeta
- Agregar propina $300
- Marcar "Propina en efectivo"
- Verificar:
  ✅ Sale.card_amount = $3,000 (sin propina)
  ✅ metadata.tip_payment_method = 'cash'
  ✅ Comisión creada correctamente

# 6. Build de producción
pnpm build
```

### Puntos de atención (no romper)

- **PaymentModal tiene 95KB** — no refactorizar, solo añadir
- **El cálculo de `change` existente** (línea 282) debe seguir funcionando para pagos cash sin cross-change
- **CloseSessionModal** ya lee `metadata.tip_amount` — verificar que sigue funcionando con los nuevos campos
- **Sales.tsx reconciliación** (líneas 320-453) — debe adaptarse a `tip_payment_method` para separar correctamente
- **No hay migraciones SQL nuevas** — todo es JSONB metadata + uso de tablas existentes
