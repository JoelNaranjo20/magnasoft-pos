-- Migration: Add Discount Tracking to Sales
-- Description: Adds original_price and discount_amount to sale_items, and total_discount to sales

-- Add columns to sale_items
ALTER TABLE public.sale_items
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN public.sale_items.original_price IS 'Original base price before any manual overrides (discounts/rebajas). NULL if no discount applied or original price matches unit_price.';
COMMENT ON COLUMN public.sale_items.discount_amount IS 'Total discount applied to this item row (original_price - unit_price) * quantity';

-- Add column to sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS total_discount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN public.sales.total_discount IS 'Sum of all discounts applied to items within this sale';
