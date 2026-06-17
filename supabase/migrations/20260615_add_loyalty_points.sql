-- Migration: customer_loyalty_points + RPC get_product_avg_cost
-- Feature: 012-cross-cutting-improvements

-- =========================================================
-- 1. Tabla de puntos de lealtad
-- =========================================================
CREATE TABLE IF NOT EXISTS public.customer_loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired')),
    UNIQUE(customer_id)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_business ON public.customer_loyalty_points(business_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON public.customer_loyalty_points(customer_id);

-- RLS
ALTER TABLE public.customer_loyalty_points ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'customer_loyalty_points'
        AND policyname = 'Ver puntos del propio negocio'
    ) THEN
        CREATE POLICY "Ver puntos del propio negocio"
        ON public.customer_loyalty_points FOR SELECT
        TO authenticated
        USING (business_id = (auth.jwt() ->> 'business_id')::uuid);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'customer_loyalty_points'
        AND policyname = 'Insertar puntos del propio negocio'
    ) THEN
        CREATE POLICY "Insertar puntos del propio negocio"
        ON public.customer_loyalty_points FOR INSERT
        TO authenticated
        WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'customer_loyalty_points'
        AND policyname = 'Actualizar puntos del propio negocio'
    ) THEN
        CREATE POLICY "Actualizar puntos del propio negocio"
        ON public.customer_loyalty_points FOR UPDATE
        TO authenticated
        USING (business_id = (auth.jwt() ->> 'business_id')::uuid)
        WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);
    END IF;
END
$$;

-- =========================================================
-- 2. RPC: costo promedio ponderado de compra
-- =========================================================
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

NOTIFY pgrst, 'reload schema';
