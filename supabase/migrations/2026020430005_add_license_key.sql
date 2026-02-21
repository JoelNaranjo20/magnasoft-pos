-- Migration: Add license_key to business table
-- Description: Adds a column to store the installation serial/license key.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business' AND column_name='license_key') THEN
        ALTER TABLE public.business ADD COLUMN license_key TEXT;
    END IF;
END $$;
