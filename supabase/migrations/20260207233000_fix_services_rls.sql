-- Migration: 20260207233000_fix_services_rls.sql
-- Description: Fixes RLS policies for services table to allow INSERT/UPDATE.

-- Enable RLS (idempotent)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view services from their business" ON public.services;
DROP POLICY IF EXISTS "Users can create services for their business" ON public.services;
DROP POLICY IF EXISTS "Users can update services from their business" ON public.services;
DROP POLICY IF EXISTS "Users can delete services from their business" ON public.services;

-- Create Policies

-- SELECT: Users can see services belonging to their business
CREATE POLICY "Users can view services from their business"
ON public.services FOR SELECT
USING (business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- INSERT: Users can create services for their business
CREATE POLICY "Users can create services for their business"
ON public.services FOR INSERT
WITH CHECK (business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- UPDATE: Users can update services belonging to their business
CREATE POLICY "Users can update services from their business"
ON public.services FOR UPDATE
USING (business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- DELETE: Users can delete services belonging to their business
CREATE POLICY "Users can delete services from their business"
ON public.services FOR DELETE
USING (business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- Grant permissions
GRANT ALL ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
