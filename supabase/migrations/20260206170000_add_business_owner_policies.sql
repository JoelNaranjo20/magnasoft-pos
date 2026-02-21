-- Migration: Add Business Owner Policies (Desktop Setup Fix)
-- Description: Enables authenticated users to create businesses and owners to view/manage their own business.

-- 1. Enable creation of new businesses
-- Matches User Request: Allow any authenticated user to create a row.
DROP POLICY IF EXISTS "Users can create business" ON public.business;
CREATE POLICY "Users can create business" 
ON public.business 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated'
);

-- 2. Enable viewing/editing logic for OWNERS
-- Matches User Request: Check ownership via profile link.
-- Includes SELECT and UPDATE.
DROP POLICY IF EXISTS "Owners can view and update own business" ON public.business;
CREATE POLICY "Owners can view and update own business"
ON public.business
FOR ALL
USING (
  id IN (
    SELECT business_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT business_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);
