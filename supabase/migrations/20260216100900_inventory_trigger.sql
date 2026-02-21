-- 1. Crear la Función del Trigger (El Cerebro)
CREATE OR REPLACE FUNCTION public.handle_inventory_deduction()
RETURNS TRIGGER AS $$
DECLARE
    v_business_id UUID;
    v_seller_id UUID;       -- Variable para guardar quién vendió
BEGIN
    -- Solo procesar si es un PRODUCTO FÍSICO
    -- (Ignoramos Servicios como cortes o membresías)
    IF NEW.service_type = 'PRODUCT' THEN
        
        -- A. Obtener contexto de la Venta Padre
        -- Necesitamos saber de qué negocio es y quién fue el cajero
        SELECT business_id, user_id 
        INTO v_business_id, v_seller_id
        FROM public.sales 
        WHERE id = NEW.sale_id;

        -- B. Descontar del Stock Actual
        -- Restamos la cantidad vendida
        UPDATE public.products 
        SET stock = stock - NEW.quantity 
        WHERE id = NEW.product_id;

        -- C. Crear registro de Auditoría (Bitácora)
        -- Esto es vital para saber qué pasó con el producto
        INSERT INTO public.inventory_movements 
        (
            product_id, 
            quantity, 
            movement_type, 
            notes, 
            business_id, 
            worker_id,      -- Guardamos al cajero responsable
            created_at
        )
        VALUES 
        (
            NEW.product_id, 
            -NEW.quantity,  -- Negativo porque sale del almacén
            'SALE', 
            'Venta Automática (Ticket #' || NEW.sale_id || ')', 
            v_business_id,
            v_seller_id,    -- El ID del cajero
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
-- SECURITY DEFINER: Ejecuta esto con permisos de Admin, 
-- así el cajero no necesita permisos directos de escritura en tablas delicadas.

-- 2. Conectar el Trigger a la tabla
DROP TRIGGER IF EXISTS tr_deduct_inventory ON public.sale_items;

CREATE TRIGGER tr_deduct_inventory
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_inventory_deduction();

-- 3. Recargar esquema (Por si acaso)
NOTIFY pgrst, 'reload schema';
