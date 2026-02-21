-- Force user_id to be auth.uid() using a database trigger (production-grade security)

-- 1. Crear una función que fuerce el ID del usuario actual
CREATE OR REPLACE FUNCTION public.force_sales_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Sobrescribimos el user_id con el ID real de la sesión, ignorando lo que venga del Frontend
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear el Trigger que se dispara ANTES de insertar
DROP TRIGGER IF EXISTS set_sales_user_id ON public.sales;

CREATE TRIGGER set_sales_user_id
BEFORE INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.force_sales_user_id();

-- 3. Simplificar la política de seguridad (RLS)
-- Ahora podemos confiar plenamente en que el ID será correcto gracias al Trigger
DROP POLICY IF EXISTS "Security: Insert own sales only" ON public.sales;

CREATE POLICY "Security: Insert own sales only"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permitimos insertar porque el Trigger ya garantizó que user_id = auth.uid()
  auth.uid() = user_id
);

-- 4. Recargar esquema
NOTIFY pgrst, 'reload schema';
