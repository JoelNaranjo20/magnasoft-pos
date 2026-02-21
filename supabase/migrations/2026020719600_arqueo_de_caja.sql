-- 1. Agregar la columna 'cash_counts' para guardar el desglose de billetes/monedas
ALTER TABLE public.cash_sessions 
ADD COLUMN IF NOT EXISTS cash_counts JSONB DEFAULT '{}'::jsonb;

-- 2. Asegurarnos de que también exista la columna de observaciones de cierre (por si acaso)
ALTER TABLE public.cash_sessions 
ADD COLUMN IF NOT EXISTS closing_notes TEXT;

-- 3. Refrescar el caché de la API para que detecte el cambio inmediatamente
NOTIFY pgrst, 'reload schema';