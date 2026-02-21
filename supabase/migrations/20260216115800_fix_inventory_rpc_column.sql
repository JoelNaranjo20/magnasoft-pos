-- Actualizamos la función corrigiendo el nombre de la columna
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
    -- ⚠️ CAMBIO: Usamos 'user_id' en lugar de 'opened_by'
    SELECT user_id INTO v_cashier_id
    FROM public.cash_sessions
    WHERE business_id = v_business_id
    AND status = 'open'
    ORDER BY created_at DESC
    LIMIT 1;

    -- PASO C: Verificar si es un trabajador (para evitar error FK)
    -- Si v_cashier_id es NULL (no encontró caja) o no existe en workers, ponemos NULL
    IF v_cashier_id IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM public.workers WHERE id = v_cashier_id) INTO v_worker_exists;
        IF NOT v_worker_exists THEN
            v_cashier_id := NULL;
        END IF;
    ELSE
        -- Si no hay caja abierta (raro, pero posible), dejamos NULL
        v_cashier_id := NULL;
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
