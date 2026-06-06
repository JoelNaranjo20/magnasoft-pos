# Sistema POS — Pago, Propinas y Cambio Cruzado

**Actualizado**: 2026-06-05

---

## Componentes del POS

| Componente | Archivo | Propósito |
|---|---|---|
| `POSLayout` | `apps/desktop/src/components/pos/POSLayout.tsx` | Layout principal del POS |
| `POSCart` | `apps/desktop/src/components/pos/POSCart.tsx` | Carrito de compras, sidebar derecha |
| `PaymentModal` | `apps/desktop/src/components/modals/PaymentModal.tsx` | ★ Modal de cobro (1825 líneas) |
| `POSProductGrid` | `apps/desktop/src/components/pos/POSProductGrid.tsx` | Grid de productos/servicios |
| `POSCustomerSection` | `apps/desktop/src/components/pos/POSCustomerSection.tsx` | Búsqueda y selección de cliente |
| `POSTopBar` | `apps/desktop/src/components/pos/POSTopBar.tsx` | Barra superior con búsqueda y acciones |
| `POSPatio` | `apps/desktop/src/components/pos/POSPatio.tsx` | Plano de mesas (restaurante) |
| `CategoryTabs` | `apps/desktop/src/components/pos/CategoryTabs.tsx` | Pestañas de categorías |
| `EditPriceModal` | `apps/desktop/src/components/modals/EditPriceModal.tsx` | Descuentos y ajustes de precio |

---

## PaymentModal — Arquitectura

**Archivo**: [`apps/desktop/src/components/modals/PaymentModal.tsx`](../../apps/desktop/src/components/modals/PaymentModal.tsx)

1825 líneas. Es el componente más complejo y crítico del sistema. Cualquier cambio requiere verificación exhaustiva de no regresión.

### Métodos de Pago

| Método | UI | Lógica |
|---|---|---|
| `cash` | Teclado numérico + monto recibido | `change = received - total - tip` |
| `transfer` | Input de monto recibido editable | `transferAmount` por defecto = total |
| `card` | Input de monto cobrado editable | `cardAmount` por defecto = total |
| `credit` | Solo confirmación | Crea deuda en `customer_debts` |
| `mixed` | Split entre cash/transfer/card/credit | Inputs individuales, suma debe = total |

### Estados de Propina

| Estado | Tipo | Propósito |
|---|---|---|
| `tipAmount` | `string` | Monto de propina |
| `tipWorkerId` | `string` | Trabajador único (cuando no hay split) |
| `showTip` | `boolean` | Sección colapsada/expandida |
| `tipSplitEnabled` | `boolean` | Modo repartir entre varios trabajadores |
| `tipSplits` | `Array<{workerId, amount}>` | Distribución por trabajador |
| `tipPaymentMethod` | `string` | `''` = mismo que venta, `'cash'`, `'transfer'`, `'card'` |

### Estados de Cambio Cruzado

| Estado | Tipo | Propósito |
|---|---|---|
| `crossChangeEnabled` | `boolean` | Activar cambio en método distinto |
| `crossChangeToMethod` | `'cash' \| 'transfer'` | Método destino del cambio |

---

## Propinas — Flujo Completo

### Porcentajes Rápidos

Tres botones predefinidos: **[10%]** **[15%]** **[20%]**

```typescript
setTipAmount(String(Math.round(total * pct / 100)));
```

El cajero puede ajustar manualmente después. Si el porcentaje coincide exactamente con 10, 15 o 20, se guarda en `metadata.tip_percentage`.

### Propina Única (comportamiento por defecto)

1. Se selecciona trabajador en dropdown "¿Para quién?"
2. Si no se selecciona, usa `generalWorkerId` como fallback
3. Al confirmar venta: se inserta un registro en `worker_commissions` con `service_type = 'tip'`

### Propina Repartida (Split)

1. Botón "Repartir propina" → activa `tipSplitEnabled`
2. Se agregan filas dinámicas: trabajador + monto
3. Al confirmar venta: se insertan múltiples registros en `worker_commissions` con `service_type = 'tip_split'`
4. `metadata.tip_worker_id = null`, `metadata.tip_distribution = [{ worker_id, amount }]`

### Método de Pago Independiente

Dropdown "Misma forma de pago" / "Propina en efectivo" / "Propina por transferencia" / "Propina con tarjeta":

- Si es **igual** al método de venta (`tipPaymentMethod === ''` o `=== method`):  
  La propina se suma al monto del pago (`cash_amount = total + tip`)
- Si es **diferente**:  
  `effectiveTipForPayment = 0` → la propina NO se suma al monto de la venta. Solo se registra en metadata para trazabilidad.

### Dejar Cambio como Propina

