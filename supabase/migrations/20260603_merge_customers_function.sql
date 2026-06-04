-- Migration: Unificar Clientes Duplicados — RPC Atómica
-- Description: Crea función SECURITY DEFINER merge_customers que unifica clientes duplicados
-- reasignando ventas, deudas y vehículos al cliente principal en una sola transacción.

CREATE OR REPLACE FUNCTION public.merge_customers(
    p_target_id uuid,
    p_source_ids uuid[],
    p_performed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_business_id  uuid;
    v_source_business_id  uuid;
    v_target_merged_into  text;
    v_sales_count         integer := 0;
    v_debts_count         integer := 0;
    v_vehicles_count      integer := 0;
    v_source_id           uuid;
    v_now                 timestamptz := now();
    v_target_metadata     jsonb;
    v_source_metadata     jsonb;
    v_merge_entry         jsonb;
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
    SELECT business_id, metadata->>'merged_into_id'
    INTO v_target_business_id, v_target_merged_into
    FROM public.customers
    WHERE id = p_target_id;

    IF v_target_business_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'El cliente principal no existe.',
            'transfers', jsonb_build_object('sales', 0, 'debts', 0, 'vehicles', 0)
        );
    END IF;

    -- 1.3 Verificar que el target no está ya unificado
    IF v_target_merged_into IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'El cliente principal ya fue unificado dentro de otro cliente.',
            'transfers', jsonb_build_object('sales', 0, 'debts', 0, 'vehicles', 0)
        );
    END IF;

    -- 1.4 Verificar tenant isolation: todos los sources deben pertenecer al mismo business_id
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
    -- 2. REASIGNAR REGISTROS RELACIONADOS
    -- ========================================================================

    -- 2.1 Reasignar ventas (sales)
    WITH updated_sales AS (
        UPDATE public.sales
        SET customer_id = p_target_id
        WHERE customer_id = ANY(p_source_ids)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_sales_count FROM updated_sales;

    -- 2.2 Reasignar deudas (customer_debts)
    WITH updated_debts AS (
        UPDATE public.customer_debts
        SET customer_id = p_target_id
        WHERE customer_id = ANY(p_source_ids)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_debts_count FROM updated_debts;

    -- 2.3 Reasignar vehículos (vehicles)
    WITH updated_vehicles AS (
        UPDATE public.vehicles
        SET customer_id = p_target_id
        WHERE customer_id = ANY(p_source_ids)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_vehicles_count FROM updated_vehicles;

    -- ========================================================================
    -- 3. ACTUALIZAR METADATOS DE AUDITORÍA
    -- ========================================================================

    -- 3.1 Construir entrada de merge para el target
    v_merge_entry := jsonb_build_object(
        'id', v_source_id,
        'at', v_now,
        'by', p_performed_by
    );

    -- 3.2 Marcar cada source como unificado
    FOR v_source_id IN SELECT unnest(p_source_ids) LOOP
        -- Obtener metadata actual del source (preservando cualquier dato existente)
        SELECT metadata INTO v_source_metadata
        FROM public.customers
        WHERE id = v_source_id;

        -- Marcar como unificado, preservando datos previos
        UPDATE public.customers
        SET metadata = COALESCE(v_source_metadata, '{}'::jsonb) || jsonb_build_object(
            'merged_into_id', p_target_id,
            'merged_at', v_now,
            'merged_by', p_performed_by
        )
        WHERE id = v_source_id;

        -- Agregar entrada al historial del target para este source
        UPDATE public.customers
        SET metadata = COALESCE(metadata, '{}'::jsonb) ||
            jsonb_build_object(
                'merged_from',
                COALESCE(metadata->'merged_from', '[]'::jsonb) || jsonb_build_object(
                    'id', v_source_id,
                    'at', v_now,
                    'by', p_performed_by
                )
            )
        WHERE id = p_target_id;
    END LOOP;

    -- ========================================================================
    -- 4. RETORNAR RESULTADO
    -- ========================================================================

    RETURN jsonb_build_object(
        'success', true,
        'message', array_length(p_source_ids, 1)::text || ' cliente(s) unificados exitosamente.',
        'transfers', jsonb_build_object(
            'sales', v_sales_count,
            'debts', v_debts_count,
            'vehicles', v_vehicles_count
        )
    );

END;
$$;

-- Recargar esquema para que PostgREST reconozca la función
NOTIFY pgrst, 'reload schema';
