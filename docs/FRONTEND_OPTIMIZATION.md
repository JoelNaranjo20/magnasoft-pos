# Guía de Optimización Frontend — Magnasoft POS

**Actualizado**: 2026-06-05

---

## Contexto Real

El proyecto tiene componentes grandes que merecen atención de performance:

| Componente | Tamaño | Riesgo |
|---|---|---|
| `PaymentModal.tsx` | ~1825 líneas | Componente más crítico. Cualquier cambio requiere verificación de no regresión. |
| `POSCart.tsx` | ~927 líneas | Multi-carrito (mesas), múltiples modales anidados |
| `Sales.tsx` (shared) | ~1100+ líneas | Reconciliación de ventas, filtros, gráficos |
| `CustomerUnify.tsx` | ~830 líneas | Detección de duplicados, unificación en tiempo real |

---

## Recomendaciones Aplicables

### 1. Memoización de Parsing JSONB

Supabase devuelve `metadata` como objeto JavaScript (no como string JSON), así que no se requiere `JSON.parse()`. El problema real es re-renderizados por cambio de referencia:

```tsx
// ❌ WRONG: metadata se recrea en cada render
const tip = sale.metadata?.tip_amount || 0;

// ✅ RIGHT: memoizar el objeto sale completo si se usa en listas
const MemoizedSaleRow = React.memo(({ sale }: { sale: Sale }) => {
    const tip = sale.metadata?.tip_amount || 0;
    // ...
});
```

### 2. Virtualización para Listas >100 ítems

Componentes candidatos:
- `Sales.tsx`: historial de ventas (puede tener cientos de filas)
- `SessionHistory.tsx`: lista de sesiones
- `CustomerManager.tsx`: tabla de clientes

Usar `react-virtual` (ya instalado en algunos proyectos) o paginación server-side.

### 3. Evitar Re-renderizados en PaymentModal

`PaymentModal` tiene 30+ estados. Para prevenir ciclos de renderizado:
- Agrupar estados relacionados en objetos (ya se hace parcialmente con `splitAmounts`)
- Usar `useReducer` para lógica de pago compleja (método + montos + propinas + cross-change)
- Extraer secciones independientes (numpad, propinas, resumen) a componentes internos

### 4. Realtime Subscriptions

`useBusinessStore.subscribeToChanges()` y `useTableStore.subscribeToTables()` usan Supabase Realtime. Asegurarse de:
- Cancelar suscripciones en cleanup del hook
- No duplicar canales al re-renderizar

---

## No Aplicable Actualmente

Estas recomendaciones del doc original ya no aplican:

- ~~`JSON.parse(product.metadata)`~~ — Supabase devuelve JSONB como objeto nativo
- ~~`ProductList.tsx`~~ — No existe como componente único. Los productos se renderizan en `POSProductGrid` con el sistema de categorías + tabs
- ~~`@tanstack/react-virtual`~~ — No está instalado actualmente. Evaluar si se necesita vs paginación simple
