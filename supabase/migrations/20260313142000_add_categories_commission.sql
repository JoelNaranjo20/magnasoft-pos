-- Migration: 20260313142000_add_categories_commission.sql
-- Description: Adds commission_percentage to the categories table for inherited commissions

-- 1. Add commission_percentage to categories table (nullable for hierarchical logic)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2);

COMMENT ON COLUMN public.categories.commission_percentage IS 'Category-specific commission rate for products. NULL = no specific commission, >0 = specific rate';

NOTIFY pgrst, 'reload schema';