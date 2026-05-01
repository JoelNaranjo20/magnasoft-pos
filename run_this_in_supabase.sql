CREATE OR REPLACE FUNCTION public.reset_business_data_modules(
    p_business_id UUID,
    p_delete_sales BOOLEAN DEFAULT FALSE,
    p_delete_cash BOOLEAN DEFAULT FALSE,
    p_delete_customers BOOLEAN DEFAULT FALSE,
    p_delete_workers BOOLEAN DEFAULT FALSE,
    p_delete_products BOOLEAN DEFAULT FALSE,
    p_delete_queue BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
    v_business_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.business WHERE id = p_business_id) INTO v_business_exists;
    IF NOT v_business_exists THEN 
        RAISE EXCEPTION 'Business % not found', p_business_id; 
    END IF;

    IF p_delete_sales THEN
        DELETE FROM public.debt_payments WHERE debt_id IN (SELECT id FROM public.customer_debts WHERE business_id = p_business_id);
        DELETE FROM public.customer_debts WHERE business_id = p_business_id;
        DELETE FROM public.sale_items WHERE sale_id IN (SELECT id FROM public.sales WHERE business_id = p_business_id);
        DELETE FROM public.sales WHERE business_id = p_business_id;
    END IF;

    IF p_delete_cash THEN
        DELETE FROM public.cash_movements WHERE session_id IN (SELECT id FROM public.cash_sessions WHERE business_id = p_business_id);
        DELETE FROM public.cash_sessions WHERE business_id = p_business_id;
        DELETE FROM public.central_cash_movements WHERE business_id = p_business_id;
    END IF;

    IF p_delete_customers THEN
        DELETE FROM public.vehicles WHERE customer_id IN (SELECT id FROM public.customers WHERE business_id = p_business_id);
        DELETE FROM public.customers WHERE business_id = p_business_id;
    END IF;

    IF p_delete_workers THEN
        DELETE FROM public.worker_commissions WHERE worker_id IN (SELECT id FROM public.workers WHERE business_id = p_business_id);
        DELETE FROM public.workers WHERE business_id = p_business_id;
    END IF;

    IF p_delete_products THEN
        DELETE FROM public.products WHERE business_id = p_business_id;
        DELETE FROM public.services WHERE business_id = p_business_id;
    END IF;

    IF p_delete_queue THEN
        DELETE FROM public.service_queue WHERE business_id = p_business_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Forzar recarga de cache para que PostgREST exponga la nueva firma y reconozca los nuevos parametros
NOTIFY pgrst, 'reload schema';
