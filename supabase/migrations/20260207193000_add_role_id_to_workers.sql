-- Add role_id column to workers table
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
