-- Migration: Add Default Service Commission
-- Description: Adds default_commission to businesses for services
-- Date: 2026-02-18

-- 1. Add default_commission to business table (for services)
ALTER TABLE public.business 
ADD COLUMN IF NOT EXISTS default_commission DECIMAL(5,2) DEFAULT 50.0;

COMMENT ON COLUMN public.business.default_commission IS 'Default commission rate for services (e.g., 50%)';

-- 2. Ensure default_product_commission exists (from previous migration, just in case)
ALTER TABLE public.business 
ADD COLUMN IF NOT EXISTS default_product_commission DECIMAL(5,2) DEFAULT 10.0;

COMMENT ON COLUMN public.business.default_product_commission IS 'Default commission rate for products (e.g., 10%)';

-- 3. Verify columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business' AND column_name = 'default_commission') THEN
        RAISE EXCEPTION 'Column default_commission not created';
    END IF;
END $$;
