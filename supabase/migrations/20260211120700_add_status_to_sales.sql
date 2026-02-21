-- Add status column to sales table
-- This column tracks the state of each sale (completed, pending, cancelled, etc.)

-- 1. Agregar la columna 'status' a la tabla sales
-- Le ponemos un valor por defecto 'completed' para que las ventas viejas no queden nulas
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- 2. (Opcional pero recomendado) Agregar un índice para filtrar rápido por estado
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

-- 3. IMPORTANTE: Refrescar el caché de la API para que detecte el cambio inmediato
NOTIFY pgrst, 'reload schema';
