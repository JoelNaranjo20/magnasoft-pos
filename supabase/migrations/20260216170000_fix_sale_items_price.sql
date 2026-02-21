-- 1. Agregar la columna de precio histórico si no existe
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS price NUMERIC(15, 2) DEFAULT 0;

-- 2. REPARACIÓN DE DATOS (Backfill) - CRÍTICO 🚑
-- Si las ventas viejas tienen precio 0 o NULL, copiamos el precio actual del producto/servicio.
-- Esto hará que tus gráficas antiguas cobren vida.

-- Reparar Productos
UPDATE public.sale_items si
SET price = p.price
FROM public.products p
WHERE si.product_id = p.id
AND (si.price IS NULL OR si.price = 0);

-- Reparar Servicios
UPDATE public.sale_items si
SET price = s.price
FROM public.services s
WHERE si.service_id = s.id
AND (si.price IS NULL OR si.price = 0);

-- 3. Asegurar permisos (RLS) para que el Dashboard pueda leer esto
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Note: Using a safe policy creation/replacement approach
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'sale_items'
        AND policyname = 'Ver ventas del propio negocio'
    ) THEN
        CREATE POLICY "Ver ventas del propio negocio" 
        ON public.sale_items FOR SELECT 
        TO authenticated 
        USING (business_id = (auth.jwt() ->> 'business_id')::uuid);
    END IF;
END
$$;

-- 4. Refrescar caché
NOTIFY pgrst, 'reload schema';
