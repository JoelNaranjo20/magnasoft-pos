-- 1. Agregar la columna faltante 'user_id' (Quién hizo el movimiento)
ALTER TABLE public.cash_movements 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. (Preventivo) Agregar columna para saber a qué trabajador se le pagó (si aplica)
ALTER TABLE public.cash_movements 
ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.workers(id);

-- 3. (Preventivo) Asegurar que exista business_id
ALTER TABLE public.cash_movements 
ADD COLUMN IF NOT EXISTS business_id UUID;

-- ⚠️ PASO 4: Desbloquear permisos (RLS) para esta tabla
-- Para evitar que te salga el error 42501 en el siguiente intento.
ALTER TABLE public.cash_movements DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.cash_movements;
DROP POLICY IF EXISTS "System: Full Access for Cash Movements" ON public.cash_movements;

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System: Full Access for Cash Movements"
ON public.cash_movements
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Recargar esquema
NOTIFY pgrst, 'reload schema';
