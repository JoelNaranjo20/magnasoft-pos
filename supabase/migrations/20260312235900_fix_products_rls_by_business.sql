-- Migration: Fix Products RLS to restrict by business_id
-- Problem: A previous migration (20260216095800_prepare_inventory.sql) set
--   USING (true) on products, exposing all businesses' products to any
--   authenticated user. This migration restores proper multi-tenant filtering.

-- Drop all existing product RLS policies
DROP POLICY IF EXISTS "System: Full Access for Products" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable write access for super_admin" ON public.products;
DROP POLICY IF EXISTS "Business owner full access to products" ON public.products;
DROP POLICY IF EXISTS "Products: Read own business" ON public.products;
DROP POLICY IF EXISTS "Products: Write own business" ON public.products;

-- Ensure RLS is enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only see products from their own business.
-- Super admins can see all.
DROP POLICY IF EXISTS "Products: Read own business" ON public.products;
CREATE POLICY "Products: Read own business"
ON public.products
FOR SELECT
TO authenticated
USING (
  business_id = public.get_my_business_id()
  OR public.is_super_admin()
);

-- INSERT: Users can only insert products for their own business.
DROP POLICY IF EXISTS "Products: Insert own business" ON public.products;
CREATE POLICY "Products: Insert own business"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  business_id = public.get_my_business_id()
  OR public.is_super_admin()
);

-- UPDATE: Users can only update products belonging to their own business.
DROP POLICY IF EXISTS "Products: Update own business" ON public.products;
CREATE POLICY "Products: Update own business"
ON public.products
FOR UPDATE
TO authenticated
USING (
  business_id = public.get_my_business_id()
  OR public.is_super_admin()
)
WITH CHECK (
  business_id = public.get_my_business_id()
  OR public.is_super_admin()
);

-- DELETE: Users can only delete products belonging to their own business.
DROP POLICY IF EXISTS "Products: Delete own business" ON public.products;
CREATE POLICY "Products: Delete own business"
ON public.products
FOR DELETE
TO authenticated
USING (
  business_id = public.get_my_business_id()
  OR public.is_super_admin()
);

-- Reload schema
NOTIFY pgrst, 'reload schema';
