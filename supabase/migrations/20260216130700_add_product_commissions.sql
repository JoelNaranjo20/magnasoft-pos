-- Migration: Add Product Commission System
-- Description: Adds commission_percentage to products and default_product_commission to businesses
-- Date: 2026-02-16

-- 1. Add commission_percentage to products table (nullable for hierarchical logic)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2);

COMMENT ON COLUMN public.products.commission_percentage IS 'Product-specific commission rate. NULL = use business default, 0 = no commission, >0 = specific rate';

-- 2. Add default_product_commission to business table
ALTER TABLE public.business 
ADD COLUMN IF NOT EXISTS default_product_commission DECIMAL(5,2) DEFAULT 6.0;

COMMENT ON COLUMN public.business.default_product_commission IS 'Default commission rate for products without specific rate';

-- 3. Migrate existing inventory_sales setting from business_settings JSONB to new column
-- This preserves user configurations
UPDATE public.business b
SET default_product_commission = COALESCE(
    (
        SELECT (bs.value->>'inventory_sales')::DECIMAL(5,2)
        FROM public.business_settings bs
        WHERE bs.business_id = b.id 
        AND bs.setting_type = 'commissions'
        AND bs.value->>'inventory_sales' IS NOT NULL
    ),
    6.0  -- Fallback to 6% if no setting exists
)
WHERE default_product_commission IS NULL OR default_product_commission = 6.0;

-- 4. Create index for efficient commission lookups
CREATE INDEX IF NOT EXISTS idx_products_commission 
ON public.products(business_id, commission_percentage) 
WHERE commission_percentage IS NOT NULL;

-- 5. Verification query (commented out for production)
-- SELECT 
--     p.name,
--     p.commission_percentage as product_rate,
--     b.default_product_commission as global_rate,
--     COALESCE(p.commission_percentage, b.default_product_commission, 0) as effective_rate
-- FROM products p
-- JOIN businesses b ON p.business_id = b.id
-- LIMIT 10;
