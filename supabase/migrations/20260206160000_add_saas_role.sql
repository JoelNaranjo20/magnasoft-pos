-- Migration: Add saas_role and Dynamic RLS
-- Description: Adds saas_role to profiles avoiding hardcoded emails. Sets up "God Mode" RLS.

-- 1. Add saas_role column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='saas_role') THEN
        ALTER TABLE public.profiles ADD COLUMN saas_role TEXT DEFAULT 'user';
    END IF;
END $$;

-- 2. Enable RLS on tables (Safeguard, usually already active)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business ENABLE ROW LEVEL SECURITY;

-- 3. Create "God Mode" Policy for Profiles
-- Allow Super Admin to do ANYTHING on profiles
DROP POLICY IF EXISTS "Super Admin Full Access Profiles" ON public.profiles;
CREATE POLICY "Super Admin Full Access Profiles"
ON public.profiles
FOR ALL
USING (
  (SELECT saas_role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  (SELECT saas_role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 4. Create "God Mode" Policy for Business
-- Allow Super Admin to do ANYTHING on business
DROP POLICY IF EXISTS "Super Admin Full Access Business" ON public.business;
CREATE POLICY "Super Admin Full Access Business"
ON public.business
FOR ALL
USING (
  (SELECT saas_role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  (SELECT saas_role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 5. INITIAL SETUP: Promote your user to super_admin
-- REPLACE 'tu_email@ejemplo.com' with your actual email in the query below if running manually
-- For now, this tries to update the user running the migration if possible, or you run it manually.
-- WARNING: You must execute the update manually if you are not the one running this via dashboard with your auth.

-- Example:
-- UPDATE public.profiles SET saas_role = 'super_admin' WHERE email = 'YOUR_EMAIL_HERE';
