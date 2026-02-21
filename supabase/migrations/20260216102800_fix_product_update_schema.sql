-- 1. Asegurar que la columna 'updated_by' exista (Si ya existe, no hará nada)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 2. Asegurar que 'updated_at' exista
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ⚠️ 3. EL PASO IMPORTANTE: Forzar a la API a releer la base de datos
-- Esto soluciona el error PGRST204
NOTIFY pgrst, 'reload schema';
