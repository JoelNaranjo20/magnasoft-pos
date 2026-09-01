-- Migration: 20260901090000_add_reset_payroll_payments.sql
-- Description: Añade p_delete_payroll_payments a reset_business_data_modules().
-- Permite borrar SOLO los pagos de nómina (salario fijo y comisiones) del
-- ledger de Caja Central, sin borrar a los trabajadores ni el resto del
-- historial financiero (ventas, abonos, acreedores).
--
-- Los pagos de nómina no tienen tabla propia: se registran como movimientos
-- `expense` en central_cash_movements con descripción "Pago de Nómina (Fija)
-- a ..." o "Pago comisiones a ..." (WorkerPaymentCalculator.tsx). Se borra el
-- pago y se revierte worker_commissions.status a 'pending' (la comisión
-- vuelve a quedar pendiente de pago, consistente con "el pago ya no existe").

CREATE OR REPLACE FUNCTION public.reset_business_data_modules(
    p_business_id UUID,
    p_delete_sales BOOLEAN DEFAULT FALSE,
    p_delete_cash BOOLEAN DEFAULT FALSE,
    p_delete_customers BOOLEAN DEFAULT FALSE,
    p_delete_workers BOOLEAN DEFAULT FALSE,
    p_delete_products BOOLEAN DEFAULT FALSE,
    p_delete_queue BOOLEAN DEFAULT FALSE,
    p_delete_central_cash BOOLEAN DEFAULT FALSE,
    p_delete_creditors BOOLEAN DEFAULT FALSE,
    p_delete_tables BOOLEAN DEFAULT FALSE,
    p_delete_payroll_payments BOOLEAN DEFAULT FALSE
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
        DELETE FROM public.debt_payments WHERE debt_id IN (
            SELECT id FROM public.customer_debts WHERE business_id = p_business_id
        );
        DELETE FROM public.customer_debts WHERE business_id = p_business_id;
        DELETE FROM public.sale_items WHERE sale_id IN (
            SELECT id FROM public.sales WHERE business_id = p_business_id
        );
        DELETE FROM public.sales WHERE business_id = p_business_id;
    END IF;

    -- 3. Clear Cash (Sesiones de caja y movimientos)
    IF p_delete_cash THEN
        UPDATE public.worker_loan_payments
        SET cash_session_id = NULL
        WHERE business_id = p_business_id
          AND cash_session_id IN (
              SELECT id FROM public.cash_sessions WHERE business_id = p_business_id
          );

        DELETE FROM public.cash_movements WHERE session_id IN (
            SELECT id FROM public.cash_sessions WHERE business_id = p_business_id
        );
        DELETE FROM public.cash_sessions WHERE business_id = p_business_id;
    END IF;

    -- 4. Clear Central Cash (Caja Central — movimientos independientes)
    IF p_delete_central_cash THEN
        DELETE FROM public.central_cash_movements WHERE business_id = p_business_id;
    END IF;

    -- 5. Clear Customer Data (Clientes, vehículos y puntos de fidelización)
    IF p_delete_customers THEN
        DELETE FROM public.customer_loyalty_points WHERE customer_id IN (
            SELECT id FROM public.customers WHERE business_id = p_business_id
        );
        DELETE FROM public.vehicles WHERE customer_id IN (
            SELECT id FROM public.customers WHERE business_id = p_business_id
        );
        DELETE FROM public.customers WHERE business_id = p_business_id;
    END IF;

    -- 6. Clear Workers Data (Trabajadores, comisiones y préstamos)
    IF p_delete_workers THEN
        DELETE FROM public.worker_commissions WHERE worker_id IN (
            SELECT id FROM public.workers WHERE business_id = p_business_id
        );
        DELETE FROM public.workers WHERE business_id = p_business_id;
    END IF;

    -- 7. Clear Products, Services and Categories
    IF p_delete_products THEN
        DELETE FROM public.inventory_movements WHERE product_id IN (
            SELECT id FROM public.products WHERE business_id = p_business_id
        );
        DELETE FROM public.products WHERE business_id = p_business_id;
        DELETE FROM public.services WHERE business_id = p_business_id;
        DELETE FROM public.categories WHERE business_id = p_business_id;
    END IF;

    -- 8. Clear Service Queue
    IF p_delete_queue THEN
        DELETE FROM public.service_queue WHERE business_id = p_business_id;
    END IF;

    -- 9. Clear Creditors (Acreedores — deudas y abonos)
    IF p_delete_creditors THEN
        DELETE FROM public.creditor_payments WHERE creditor_debt_id IN (
            SELECT id FROM public.creditor_debts WHERE business_id = p_business_id
        );
        DELETE FROM public.creditor_debts WHERE business_id = p_business_id;
    END IF;

    -- 10. Clear Restaurant Tables (Mesas)
    IF p_delete_tables THEN
        DELETE FROM public.restaurant_tables WHERE business_id = p_business_id;
    END IF;

    -- 11. Clear Payroll Payments and Commissions (Nómina fija + comisiones) [NUEVO]
    --     Borra el rastro del pago en Caja Central Y las comisiones en sí
    --     (pagadas o pendientes). NO borra a los trabajadores ni sus préstamos,
    --     ni el resto del historial financiero (ventas, abonos, acreedores).
    IF p_delete_payroll_payments THEN
        DELETE FROM public.central_cash_movements
        WHERE business_id = p_business_id
          AND type = 'expense'
          AND (description ILIKE '%Pago de Nómina%' OR description ILIKE '%Pago comisiones a%');

        -- Borra las comisiones en sí (no solo revierte el estado): quedan los
        -- trabajadores, pero sin historial de comisiones ganadas/pagadas.
        DELETE FROM public.worker_commissions WHERE business_id = p_business_id;
    END IF;

    -- The business and its general configuration are conserved.
    -- (business.config, business_settings — PIN, seguridad, Base Diaria de Caja — no se tocan.)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
