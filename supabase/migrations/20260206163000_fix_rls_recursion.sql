-- Migration: Fix RLS Recursion & Enable User Updates
-- Description: Fixes infinite loop for Admins and enables profile updates for Users.

-- 1. Create a secure function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_my_saas_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER -- Ejecuta con permisos de Admin (bypass RLS)
SET search_path = public -- Buena práctica de seguridad para evitar hijacking
STABLE -- Optimización de rendimiento (cachea el resultado por transacción)
AS $$
  SELECT saas_role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Drop potential conflicting policies
DROP POLICY IF EXISTS "Super Admin Full Access Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. ADMIN POLICY: God Mode
CREATE POLICY "Super Admin Full Access Profiles"
ON public.profiles
FOR ALL
USING (
  public.get_my_saas_role() = 'super_admin'
)
WITH CHECK (
  public.get_my_saas_role() = 'super_admin'
);

-- 4. USER POLICY: View Own Profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
);

-- 5. USER POLICY: Update Own Profile (VITAL PARA EL SETUP)
-- Esto permite que el usuario guarde su business_id al instalar
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );

-- 6. Helper: Apply logic to Business table
DROP POLICY IF EXISTS "Super Admin Full Access Business" ON public.business;
CREATE POLICY "Super Admin Full Access Business"
ON public.business
FOR ALL
USING (
  public.get_my_saas_role() = 'super_admin'
)
WITH CHECK (
  public.get_my_saas_role() = 'super_admin'
);