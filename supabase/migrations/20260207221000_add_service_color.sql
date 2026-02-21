-- Migration: 20260207221000_add_service_color.sql
-- Description: Adds 'color' column to services table for POS display.

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';
