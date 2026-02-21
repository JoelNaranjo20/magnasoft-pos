-- Migration: Add hardware_id to business table
-- Description: Stores the unique Machine ID (HWID) of the desktop installation for security binding.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business' AND column_name='hardware_id') THEN
        ALTER TABLE public.business ADD COLUMN hardware_id TEXT;
    END IF;
END $$;
