-- Migration: 20260207213000_fix_business_settings_rls.sql
-- Description: Re-enables RLS and adds policies for business_settings after refactor.

-- 1. Ensure RLS is active
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- 2. Clean up old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view settings from their business" ON public.business_settings;
DROP POLICY IF EXISTS "Users can insert settings for their business" ON public.business_settings;
DROP POLICY IF EXISTS "Users can update settings for their business" ON public.business_settings;

-- 3. READ Policy (SELECT)
-- "Users can view settings belonging to their business"
CREATE POLICY "Users can view settings from their business"
ON public.business_settings FOR SELECT
USING (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. INSERT Policy (INSERT)
-- "Users can insert settings only for their business"
CREATE POLICY "Users can insert settings for their business"
ON public.business_settings FOR INSERT
WITH CHECK (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

-- 5. UPDATE Policy (UPDATE)
-- "Users can update settings only for their business"
CREATE POLICY "Users can update settings for their business"
ON public.business_settings FOR UPDATE
USING (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);
