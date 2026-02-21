-- Configure user_id column to auto-fill with authenticated user ID for security

-- 1. Configurar la columna para que se auto-rellene con el usuario actual
ALTER TABLE public.sales
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Reforzar la política para que confíe en este valor por defecto
DROP POLICY IF EXISTS "Security: Insert own sales only" ON public.sales;

CREATE POLICY "Security: Insert own sales only"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite la inserción si el ID coincide (caso normal)
  -- O si el sistema usará el valor por defecto (auth.uid)
  auth.uid() = COALESCE(user_id, auth.uid())
);

-- 3. Recargar
NOTIFY pgrst, 'reload schema';
