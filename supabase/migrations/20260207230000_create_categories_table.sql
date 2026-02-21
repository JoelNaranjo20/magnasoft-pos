-- Migration: 20260207230000_create_categories_table.sql
-- Description: Creates categories table with RLS and policies.

-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'general', -- 'product', 'service', or 'general'
    color TEXT DEFAULT '#cbd5e1', -- For POS display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Prevent duplicates per business
    UNIQUE(business_id, name)
);

-- 2. Enable Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. Access Policies

-- READ
CREATE POLICY "Users can view categories from their business"
ON public.categories FOR SELECT
USING (business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- CREATE
CREATE POLICY "Users can create categories for their business"
ON public.categories FOR INSERT
WITH CHECK (business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- UPDATE
CREATE POLICY "Users can update categories from their business"
ON public.categories FOR UPDATE
USING (business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- DELETE
CREATE POLICY "Users can delete categories from their business"
ON public.categories FOR DELETE
USING (business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- 4. Permissions
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
