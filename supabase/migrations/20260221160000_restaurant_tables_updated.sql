-- Migration: Create restaurant_tables with RLS using get_my_business_id()
-- Description: Support for real-time table management and patio layouts in restaurants

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
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

-- Habilitar RLS
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (RLS) usando get_my_business_id()
CREATE POLICY "Users can select their business tables"
    ON public.restaurant_tables FOR SELECT
    USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Users can insert their business tables"
    ON public.restaurant_tables FOR INSERT
    WITH CHECK (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Users can update their business tables"
    ON public.restaurant_tables FOR UPDATE
    USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Users can delete their business tables"
    ON public.restaurant_tables FOR DELETE
    USING (business_id = public.get_my_business_id() OR public.is_super_admin());

-- RPC para actualizar estatus de mesa de forma segura
CREATE OR REPLACE FUNCTION update_table_status(p_table_id UUID, p_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.restaurant_tables
    SET status = p_status, updated_at = now()
    WHERE id = p_table_id;
END;
$$;

-- Índice para optimizar consultas por negocio
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_business_id ON public.restaurant_tables(business_id);
