-- Migration: Create restaurant_tables
-- Purpose: Support for real-time table management and patio layouts in restaurants

CREATE TABLE public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 4,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(business_id, name)
);

COMMENT ON TABLE public.restaurant_tables IS 'Real-time table tracking for restaurant and bar layouts';

-- Add RLS
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tables of their business"
    ON public.restaurant_tables FOR SELECT
    USING (
        business_id IN (
            SELECT b.id FROM public.business b
            JOIN public.profiles p ON p.business_id = b.id
            WHERE p.id = auth.uid()
        )
        OR 
        auth.uid() IN (SELECT owner_id FROM public.business WHERE id = business_id)
        OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND saas_role = 'super_admin')
    );

CREATE POLICY "Users can insert tables to their business"
    ON public.restaurant_tables FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT b.id FROM public.business b
            JOIN public.profiles p ON p.business_id = b.id
            WHERE p.id = auth.uid()
        )
        OR 
        auth.uid() IN (SELECT owner_id FROM public.business WHERE id = business_id)
        OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND saas_role = 'super_admin')
    );

CREATE POLICY "Users can update their business tables"
    ON public.restaurant_tables FOR UPDATE
    USING (
        business_id IN (
            SELECT b.id FROM public.business b
            JOIN public.profiles p ON p.business_id = b.id
            WHERE p.id = auth.uid()
        )
        OR 
        auth.uid() IN (SELECT owner_id FROM public.business WHERE id = business_id)
        OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND saas_role = 'super_admin')
    );

CREATE POLICY "Users can delete their business tables"
    ON public.restaurant_tables FOR DELETE
    USING (
        business_id IN (
            SELECT b.id FROM public.business b
            JOIN public.profiles p ON p.business_id = b.id
            WHERE p.id = auth.uid()
        )
        OR 
        auth.uid() IN (SELECT owner_id FROM public.business WHERE id = business_id)
        OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND saas_role = 'super_admin')
    );

-- Add index
CREATE INDEX idx_restaurant_tables_business_id ON public.restaurant_tables(business_id);

-- Trigger for updated_at
CREATE TRIGGER on_restaurant_table_updated BEFORE UPDATE ON public.restaurant_tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPC for safely updating table statuses directly
CREATE OR REPLACE FUNCTION update_table_status(p_table_id UUID, p_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the table status
    UPDATE public.restaurant_tables
    SET status = p_status, updated_at = now()
    WHERE id = p_table_id;
END;
$$;
