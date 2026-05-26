-- =========================================================
-- FIX: Add WITH CHECK to debt RLS policies (2026-05-05)
-- Reason: ALL policies without WITH CHECK leave INSERT/UPDATE
-- unprotected even if USING clause is correct.
-- =========================================================

-- customer_debts
DROP POLICY IF EXISTS "Tenant Isolation" ON public.customer_debts;
CREATE POLICY "Tenant Isolation" ON public.customer_debts
    FOR ALL
    TO authenticated
    USING ((business_id = get_my_business_id()) OR is_super_admin())
    WITH CHECK ((business_id = get_my_business_id()) OR is_super_admin());

-- debt_payments
DROP POLICY IF EXISTS "Tenant Isolation" ON public.debt_payments;
CREATE POLICY "Tenant Isolation" ON public.debt_payments
    FOR ALL
    TO authenticated
    USING ((business_id = get_my_business_id()) OR is_super_admin())
    WITH CHECK ((business_id = get_my_business_id()) OR is_super_admin());
