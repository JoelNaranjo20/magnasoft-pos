-- ⚠️ PASO 1: Desactivar temporalmente la seguridad para limpiar la casa
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;

-- ⚠️ PASO 2: Borrar TODAS las políticas posibles (por nombre) que hayamos creado hoy
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.sales;
DROP POLICY IF EXISTS "Security: Allow Insert for Auth Users" ON public.sales;
DROP POLICY IF EXISTS "Security: Insert own sales only" ON public.sales;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.sales;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.sales;

-- ⚠️ PASO 3: Borrar el Trigger de user_id (puede estar causando conflicto si el usuario no se detecta bien)
DROP TRIGGER IF EXISTS set_sales_user_id ON public.sales;
DROP FUNCTION IF EXISTS public.force_sales_user_id();

-- ✅ PASO 4: Volver a activar la seguridad (RLS)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- ✅ PASO 5: Crear UNA SOLA política maestra (Lectura y Escritura)
-- Esta política permite TODO (Insertar, Ver, Actualizar) siempre que estés logueado.
CREATE POLICY "System: Full Access for Cashiers"
ON public.sales
FOR ALL  -- Aplica para SELECT, INSERT, UPDATE, DELETE
TO authenticated
USING (true)      -- Permite ver/modificar filas existentes
WITH CHECK (true); -- Permite insertar filas nuevas

-- 🔄 PASO 6: Recargar
NOTIFY pgrst, 'reload schema';
