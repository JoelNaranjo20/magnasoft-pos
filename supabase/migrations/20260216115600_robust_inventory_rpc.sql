-- 1. (Seguridad) Hacemos que worker_id sea opcional en movimientos
-- Esto es vital: si el sistema no encuentra al trabajador, permite guardar NULL en su lugar.
ALTER TABLE public.inventory_movements 
ALTER COLUMN worker_id DROP NOT NULL;

-- 2. Actualizamos la función con tu lógica: "Busca al dueño de la caja"
CREATE OR REPLACE FUNCTION public.deduct_product_stock(p_id UUID, p_quantity NUMERIC)
RETURNS VOID AS $$
DECLARE
    v_business_id UUID;
    v_cashier_id UUID; -- Aquí guardaremos al responsable de la caja
    v_worker_exists BOOLEAN; -- Para verificar si existe en la tabla workers
BEGIN
    -- PASO A: Obtener el ID del Negocio desde el producto
    SELECT business_id INTO v_business_id 
    FROM public.products 
    WHERE id = p_id;

    -- PASO B: Buscar quién tiene la CAJA ABIERTA en este negocio
    -- Buscamos la sesión más reciente que esté 'open'
    SELECT opened_by INTO v_cashier_id
    FROM public.cash_sessions
    WHERE business_id = v_business_id
    AND status = 'open'
    ORDER BY created_at DESC
    LIMIT 1;

    -- 🛡️ PASO EXTRA DE SEGURIDAD: Verificar si este usuario existe en la tabla WORKERS
    -- Si el que abrió la caja es el Dueño (y no está en workers), esto evitará el error 23503.
    SELECT EXISTS(SELECT 1 FROM public.workers WHERE id = v_cashier_id) INTO v_worker_exists;
    
    IF NOT v_worker_exists THEN
        v_cashier_id := NULL; -- Si no es un trabajador oficial, lo dejamos vacío para que no falle
    END IF;

    -- PASO C: Descontar Stock
    UPDATE public.products 
    SET stock = stock - p_quantity 
    WHERE id = p_id;

    -- PASO D: Registrar en la Bitácora usando al CAJERO detectado (o NULL si era el dueño)
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
        'Venta en Caja (RPC)', 
        v_business_id, 
        v_cashier_id, -- ¡Ahora esto es seguro 100%!
        NOW()
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recargar esquema
NOTIFY pgrst, 'reload schema';
