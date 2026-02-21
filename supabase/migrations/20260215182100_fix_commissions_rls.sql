-- ⚠️ PASO 1: Limpieza de seguridad en la tabla de COMISIONES
ALTER TABLE public.worker_commissions DISABLE ROW LEVEL SECURITY;

-- ⚠️ PASO 2: Borrar políticas viejas que estén estorbando
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.worker_commissions;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.worker_commissions;
DROP POLICY IF EXISTS "Security: Allow Insert for Auth Users" ON public.worker_commissions;

-- ✅ PASO 3: Volver a activar la seguridad
ALTER TABLE public.worker_commissions ENABLE ROW LEVEL SECURITY;

-- ✅ PASO 4: Crear la Política Maestra para Comisiones
-- Permite al cajero registrar cuánto ganó el barbero por el corte.
CREATE POLICY "System: Full Access for Commissions"
ON public.worker_commissions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 🔄 PASO 5: Recargar esquema
NOTIFY pgrst, 'reload schema';
