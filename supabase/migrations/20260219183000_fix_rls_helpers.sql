-- Migration: Fix RLS Helpers Fallback
-- Description: Updates the RLS helper functions to fallback to the profiles table if JWT metadata is missing.

CREATE OR REPLACE FUNCTION public.get_my_business_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid,
    (SELECT business_id FROM public.profiles WHERE id = auth.uid()),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin',
    (SELECT saas_role FROM public.profiles WHERE id = auth.uid()) = 'super_admin',
    false
  );
END;
$$;
