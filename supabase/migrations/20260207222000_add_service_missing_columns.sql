-- Migration: 20260207222000_add_service_missing_columns.sql
-- Description: Adds remaining missing columns to services table to match frontend form.

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Add index for active services lookup
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(active);
