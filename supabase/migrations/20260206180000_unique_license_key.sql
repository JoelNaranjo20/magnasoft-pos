-- Migration: Add UNIQUE constraint to license_key
-- Description: Ensures that no two businesses can share the same license key.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'business' 
        AND constraint_name = 'business_license_key_key'
    ) THEN
        ALTER TABLE public.business ADD CONSTRAINT business_license_key_key UNIQUE (license_key);
    END IF;
END $$;
