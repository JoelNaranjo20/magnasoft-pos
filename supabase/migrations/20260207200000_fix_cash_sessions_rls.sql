-- Drop the generic JWT-based policy
DROP POLICY IF EXISTS "Tenant Isolation" ON public.cash_sessions;

-- 1. SELECT: Users can view cash_sessions from their business
CREATE POLICY "Users can view cash_sessions from their business"
ON public.cash_sessions FOR SELECT
USING (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 2. INSERT: Users can create cash_sessions for their business
CREATE POLICY "Users can create cash_sessions for their business"
ON public.cash_sessions FOR INSERT
WITH CHECK (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. UPDATE: Users can update cash_sessions from their business
CREATE POLICY "Users can update cash_sessions from their business"
ON public.cash_sessions FOR UPDATE
USING (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. DELETE: Users can delete cash_sessions from their business
CREATE POLICY "Users can delete cash_sessions from their business"
ON public.cash_sessions FOR DELETE
USING (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);
