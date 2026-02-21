-- Add user_id column to sales table
-- This column tracks which cashier/admin user processed the sale

-- 1. Agregar la columna user_id que referencia al usuario autenticado (cajero)
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Crear índice para ver "Ventas por Cajero" en el futuro
CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);

-- 3. Refrescar el caché (Vital)
NOTIFY pgrst, 'reload schema';
