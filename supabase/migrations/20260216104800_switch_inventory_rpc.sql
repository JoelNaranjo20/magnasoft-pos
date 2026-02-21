-- ⚠️ PASO 1: Eliminar el Trigger automático (Para evitar descuento DOBLE)
DROP TRIGGER IF EXISTS tr_deduct_inventory ON public.sale_items;
DROP FUNCTION IF EXISTS public.handle_inventory_deduction();

-- ✅ PASO 2: Crear la Función RPC que pide tu Frontend
-- Esta función recibe el ID del producto y la cantidad, y hace el trabajo sucio.
CREATE OR REPLACE FUNCTION public.deduct_product_stock(p_id UUID, p_quantity NUMERIC)
RETURNS VOID AS $$
DECLARE
    v_business_id UUID;
    v_user_id UUID := auth.uid(); -- Detecta automáticamente quién está logueado
BEGIN
    -- 1. Descontar Stock
    UPDATE public.products 
    SET stock = stock - p_quantity 
    WHERE id = p_id
    RETURNING business_id INTO v_business_id; -- Capturamos el negocio del producto

    -- 2. Registrar en la Bitácora (Inventory Movements)
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
        -p_quantity, -- Negativo (Salida)
        'SALE', 
        'Venta (RPC Manual)', 
        v_business_id, 
        v_user_id, 
        NOW()
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔄 PASO 3: Recargar esquema para que el error 404 desaparezca
NOTIFY pgrst, 'reload schema';
