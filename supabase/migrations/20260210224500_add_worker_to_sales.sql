-- 1. Agregar la columna worker_id a la tabla sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL;

-- 2. Crear un índice para que las búsquedas por trabajador sean rápidas
CREATE INDEX IF NOT EXISTS idx_sales_worker ON public.sales(worker_id);

-- 3. Refrescar el caché de esquema (Supabase lo hace auto, pero esto fuerza la detección)
NOTIFY pgrst, 'reload schema';
