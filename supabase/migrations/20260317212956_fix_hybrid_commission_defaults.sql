-- Fix default values for commission_amount to be NULL instead of 0
-- This ensures that a 0 is treated as a manual override (disabling commission)
-- instead of automatically defaulting every product to 0.

-- 1. Alter defaults for products
ALTER TABLE public.products ALTER COLUMN commission_amount DROP DEFAULT;
ALTER TABLE public.products ALTER COLUMN commission_amount SET DEFAULT NULL;
UPDATE public.products SET commission_amount = NULL WHERE commission_amount = 0;

-- 2. Alter defaults for services
ALTER TABLE public.services ALTER COLUMN commission_amount DROP DEFAULT;
ALTER TABLE public.services ALTER COLUMN commission_amount SET DEFAULT NULL;
UPDATE public.services SET commission_amount = NULL WHERE commission_amount = 0;

-- 3. Alter defaults for categories
ALTER TABLE public.categories ALTER COLUMN commission_amount DROP DEFAULT;
ALTER TABLE public.categories ALTER COLUMN commission_amount SET DEFAULT NULL;
UPDATE public.categories SET commission_amount = NULL WHERE commission_amount = 0;
