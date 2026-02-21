-- 1. Asegurar que los PRODUCTOS tengan control de stock
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock NUMERIC(10, 2) DEFAULT 5,
ADD COLUMN IF NOT EXISTS cost NUMERIC(15, 2) DEFAULT 0;

-- 2. Crear/Asegurar la tabla de MOVIMIENTOS DE INVENTARIO (Bitácora)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    product_id UUID REFERENCES public.products(id),
    worker_id UUID REFERENCES public.workers(id),
    business_id UUID, -- Multi-tenancy vital
    quantity NUMERIC(10, 2) NOT NULL, -- Positivo (entrada) o Negativo (salida)
    movement_type TEXT NOT NULL, -- 'SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN'
    notes TEXT
);

-- 3. Crear ÍNDICES para que el historial cargue rápido
CREATE INDEX IF NOT EXISTS idx_inventory_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_business ON public.inventory_movements(business_id);

-- ⚠️ 4. PERMISOS (RLS): Abrir la puerta para que el Cajero pueda modificar stock

-- A) Tabla PRODUCTS: El cajero necesita poder hacer UPDATE (restar stock)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System: Full Access for Products" ON public.products;

CREATE POLICY "System: Full Access for Products"
ON public.products
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- B) Tabla INVENTORY_MOVEMENTS: El cajero necesita poder hacer INSERT (registrar la baja)
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System: Full Access for Movements" ON public.inventory_movements;

CREATE POLICY "System: Full Access for Movements"
ON public.inventory_movements
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Recargar esquema
NOTIFY pgrst, 'reload schema';
