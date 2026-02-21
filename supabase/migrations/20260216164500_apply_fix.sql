-- 1. Habilitar RLS (por si acaso)
ALTER TABLE public.central_cash_movements ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar las políticas viejas (incluyendo las de Antigravity que fallaron)
DROP POLICY IF EXISTS "Enable read access for authenticated users with same business_id" ON public.central_cash_movements;
DROP POLICY IF EXISTS "Enable insert for authenticated users with same business_id" ON public.central_cash_movements;
DROP POLICY IF EXISTS "Enable update for authenticated users with same business_id" ON public.central_cash_movements;
DROP POLICY IF EXISTS "Enable delete for authenticated users with same business_id" ON public.central_cash_movements;
DROP POLICY IF EXISTS "policy_select_central_cash_movements" ON public.central_cash_movements;
DROP POLICY IF EXISTS "policy_insert_central_cash_movements" ON public.central_cash_movements;
DROP POLICY IF EXISTS "policy_update_central_cash_movements" ON public.central_cash_movements;
DROP POLICY IF EXISTS "policy_delete_central_cash_movements" ON public.central_cash_movements;

-- -------------------------------------------------------------------------
-- 3. Crear Políticas Nuevas (Basadas en Consultas, no en JWT)
-- -------------------------------------------------------------------------

-- A. Lectura (SELECT): Permitir ver movimientos si el usuario pertenece al mismo negocio
CREATE POLICY "policy_select_central_cash_movements"
ON public.central_cash_movements
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- B. Inserción (INSERT): Permitir crear pagos si el usuario es del negocio
-- ESTA ES LA QUE TE ESTABA FALLANDO
CREATE POLICY "policy_insert_central_cash_movements"
ON public.central_cash_movements
FOR INSERT
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- C. Actualización (UPDATE)
CREATE POLICY "policy_update_central_cash_movements"
ON public.central_cash_movements
FOR UPDATE
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- D. Borrado (DELETE)
CREATE POLICY "policy_delete_central_cash_movements"
ON public.central_cash_movements
FOR DELETE
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 4. Asegurar Permisos básicos
GRANT ALL ON TABLE public.central_cash_movements TO authenticated;
GRANT ALL ON TABLE public.central_cash_movements TO service_role;
