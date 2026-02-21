-- Migration: Enable Hierarchical Categories and Relational Filtering
-- Adds parent_id to categories, category_id to products/services

-- 1. Add parent_id to categories (for tree structure)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE;

-- 2. Add icon column to categories (for better UI)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'folder';

-- 3. Add category_id to products (foreign key)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- 4. Add category_id to services (foreign key)
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);

-- 6. (Optional) Migrate existing data - attempt to link products to categories by name
-- This tries to match the text "category" column to actual category names
DO $$
DECLARE
    cat_record RECORD;
BEGIN
    -- For each existing category
    FOR cat_record IN 
        SELECT id, name, business_id FROM public.categories
    LOOP
        -- Update products that have this category name (text match)
        UPDATE public.products
        SET category_id = cat_record.id
        WHERE business_id = cat_record.business_id
        AND LOWER(category) = LOWER(cat_record.name)
        AND category_id IS NULL;

        -- Update services that have this category name (text match)
        UPDATE public.services
        SET category_id = cat_record.id
        WHERE business_id = cat_record.business_id
        AND LOWER(category) = LOWER(cat_record.name)
        AND category_id IS NULL;
    END LOOP;
END $$;

-- 7. Reload schema
NOTIFY pgrst, 'reload schema';
