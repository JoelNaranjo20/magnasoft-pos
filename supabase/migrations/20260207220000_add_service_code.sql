-- Migration: 20260207220000_add_service_code.sql
-- Description: Adds 'code' column to services table to support service codes/SKUs.

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS code TEXT;

-- Add index for searching by code
CREATE INDEX IF NOT EXISTS idx_services_code ON public.services(code);
