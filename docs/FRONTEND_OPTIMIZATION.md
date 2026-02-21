# Frontend Optimization Guide: Polymorphic Lists

## Challenge
Rendering lists of 500+ items where each item has different structures (JSONB metadata) can cause:
1.  **Layout Shifts (CLS)**: As images or custom fields load.
2.  **JS Thread Blocking**: Parsing complex JSON for every row.
3.  **DOM Bloat**: Too many elements in the DOM.

## Recommendations

### 1. Virtualization (Mandatory for >100 rows)
Use **TanStack Virtual** (react-virtual). It only renders the items currently in the viewport.

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

// ... setup virtualizer on your container ref
const rowVirtualizer = useVirtualizer({
  count: products.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50, // Estimate row height
});

return (
  <div ref={parentRef} className="h-[500px] overflow-auto">
    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div key={virtualRow.key} style={{ transform: `translateY(${virtualRow.start}px)` }}>
             <ProductRow product={products[virtualRow.index]} />
          </div>
        ))}
    </div>
  </div>
);
```

### 2. Memoized Metadata Parsing
Do NOT parse JSONB in the render function. Parse it once when data data arrives or use `useMemo`.

```tsx
// ❌ WRONG: Parsed every render
const color = JSON.parse(product.metadata).color;

// ✅ RIGHT: Memoized
const metadata = useMemo(() => {
    return typeof product.metadata === 'string' 
        ? JSON.parse(product.metadata) 
        : product.metadata;
}, [product.metadata]);
```

### 3. Skeleton Loading for Variable Heights
If your "Automotive" cards are taller than "Retail" cards:
- Define a base height for the skeleton matching the *average* height.
- Use `contain-intrinsic-size` css property to prevent scrollbar jumping if using browser-native virtualization.

### 4. Database-Side Full Text Search
Don't filter 10,000 rows in JS. Use Supabase Text Search.
- Create an RPC or use `.textSearch()` on a generated column that combines `name` + `metadata->>'brand'`.

## Implementation Checklist
- [ ] Install `@tanstack/react-virtual`
- [ ] Refactor `ProductList.tsx` to use virtualization
- [ ] Add `useMemo` for metadata accessors
