-- Migration: Update business table with status column
-- Description: Ensures the status column exists with a default 'pending' value and constrained allowed values.

DO $$ 
BEGIN 
    -- 1. Check if column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business' AND column_name='status') THEN
        ALTER TABLE public.business ADD COLUMN status TEXT DEFAULT 'pending';
    ELSE
        -- 2. If it exists, ensure the default is 'pending'
        ALTER TABLE public.business ALTER COLUMN status SET DEFAULT 'pending';
    END IF;

    -- 3. Update existing records that might be NULL
    UPDATE public.business SET status = 'pending' WHERE status IS NULL;
END $$;

-- 4. Re-check/Add constraint (optional but recommended)
-- Note: We use a check constraint to ensure only valid statuses are used.
-- We droplet it first if it exists to avoid errors on reapplying.
ALTER TABLE public.business DROP CONSTRAINT IF EXISTS business_status_check;
ALTER TABLE public.business ADD CONSTRAINT business_status_check CHECK (status IN ('pending', 'active', 'suspended'));
