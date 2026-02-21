-- Migration: Add FK between profiles and business (Robust Version)
-- Description: Adds a foreign key constraint to profiles.business_id to enable JOIN queries in Supabase.
-- Checks for both 'business' and 'businesses' table names to be safe.

-- 1. Attempt to link if table is named 'business' (Singular)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business') THEN
        -- Drop existing constraint if it exists to ensure a clean state
        ALTER TABLE public.profiles
        DROP CONSTRAINT IF EXISTS profiles_business_id_fkey;

        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_business_id_fkey
        FOREIGN KEY (business_id)
        REFERENCES public.business (id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Attempt to link if table is named 'businesses' (Plural)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'businesses') THEN
        -- Drop existing constraint if it exists
        ALTER TABLE public.profiles
        DROP CONSTRAINT IF EXISTS profiles_business_id_fkey;

        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_business_id_fkey
        FOREIGN KEY (business_id)
        REFERENCES public.businesses (id)
        ON DELETE SET NULL;
    END IF;
END $$;
