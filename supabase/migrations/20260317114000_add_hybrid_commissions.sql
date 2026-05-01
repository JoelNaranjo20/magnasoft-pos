-- Add commission type to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS commission_type VARCHAR(20) DEFAULT 'percentage';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;

-- Add commission type to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS commission_type VARCHAR(20) DEFAULT 'percentage';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;

-- Add commission type to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS commission_type VARCHAR(20) DEFAULT 'percentage';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;
