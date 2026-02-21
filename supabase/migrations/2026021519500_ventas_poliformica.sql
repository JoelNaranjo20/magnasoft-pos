-- ⚠️ PASO 1: Limpieza de seguridad en la tabla de ÍTEMS
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;

-- ⚠️ PASO 2: Borrar cualquier política vieja que esté estorbando
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.sale_items;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.sale_items;
DROP POLICY IF EXISTS "Security: Allow Insert for Auth Users" ON public.sale_items;

-- ✅ PASO 3: Volver a activar la seguridad
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- ✅ PASO 4: Crear la Política Maestra (Igual que hicimos en 'sales')
-- Permite insertar y ver los ítems de venta sin restricciones por ahora.
CREATE POLICY "System: Full Access for Sale Items"
ON public.sale_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 🔄 PASO 5: Recargar
NOTIFY pgrst, 'reload schema';