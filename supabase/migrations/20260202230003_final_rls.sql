-- =========================================================
-- PRODUCTION-READY RLS POLICIES V3 FINAL
-- JWT-based policies for O(1) performance
-- Includes: Super Admin Controls for Licensing Module
-- =========================================================

-- 1. JWT-BASED HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_my_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin',
    false
  );
$$;

-- 2. ENABLE RLS ON ALL TABLES
ALTER TABLE public.business ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.central_cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES POLICY (Self-access)
CREATE POLICY "Profile Self Access"
ON public.profiles
FOR ALL
TO authenticated
USING (
  id = auth.uid()
  OR public.is_super_admin()
);

-- 4. BUSINESS POLICY (Owner + Super Admin)
CREATE POLICY "Business Access"
ON public.business
FOR ALL
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_super_admin()
);

-- 5. ACTIVATION CODES POLICY (LICENSING MODULE)
-- Super Admin has FULL control to create/revoke licenses
-- Business owners can only SELECT their own codes
CREATE POLICY "Super Admin Full Control"
ON public.activation_codes
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Owner View Own Licenses"
ON public.activation_codes
FOR SELECT
TO authenticated
USING (
  business_id = public.get_my_business_id()
  AND NOT public.is_super_admin()
);

-- 6. BUSINESS SETTINGS POLICY (Tenant Isolation)
CREATE POLICY "Tenant Isolation"
ON public.business_settings
FOR ALL
TO authenticated
USING (
  business_id = public.get_my_business_id()
  OR public.is_super_admin()
);

-- 7. TENANT ISOLATION POLICY (All other tables)
-- Universal pattern for all business data

CREATE POLICY "Tenant Isolation" ON public.workers
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.customers
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.vehicles
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.products
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.services
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.cash_sessions
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.sales
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.sale_items
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.cash_movements
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.service_queue
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.service_queue_items
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.central_cash_movements
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.worker_commissions
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.worker_loans
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.worker_loan_payments
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.customer_debts
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Tenant Isolation" ON public.debt_payments
FOR ALL TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

-- =========================================================
-- LICENSING MODULE NOTES
-- =========================================================
-- Super Admin can:
--   - CREATE activation codes for any business
--   - UPDATE status (activate/revoke)
--   - DELETE codes
--   - VIEW all codes across all businesses
--
-- Business Owner can:
--   - SELECT (view) only their own activation codes
--   - Cannot create, update, or delete
-- =========================================================
