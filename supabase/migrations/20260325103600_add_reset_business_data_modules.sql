-- Create the RPC function to reset specific business data modules securely
CREATE OR REPLACE FUNCTION public.reset_business_data_modules(
    p_business_id UUID,
    p_delete_sales BOOLEAN DEFAULT FALSE,
    p_delete_customers BOOLEAN DEFAULT FALSE,
    p_delete_workers BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
    v_business_exists BOOLEAN;
BEGIN
    -- 1. Check if the business exists
    SELECT EXISTS (
        SELECT 1 FROM public.business WHERE id = p_business_id
    ) INTO v_business_exists;

    IF NOT v_business_exists THEN
        RAISE EXCEPTION 'Business % not found', p_business_id;
    END IF;

    -- 2. Clear Sales & Cash Data
    IF p_delete_sales THEN
        -- Delete customer debt payments
        DELETE FROM public.customer_debt_payments WHERE debt_id IN (
            SELECT id FROM public.customer_debts WHERE business_id = p_business_id
        );
        -- Delete customer debts
        DELETE FROM public.customer_debts WHERE business_id = p_business_id;
        
        -- Delete worker commissions explicitly just in case
        DELETE FROM public.worker_commissions WHERE sale_id IN (
            SELECT id FROM public.sales WHERE business_id = p_business_id
        );
        
        -- Delete sale items
        DELETE FROM public.sale_items WHERE sale_id IN (
            SELECT id FROM public.sales WHERE business_id = p_business_id
        );
        
        -- Delete sales
        DELETE FROM public.sales WHERE business_id = p_business_id;

        -- Delete cash movements (from sessions)
        DELETE FROM public.cash_movements WHERE session_id IN (
            SELECT id FROM public.cash_sessions WHERE business_id = p_business_id
        );

        -- Delete cash sessions
        DELETE FROM public.cash_sessions WHERE business_id = p_business_id;

        -- Delete central cash movements
        DELETE FROM public.central_cash_movements WHERE business_id = p_business_id;

        -- Delete service queue explicitly (daily operations tracking wait queue)
        DELETE FROM public.service_queue WHERE business_id = p_business_id;
    END IF;

    -- 3. Clear Customer Data
    IF p_delete_customers THEN
        -- Delete vehicles 
        DELETE FROM public.vehicles WHERE customer_id IN (
            SELECT id FROM public.customers WHERE business_id = p_business_id
        );
        
        -- Delete customers
        DELETE FROM public.customers WHERE business_id = p_business_id;
    END IF;

    -- 4. Clear Workers (Except Owner)
    IF p_delete_workers THEN
        -- Workers usually have a 'role' like 'owner', 'admin', 'cashier', 'stylist'
        -- We delete everyone who is NOT an 'owner'
        DELETE FROM public.workers WHERE business_id = p_business_id AND role != 'owner';
    END IF;

    -- Note: We INTENTIONALLY do not delete 'products', 'categories', 'services', or 'configs'.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
