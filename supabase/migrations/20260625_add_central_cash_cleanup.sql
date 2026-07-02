-- Add p_delete_central_cash parameter to reset_business_data_modules
-- Moves central_cash_movements cleanup out of p_delete_cash into its own independent flag
CREATE OR REPLACE FUNCTION public.reset_business_data_modules(
    p_business_id UUID,
    p_delete_sales BOOLEAN DEFAULT FALSE,
    p_delete_cash BOOLEAN DEFAULT FALSE,
    p_delete_customers BOOLEAN DEFAULT FALSE,
    p_delete_workers BOOLEAN DEFAULT FALSE,
    p_delete_products BOOLEAN DEFAULT FALSE,
    p_delete_queue BOOLEAN DEFAULT FALSE,
    p_delete_central_cash BOOLEAN DEFAULT FALSE
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

    -- 2. Clear Sales (Ventas e ítems de venta)
    IF p_delete_sales THEN
        -- Delete customer debt payments
        DELETE FROM public.debt_payments WHERE debt_id IN (
            SELECT id FROM public.customer_debts WHERE business_id = p_business_id
        );
        -- Delete customer debts
        DELETE FROM public.customer_debts WHERE business_id = p_business_id;

        -- Delete sale items
        DELETE FROM public.sale_items WHERE sale_id IN (
            SELECT id FROM public.sales WHERE business_id = p_business_id
        );

        -- Delete sales
        DELETE FROM public.sales WHERE business_id = p_business_id;
    END IF;

    -- 3. Clear Cash (Sesiones de caja y movimientos)
    IF p_delete_cash THEN
        -- Delete cash movements (from sessions)
        DELETE FROM public.cash_movements WHERE session_id IN (
            SELECT id FROM public.cash_sessions WHERE business_id = p_business_id
        );

        -- Delete cash sessions
        DELETE FROM public.cash_sessions WHERE business_id = p_business_id;
    END IF;

    -- 4. Clear Central Cash (Caja Central — movimientos independientes)
    IF p_delete_central_cash THEN
        DELETE FROM public.central_cash_movements WHERE business_id = p_business_id;
    END IF;

    -- 5. Clear Customer Data (Clientes y vehículos)
    IF p_delete_customers THEN
        -- Delete vehicles
        DELETE FROM public.vehicles WHERE customer_id IN (
            SELECT id FROM public.customers WHERE business_id = p_business_id
        );

        -- Delete customers
        DELETE FROM public.customers WHERE business_id = p_business_id;
    END IF;

    -- 6. Clear Workers Data (Trabajadores y comisiones)
    IF p_delete_workers THEN
        -- Delete worker commissions explicitly since we are deleting workers
        DELETE FROM public.worker_commissions WHERE worker_id IN (
            SELECT id FROM public.workers WHERE business_id = p_business_id
        );

        -- We delete everyone who is NOT an 'owner'
        DELETE FROM public.workers WHERE business_id = p_business_id;
    END IF;

    -- 7. Clear Products and Services
    IF p_delete_products THEN
        DELETE FROM public.products WHERE business_id = p_business_id;
        DELETE FROM public.services WHERE business_id = p_business_id;
    END IF;

    -- 8. Clear Service Queue
    IF p_delete_queue THEN
        DELETE FROM public.service_queue WHERE business_id = p_business_id;
    END IF;

    -- The business and its general configuration are conserved.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
