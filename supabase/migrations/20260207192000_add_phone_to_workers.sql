-- Add phone column to workers table
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS phone TEXT;
