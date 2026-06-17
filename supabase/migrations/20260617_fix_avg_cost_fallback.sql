-- Migration: Fix get_product_avg_cost fallback to use cost_price instead of price
-- Feature: 012-cross-cutting-improvements (fix)

CREATE OR REPLACE FUNCTION public.get_product_avg_cost(
    p_product_id UUID,
    p_business_id UUID
) RETURNS NUMERIC AS $$
DECLARE
    avg_cost NUMERIC;
    fallback_price NUMERIC;
BEGIN
    -- Calcular costo promedio ponderado desde inventory_movements
    SELECT COALESCE(
        SUM(unit_cost * quantity) / NULLIF(SUM(quantity), 0),
        0
    ) INTO avg_cost
    FROM public.inventory_movements
    WHERE product_id = p_product_id
      AND type = 'purchase'
      AND business_id = p_business_id;

    -- Si no hay historial de compras, usar cost_price de products como fallback
    IF avg_cost IS NULL OR avg_cost = 0 THEN
        SELECT cost_price INTO fallback_price
        FROM public.products
        WHERE id = p_product_id AND business_id = p_business_id;
        avg_cost := COALESCE(fallback_price, 0);
    END IF;

    RETURN avg_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
