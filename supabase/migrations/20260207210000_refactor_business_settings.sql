-- Migration: 20260207210000_refactor_business_settings.sql
-- Description: Adds setting_type, enforces (business_id, setting_type) uniqueness, and standardizes ID to UUID.

-- 1. Clean up existing data to avoid type casting issues (User is aware of reset)
TRUNCATE TABLE public.business_settings CASCADE;

-- 2. Modify Table Structure
ALTER TABLE public.business_settings 
DROP CONSTRAINT IF EXISTS business_settings_pkey;

-- Add setting_type column
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS setting_type TEXT NOT NULL;

-- Change ID to UUID with default generation
ALTER TABLE public.business_settings 
DROP COLUMN IF EXISTS id;

ALTER TABLE public.business_settings 
ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();

-- 3. Add Unique Constraint
-- Removes dependency on ID for uniqueness logic
ALTER TABLE public.business_settings
ADD CONSTRAINT business_settings_business_id_setting_type_key UNIQUE (business_id, setting_type);

-- 4. Create Index for Performance
CREATE INDEX IF NOT EXISTS idx_business_settings_type ON public.business_settings(business_id, setting_type);
