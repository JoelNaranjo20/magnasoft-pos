-- 1. SOLUCIÓN CRÍTICA: Permitir que el usuario lea su propio perfil
-- Si esto falta, la subquery (SELECT business_id FROM profiles) siempre devuelve NULL
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- 3. Reforzar la política de Roles (Borrar la anterior y poner esta versión mejorada)
DROP POLICY IF EXISTS "Users can create roles for their business" ON public.roles;

CREATE POLICY "Users can create roles for their business"
ON public.roles FOR INSERT
WITH CHECK (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. Permitir lectura de roles (para que no te de error 404 después de crear)
DROP POLICY IF EXISTS "Users can view roles from their business" ON public.roles;
CREATE POLICY "Users can view roles from their business"
ON public.roles FOR SELECT
USING (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

-- 5. Permitir actualizar roles
DROP POLICY IF EXISTS "Users can update roles from their business" ON public.roles;
CREATE POLICY "Users can update roles from their business"
ON public.roles FOR UPDATE
USING (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

-- 6. Permitir eliminar roles
DROP POLICY IF EXISTS "Users can delete roles from their business" ON public.roles;
CREATE POLICY "Users can delete roles from their business"
ON public.roles FOR DELETE
USING (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);
