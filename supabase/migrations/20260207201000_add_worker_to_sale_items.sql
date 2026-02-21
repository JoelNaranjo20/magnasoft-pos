-- Add worker_id to sale_items
ALTER TABLE public.sale_items
ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_sale_items_worker_id ON public.sale_items(worker_id);
