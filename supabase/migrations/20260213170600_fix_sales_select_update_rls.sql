-- 1. Eliminar política vieja si existe
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.sales;

-- 2. Crear política para LEER (SELECT)
-- Esto es obligatorio porque tu código hace un .insert().select()
CREATE POLICY "Enable read for authenticated users"
ON public.sales
FOR SELECT
TO authenticated
USING (true);

-- 3. (Por si acaso) Política para ACTUALIZAR (UPDATE)
-- En el futuro querrás cancelar ventas o cambiar su estado
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.sales;

CREATE POLICY "Enable update for authenticated users"
ON public.sales
FOR UPDATE
TO authenticated
USING (true);

-- 4. Recargar el esquema
NOTIFY pgrst, 'reload schema';
