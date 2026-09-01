-- Migration: 20260831120000_expand_reset_business_data_modules.sql
-- Description: Amplía reset_business_data_modules() con los módulos que faltaban
-- (Acreedores, Mesas, Categorías) y corrige dos violaciones de FK que hacían
-- fallar la limpieza cuando el negocio tenía historial de inventario o de
-- préstamos a trabajadores pagados desde una sesión de caja.
--
-- FR: "Limpiar Datos" (spec 016) debía cubrir todos los módulos de datos del
-- negocio. Módulos añadidos después (015-acreedores-modulo, mesas de
-- restaurante) quedaron fuera. Ver hallazgo durante seguimiento a spec 018.

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
    p_delete_tables BOOLEAN DEFAULT FALSE
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
        -- FIX (bug): worker_loan_payments.cash_session_id no tiene ON DELETE
        -- cascade/set null. Si hay pagos de préstamos registrados desde una
        -- sesión, borrar cash_sessions sin esto revienta con violación de FK.
        -- Se desvincula (no se borra el pago, se conserva el historial del
        -- préstamo) para que el reset de caja no dependa de "Trabajadores".
        UPDATE public.worker_loan_payments
        SET cash_session_id = NULL
        WHERE business_id = p_business_id
          AND cash_session_id IN (
              SELECT id FROM public.cash_sessions WHERE business_id = p_business_id
          );

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

    -- 5. Clear Customer Data (Clientes, vehículos y puntos de fidelización)
    IF p_delete_customers THEN
        -- customer_loyalty_points.customer_id SÍ tiene ON DELETE CASCADE,
        -- pero se borra explícito por claridad/consistencia con el resto.
        DELETE FROM public.customer_loyalty_points WHERE customer_id IN (
            SELECT id FROM public.customers WHERE business_id = p_business_id
        );

        -- Delete vehicles
        DELETE FROM public.vehicles WHERE customer_id IN (
            SELECT id FROM public.customers WHERE business_id = p_business_id
        );

        -- Delete customers
        DELETE FROM public.customers WHERE business_id = p_business_id;
    END IF;

    -- 6. Clear Workers Data (Trabajadores, comisiones y préstamos)
    IF p_delete_workers THEN
        -- Delete worker commissions explicitly since we are deleting workers
        DELETE FROM public.worker_commissions WHERE worker_id IN (
            SELECT id FROM public.workers WHERE business_id = p_business_id
        );

        -- We delete everyone who is NOT an 'owner'
        -- (worker_loans y worker_loan_payments cascadean vía FK a workers/loans)
        DELETE FROM public.workers WHERE business_id = p_business_id;
    END IF;

    -- 7. Clear Products, Services and Categories
    IF p_delete_products THEN
        -- FIX (bug): inventory_movements.product_id no tiene ON DELETE
        -- cascade/set null. Si hay historial de stock, borrar products sin
        -- esto revienta con violación de FK.
        DELETE FROM public.inventory_movements WHERE product_id IN (
            SELECT id FROM public.products WHERE business_id = p_business_id
        );

        DELETE FROM public.products WHERE business_id = p_business_id;
        DELETE FROM public.services WHERE business_id = p_business_id;

        -- Categorías de productos/servicios (huérfanas si no se borran aquí)
        DELETE FROM public.categories WHERE business_id = p_business_id;
    END IF;

    -- 8. Clear Service Queue
    IF p_delete_queue THEN
        DELETE FROM public.service_queue WHERE business_id = p_business_id;
    END IF;

    -- 9. Clear Creditors (Acreedores — deudas y abonos) [NUEVO — spec 015 no cubierto hasta ahora]
    IF p_delete_creditors THEN
        -- creditor_payments.creditor_debt_id tiene ON DELETE CASCADE, pero se
        -- borra explícito por claridad/consistencia con el resto de módulos.
        DELETE FROM public.creditor_payments WHERE creditor_debt_id IN (
            SELECT id FROM public.creditor_debts WHERE business_id = p_business_id
        );
        DELETE FROM public.creditor_debts WHERE business_id = p_business_id;
    END IF;

    -- 10. Clear Restaurant Tables (Mesas) [NUEVO — no cubierto hasta ahora]
    IF p_delete_tables THEN
        DELETE FROM public.restaurant_tables WHERE business_id = p_business_id;
    END IF;

    -- The business and its general configuration are conserved.
    -- (business.config, business_settings — PIN, seguridad, Base Diaria de Caja — no se tocan.)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
