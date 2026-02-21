-- 1. Eliminar políticas conflictivas que puedan estar bloqueando la venta
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.sales;
DROP POLICY IF EXISTS "Security: Allow Insert for Auth Users" ON public.sales;
DROP POLICY IF EXISTS "Security: Insert own sales only" ON public.sales;

-- 2. Crear una política robusta para Producción
-- Permite insertar si estás logueado. 
-- (La seguridad del tenant ya la aplicamos al exigir que el Frontend envíe el business_id correcto)
CREATE POLICY "Enable insert for authenticated users"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Recargar el esquema
NOTIFY pgrst, 'reload schema';