- **Modo efectivo**: Cuando `change > 0`, botón "Dejar como Propina" → `setTipAmount(change.toString())`
- **Modo transferencia/tarjeta**: Cuando el monto recibido > total, botón "Diferencia $X como Propina"

---

## Cambio Cruzado — Flujo Completo

### Escenario: Pago con transferencia, cambio en efectivo

1. El cajero ingresa `transferAmount = 3500` (venta total = 2000)
2. Aparece el botón "Dar cambio en efectivo: $1,500"
3. Al hacer clic, `crossChangeEnabled = true`, `crossChangeToMethod = 'cash'`
4. Al confirmar venta:
   - **Venta**: `transfer_amount = 3500`, `total_amount = 2000`
   - **Metadata**: `cross_change: { from_method: 'transfer', to_method: 'cash', amount: 1500 }`
   - **cash_movement**: `{ type: 'expense', payment_method: 'cash', amount: 1500, description: 'Cambio cruzado - Venta #XXX - TRANSFER a CASH' }`

### Escenario: Pago en efectivo, cambio por transferencia

1. El cajero ingresa `2000` en efectivo (venta total = 1800, `change = 200`)
2. Aparece el botón "Dar cambio por transferencia: $200"
3. Al hacer clic, `crossChangeEnabled = true`, `crossChangeToMethod = 'transfer'`
4. Al confirmar venta:
   - **Venta**: `cash_amount = 2000`, `total_amount = 1800`
   - **Metadata**: `cross_change: { from_method: 'cash', to_method: 'transfer', amount: 200 }`
   - **cash_movement**: `{ type: 'expense', payment_method: 'transfer', amount: 200, description: 'Cambio cruzado - Venta #XXX - CASH a TRANSFER' }`

### Exclusión Mutua con Propina

Cambio cruzado y propina **no pueden coexistir** sobre el mismo excedente. Activar uno desactiva el otro:
- Al activar cross-change → `setTipAmount('')` 
- Al activar propina → `setCrossChangeEnabled(false)`

---

## Metadata de Venta (SaleMetadata)

**Archivo de tipos**: [`apps/desktop/src/types/pos.ts`](../../apps/desktop/src/types/pos.ts)

```typescript
interface SaleMetadata {
    // Core
    business_type: 'automotive' | 'retail' | 'restaurant' | 'barbershop';
    created_from: 'desktop_pos' | 'web_pos';

    // Tip / Propina
    tip_amount?: number;
    tip_worker_id?: string | null;
    tip_payment_method?: 'cash' | 'transfer' | 'card';
    tip_percentage?: number;              // solo si es 10, 15 o 20
    tip_distribution?: Array<{ worker_id: string; amount: number }>;

    // Cambio cruzado
    cross_change?: {
        from_method: 'cash' | 'transfer' | 'card';
        to_method: 'cash' | 'transfer' | 'card';
        amount: number;
    };

    // Industria específica
    table_id?: string;       // restaurante
    table_number?: number;   // restaurante
    diners?: number;         // restaurante
    stylist_id?: string;     // barbería
    appointment_id?: string; // barbería
    mileage?: number;        // automotriz
    vehicle_notes?: string;  // automotriz
    quick_sale_name?: string;     // retail
    quick_sale_reference?: string; // retail
    sale_notes?: string;
}
```

---

## Visualización de Propinas y Cambios

### SaleDetailsModal (Desktop + Shared)

Al abrir el detalle de una venta, se muestran badges visuales:

- 🔀 **Cambio cruzado**: `"Cambio: $1,500 devuelto en efectivo"` (ícono `swap_horiz`, color sky)
- 💰 **Propina**: `"Propina: $600 (15%) → trabajador asignado"` (ícono `volunteer_activism`, color ámbar)
- Si `tip_payment_method ≠ payment_method`: `"Propina pagada en efectivo"` (texto secundario)

### SessionHistory

En la tabla de comisiones:
- `service_type === 'tip'` → ícono `volunteer_activism` (corazón) + "Propina"
- `service_type === 'tip_split'` → ícono `group` (grupo) + "Propina (Repartida)"

---

## Carrito de Compras (useCartStore)

**Archivo**: [`apps/desktop/src/store/useCartStore.ts`](../../apps/desktop/src/store/useCartStore.ts)

Soporta **múltiples carritos** (`carts: Record<string, CartData>`) con `activeCartId`. Usado para mesas de restaurante (cada mesa tiene su carrito independiente).

**CartItem**: `cartId`, `id`, `name`, `price`, `originalPrice`, `quantity`, `type` (product/service), `originalItem`, `workerId`, `commissionEnabled`

**Acciones**: `addItem`, `removeItem`, `updateQuantity`, `updatePrice`, `applyGlobalDiscount`, `toggleCommission`, `clearCart`, `clearTableCart`, `setCustomer`, `setActiveCart`
