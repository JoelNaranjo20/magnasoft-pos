-- Strengthen RLS policy for sales table to only allow users to insert their own sales

-- 1. Borrar la política permisiva anterior
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.sales;

-- 2. Crear política estricta:
-- "Solo permito insertar si el user_id que viene en la venta es EL MISMO que el usuario logueado"
CREATE POLICY "Security: Insert own sales only"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Recargar la configuración
NOTIFY pgrst, 'reload schema';
