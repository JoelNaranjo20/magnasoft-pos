-- ---------------------------------------------------------
-- FUNCION: reset_business_data_modules
-- Proposito: Borra datos del negocio de forma modular
-- basado en las banderas proporcionadas, resolviendo
-- las dependencias de FK.
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reset_business_data_modules(
  p_business_id UUID,
  p_delete_sales BOOLEAN DEFAULT FALSE,
  p_delete_customers BOOLEAN DEFAULT FALSE,
  p_delete_products BOOLEAN DEFAULT FALSE,
  p_delete_workers BOOLEAN DEFAULT FALSE,
  p_delete_all BOOLEAN DEFAULT FALSE
) RETURNS void AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Validar que el p_business_id exista
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'business_id cannot be null';
  END IF;

  -- Obtener el owner_id para no borrar al dueno si delete_workers
  SELECT owner_id INTO v_owner_id FROM public.business WHERE id = p_business_id;

  -- Si es borrado total, encender todas las banderas
  IF p_delete_all THEN
    p_delete_sales := TRUE;
    p_delete_customers := TRUE;
    p_delete_products := TRUE;
    p_delete_workers := TRUE;
  END IF;

  ---------------------------------------------------------
  -- MÓDULO 1: VENTAS Y CAJA
  ---------------------------------------------------------
  IF p_delete_sales THEN
    -- 1. Eliminar Abonos y Deudas (dependen del cash_session y sales)
    DELETE FROM public.debt_payments WHERE business_id = p_business_id;
    DELETE FROM public.customer_debts WHERE business_id = p_business_id;
    
    -- 2. Eliminar Items de Venta (dependen de sales)
    DELETE FROM public.sale_items WHERE business_id = p_business_id;
    
    -- 3. Eliminar Ventas
    DELETE FROM public.sales WHERE business_id = p_business_id;
    
    -- 4. Eliminar Movimientos de Caja (dependen de cash_session)
    DELETE FROM public.cash_movements WHERE business_id = p_business_id;
    
    -- 5. Eliminar Items de Colas de Servicio y Colas (dependen de Worker)
    DELETE FROM public.service_queue_items WHERE business_id = p_business_id;
    DELETE FROM public.service_queue WHERE business_id = p_business_id;
    
    -- 6. Finalmente, eliminar Sesiones de Caja
    DELETE FROM public.cash_sessions WHERE business_id = p_business_id;
  END IF;

  ---------------------------------------------------------
  -- MÓDULO 2: CLIENTES
  ---------------------------------------------------------
  IF p_delete_customers THEN
    -- Si no habian marcado borrar ventas, DEBEMOS borrarlas para 
    -- evitar violacion de FK (sales.customer_id) o desenlazar
    IF NOT p_delete_sales THEN
      -- Alternativa: desenlazar en vez de borrar las ventas
      -- UPDATE public.sales SET customer_id = NULL WHERE business_id = p_business_id;
      -- UPDATE public.customer_debts SET customer_id = NULL WHERE business_id = p_business_id;
      
      -- Lo mas seguro es desenlazar para no borrar historial si no se pidio:
      UPDATE public.sales SET customer_id = NULL WHERE business_id = p_business_id;
      UPDATE public.customer_debts SET customer_id = NULL WHERE business_id = p_business_id;
    END IF;

    -- Tambien vehiculos del cliente si tuvieran
    DELETE FROM public.customer_vehicles WHERE customer_id IN (SELECT id FROM public.customers WHERE business_id = p_business_id);
    
    DELETE FROM public.customers WHERE business_id = p_business_id;
  END IF;

  ---------------------------------------------------------
  -- MÓDULO 3: INVENTARIO Y CATEGORÍAS
  ---------------------------------------------------------
  IF p_delete_products THEN
    -- Si borramos productos, debemos desenlazar sale_items o borrarlos
    IF NOT p_delete_sales THEN
      UPDATE public.sale_items SET product_id = NULL WHERE business_id = p_business_id;
    END IF;

    -- Borrar productos y categorias
    DELETE FROM public.products WHERE business_id = p_business_id;
    DELETE FROM public.categories WHERE business_id = p_business_id;
  END IF;

  ---------------------------------------------------------
  -- MÓDULO 4: TRABAJADORES (Excepto el Dueño)
  ---------------------------------------------------------
  IF p_delete_workers THEN
    -- Desenlazar ventas del worker/cajero no se soporta directo en la tabla sales si usa worker_id
    -- Pero sí afecta a cash_sessions (worker_id)
    IF NOT p_delete_sales THEN
      UPDATE public.cash_sessions SET worker_id = NULL WHERE business_id = p_business_id AND worker_id != v_owner_id;
      UPDATE public.service_queue SET worker_id = NULL WHERE business_id = p_business_id AND worker_id != v_owner_id;
    END IF;

    -- Para los permisos/roles asignados:
    DELETE FROM public.workers 
    WHERE business_id = p_business_id 
      AND id != v_owner_id;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
