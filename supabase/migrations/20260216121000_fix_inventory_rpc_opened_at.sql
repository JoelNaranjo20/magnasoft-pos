CREATE OR REPLACE FUNCTION public.deduct_product_stock(p_id UUID, p_quantity NUMERIC)
RETURNS VOID AS $$
DECLARE
    v_business_id UUID;
    v_cashier_id UUID; 
    v_worker_exists BOOLEAN;
BEGIN
    -- PASO A: Obtener el ID del Negocio desde el producto
    SELECT business_id INTO v_business_id 
    FROM public.products 
    WHERE id = p_id;

    -- PASO B: Buscar quién tiene la CAJA ABIERTA
    -- ⚠️ CORRECCIÓN: Usamos 'opened_at' para ordenar, no 'created_at'
    SELECT user_id INTO v_cashier_id
    FROM public.cash_sessions
    WHERE business_id = v_business_id
    AND status = 'open'
    ORDER BY opened_at DESC -- <--- AQUÍ ESTABA EL ERROR
    LIMIT 1;

    -- PASO C: Verificar si es un trabajador válido
    IF v_cashier_id IS NOT NULL THEN
        -- Verificamos si existe en la tabla workers
        SELECT EXISTS(SELECT 1 FROM public.workers WHERE id = v_cashier_id) INTO v_worker_exists;
        
        -- Si NO es un trabajador (ej. es el Dueño Admin), ponemos NULL para que no falle la FK
        IF NOT v_worker_exists THEN
            v_cashier_id := NULL;
        END IF;
    END IF;

    -- PASO D: Descontar Stock
    UPDATE public.products 
    SET stock = stock - p_quantity 
    WHERE id = p_id;

    -- PASO E: Registrar en Bitácora
    INSERT INTO public.inventory_movements 
    (
        product_id, 
        quantity, 
        movement_type, 
        notes, 
        business_id, 
        worker_id,      
        created_at
    )
    VALUES 
    (
        p_id, 
        -p_quantity, 
        'SALE', 
        'Venta (Stock RPC)', 
        v_business_id, 
        v_cashier_id, -- ID validado o NULL
        NOW()
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recargar esquema
NOTIFY pgrst, 'reload schema';
