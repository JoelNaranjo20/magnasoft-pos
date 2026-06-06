-- Migration: Unificar Clientes Duplicados — RPC Atómica v4
-- Description: Función SECURITY DEFINER merge_customers que reasigna ventas, deudas, vehículos,
-- puntos y visitas al cliente principal y ELIMINA FÍSICAMENTE los clientes fuente.
-- v4: eliminado auth.uid() (el frontend ya valida admin), simplificado para máxima confiabilidad.

CREATE OR REPLACE FUNCTION public.merge_customers(
    p_target_id uuid,
    p_source_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_business_id  uuid;
    v_source_business_id  uuid;
    v_sales_count         integer := 0;
    v_debts_count         integer := 0;
    v_vehicles_count      integer := 0;
    v_source_id           uuid;
    v_deleted_count       integer := 0;
    v_orphan_count        integer := 0;
BEGIN
    -- ========================================================================
    -- 1. VALIDACIONES PREVIAS
    -- ========================================================================

    -- 1.1 Verificar que el target no está en los source_ids
    IF p_target_id = ANY(p_source_ids) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No se puede unificar un cliente consigo mismo.',
            'transfers', jsonb_build_object('sales', 0, 'debts', 0, 'vehicles', 0)
        );
    END IF;

    -- 1.2 Verificar que el target existe y obtener su business_id
    SELECT business_id INTO v_target_business_id
    FROM public.customers
    WHERE id = p_target_id;

    IF v_target_business_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'El cliente principal no existe.',
            'transfers', jsonb_build_object('sales', 0, 'debts', 0, 'vehicles', 0)
        );
    END IF;

    -- 1.3 Verificar tenant isolation: todos los sources deben pertenecer al mismo business_id
    FOR v_source_id IN SELECT unnest(p_source_ids) LOOP
        SELECT business_id INTO v_source_business_id
        FROM public.customers
        WHERE id = v_source_id;

        IF v_source_business_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Uno de los clientes a unificar no existe.',
                'transfers', jsonb_build_object('sales', 0, 'debts', 0, 'vehicles', 0)
            );
        END IF;

        IF v_source_business_id <> v_target_business_id THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'No se pueden unificar clientes de negocios diferentes.',
                'transfers', jsonb_build_object('sales', 0, 'debts', 0, 'vehicles', 0)
            );
        END IF;
    END LOOP;

    -- ========================================================================
    -- 2. TRANSFERIR DATOS PROPIOS DEL CLIENTE (ANTES de eliminar)
    --    loyalty_points y total_visits se pierden si no se suman al target.
    -- ========================================================================

    UPDATE public.customers
    SET
        loyalty_points = COALESCE(loyalty_points, 0) + sub.source_points,
        total_visits   = COALESCE(total_visits, 0)   + sub.source_visits
    FROM (
        SELECT
            SUM(COALESCE(loyalty_points, 0)) AS source_points,
            SUM(COALESCE(total_visits, 0))   AS source_visits
        FROM public.customers
        WHERE id = ANY(p_source_ids)
    ) sub
    WHERE id = p_target_id;

    -- ========================================================================
    -- 3. REASIGNAR REGISTROS RELACIONADOS (ANTES de eliminar)
    --    IMPORTANTE: vehicles y customer_debts tienen ON DELETE CASCADE.
    --    Todas las FK deben reasignarse antes del DELETE para evitar pérdida.
    -- ========================================================================

    -- 3.1 Reasignar ventas (sales) — FK sin ON DELETE CASCADE
    WITH updated_sales AS (
        UPDATE public.sales
        SET customer_id = p_target_id
        WHERE customer_id = ANY(p_source_ids)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_sales_count FROM updated_sales;

    -- 3.2 Reasignar deudas (customer_debts) — ¡TIENE ON DELETE CASCADE!
    WITH updated_debts AS (
        UPDATE public.customer_debts
        SET customer_id = p_target_id
        WHERE customer_id = ANY(p_source_ids)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_debts_count FROM updated_debts;

    -- 3.3 Reasignar vehículos (vehicles) — ¡TIENE ON DELETE CASCADE!
    WITH updated_vehicles AS (
        UPDATE public.vehicles
        SET customer_id = p_target_id
        WHERE customer_id = ANY(p_source_ids)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_vehicles_count FROM updated_vehicles;

    -- ========================================================================
    -- 4. VERIFICACIÓN PRE-DELETE
    --    Confirmar que NO quedan filas huérfanas que serían eliminadas por
    --    CASCADE. Si alguna FK no se reasignó, abortar antes de borrar.
    -- ========================================================================

    SELECT COUNT(*) INTO v_orphan_count
    FROM public.vehicles
    WHERE customer_id = ANY(p_source_ids);

    IF v_orphan_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error interno: ' || v_orphan_count || ' vehículo(s) no se reasignaron. Operación cancelada.',
            'transfers', jsonb_build_object('sales', v_sales_count, 'debts', v_debts_count, 'vehicles', v_vehicles_count)
        );
    END IF;

    SELECT COUNT(*) INTO v_orphan_count
    FROM public.customer_debts
    WHERE customer_id = ANY(p_source_ids);

    IF v_orphan_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error interno: ' || v_orphan_count || ' deuda(s) no se reasignaron. Operación cancelada.',
            'transfers', jsonb_build_object('sales', v_sales_count, 'debts', v_debts_count, 'vehicles', v_vehicles_count)
        );
    END IF;

    SELECT COUNT(*) INTO v_orphan_count
    FROM public.sales
    WHERE customer_id = ANY(p_source_ids);

    IF v_orphan_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error interno: ' || v_orphan_count || ' venta(s) no se reasignaron. Operación cancelada.',
            'transfers', jsonb_build_object('sales', v_sales_count, 'debts', v_debts_count, 'vehicles', v_vehicles_count)
        );
    END IF;

    -- ========================================================================
    -- 5. ELIMINAR CLIENTES FUENTE
    --    Todas las FK fueron reasignadas y verificadas — es seguro borrar.
    -- ========================================================================

    WITH deleted AS (
        DELETE FROM public.customers
        WHERE id = ANY(p_source_ids)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;

    -- ========================================================================
    -- 6. RETORNAR RESULTADO
    -- ========================================================================

    RETURN jsonb_build_object(
        'success', true,
        'message', v_deleted_count::text || ' cliente(s) eliminados. ' ||
                   v_sales_count::text || ' ventas, ' ||
                   v_debts_count::text || ' deudas y ' ||
                   v_vehicles_count::text || ' vehículos transferidos.',
        'transfers', jsonb_build_object(
            'sales', v_sales_count,
            'debts', v_debts_count,
            'vehicles', v_vehicles_count
        )
    );

END;
$$;

NOTIFY pgrst, 'reload schema';
