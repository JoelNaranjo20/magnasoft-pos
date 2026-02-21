-- Drop the generic JWT-based policy (which fails if JWT is outdated)
DROP POLICY IF EXISTS "Tenant Isolation" ON public.workers;

-- 1. SELECT: Users can view workers from their business
CREATE POLICY "Users can view workers from their business"
ON public.workers FOR SELECT
USING (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 2. INSERT: Users can create workers for their business
CREATE POLICY "Users can create workers for their business"
ON public.workers FOR INSERT
WITH CHECK (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. UPDATE: Users can update workers from their business
CREATE POLICY "Users can update workers from their business"
ON public.workers FOR UPDATE
USING (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. DELETE: Users can delete workers from their business
CREATE POLICY "Users can delete workers from their business"
ON public.workers FOR DELETE
USING (
  business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);
