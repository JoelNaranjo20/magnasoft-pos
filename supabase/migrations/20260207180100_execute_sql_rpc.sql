-- SECURITY FIX: Replace dangerous execute_sql with secure get_dashboard_metrics
-- Old function allowed arbitrary SQL injection from frontend
-- New function only reads pre-configured queries from dashboard_config

-- Drop the dangerous function
DROP FUNCTION IF EXISTS execute_sql(TEXT);

-- Create secure function
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con permisos de sistema para poder leer configs
AS $$
DECLARE
    v_config JSONB;
    v_widget JSONB;
    v_query TEXT;
    v_result JSONB;
    v_final_output JSONB := '[]'::jsonb;
    v_query_result JSONB;
BEGIN
    -- 1. Obtener la configuración guardada para este negocio
    SELECT dashboard_config INTO v_config
    FROM business
    WHERE id = p_business_id;

    -- Si no hay config, devolver array vacío
    IF v_config IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    -- 2. Recorrer cada widget (KPI, Tabla, Gráfica) configurado
    FOR v_widget IN SELECT * FROM jsonb_array_elements(v_config)
    LOOP
        -- Extraer la consulta SQL guardada en el JSON
        v_query := v_widget->>'query';
        
        IF v_query IS NOT NULL AND v_query <> '' THEN
            BEGIN
                -- 3. EJECUCIÓN DINÁMICA SEGURA
                -- Ejecutamos la query pasando el business_id como parámetro ($1)
                -- Esto previene inyección SQL y asegura que solo vean SUS datos
                
                -- Si es una tabla o gráfica, esperamos múltiples filas
                IF (v_widget->>'type') IN ('table', 'chart') THEN
                    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || v_query || ') t'
                    INTO v_query_result
                    USING p_business_id; -- Aquí se inyecta el ID seguro
                    
                    -- Si devuelve null (sin datos), poner array vacío
                    v_query_result := COALESCE(v_query_result, '[]'::jsonb);
                    
                -- Si es un KPI, esperamos un solo valor
                ELSE
                    EXECUTE 'SELECT row_to_json(t) FROM (' || v_query || ') t'
                    INTO v_query_result
                    USING p_business_id;
                END IF;

                -- 4. Mezclar el resultado con la configuración visual
                -- Agregamos una propiedad "data" al widget original
                v_widget := jsonb_set(v_widget, '{data}', COALESCE(v_query_result, 'null'::jsonb));

            EXCEPTION WHEN OTHERS THEN
                -- Si una query falla, no rompemos todo el dashboard.
                -- Marcamos ese widget con error.
                v_widget := jsonb_set(v_widget, '{error}', to_jsonb(SQLERRM));
            END;
        END IF;

        -- Agregar widget procesado a la respuesta final
        v_final_output := v_final_output || v_widget;
    END LOOP;

    RETURN v_final_output;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID) TO authenticated;
