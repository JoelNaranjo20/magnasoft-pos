-- 1. Crear la función segura que lee la configuración y ejecuta las queries
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Importante: Se ejecuta con permisos de sistema
SET search_path = public
AS $$
DECLARE
    v_config JSONB;
    v_widget JSONB; -- Variable para iterar
    v_query TEXT;
    v_query_result JSONB;
    v_final_output JSONB := '[]'::jsonb;
    v_temp_widget JSONB; -- Variable temporal para construir el widget con datos
BEGIN
    -- A. Obtener la configuración guardada para este negocio
    SELECT dashboard_config INTO v_config
    FROM business
    WHERE id = p_business_id;

    -- Si no hay config, devolver array vacío
    IF v_config IS NULL OR v_config = '[]'::jsonb THEN
        RETURN '[]'::jsonb;
    END IF;

    -- B. Recorrer cada widget configurado
    FOR v_widget IN SELECT * FROM jsonb_array_elements(v_config)
    LOOP
        -- Extraer la consulta SQL guardada en el JSON
        v_query := v_widget->>'query';
        
        -- Inicializar el widget temporal con el widget original
        v_temp_widget := v_widget;

        IF v_query IS NOT NULL AND v_query <> '' THEN
            BEGIN
                -- C. EJECUCIÓN DINÁMICA SEGURA
                -- Usamos la cláusula USING para inyectar el ID de forma segura ($1)
                
                IF (v_widget->>'type') IN ('table', 'chart') THEN
                    -- Para tablas/gráficas esperamos múltiples filas
                    -- Construimos una query que devuelve un JSON array directamente
                    EXECUTE 'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json)' 
                            || ' FROM (' || v_query || ') t'
                    INTO v_query_result
                    USING p_business_id; 
                    
                ELSE
                    -- Para KPIs esperamos un solo valor/fila
                    EXECUTE 'SELECT row_to_json(t) FROM (' || v_query || ') t'
                    INTO v_query_result
                    USING p_business_id;
                END IF;

                -- D. Guardar el resultado dentro del widget
                -- Si v_query_result es null (no hay datos), usamos null o array vacío según corresponda
                v_temp_widget := jsonb_set(v_temp_widget, '{data}', COALESCE(v_query_result, 'null'::jsonb));

            EXCEPTION WHEN OTHERS THEN
                -- Si falla una query, devolvemos el error en el JSON para depurar y no romper todo el dashboard
                v_temp_widget := jsonb_set(v_temp_widget, '{error}', to_jsonb(SQLERRM));
                v_temp_widget := jsonb_set(v_temp_widget, '{data}', 'null'::jsonb);
            END;
        ELSE
             -- Si no hay query, data es null
             v_temp_widget := jsonb_set(v_temp_widget, '{data}', 'null'::jsonb);
        END IF;

        -- Acumular en la respuesta final
        v_final_output := v_final_output || v_temp_widget;
    END LOOP;

    RETURN v_final_output;
END;
$$;

-- 2. Dar permisos de ejecución a los usuarios logueados
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID) TO service_role;
