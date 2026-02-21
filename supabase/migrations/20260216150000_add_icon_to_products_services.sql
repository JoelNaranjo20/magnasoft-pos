-- 1. Agregar columna 'icon' a productos (Por defecto 'package')
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'package';

-- 2. Agregar columna 'icon' a servicios (Por defecto 'scissors')
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'scissors';

-- 3. Recargar esquema (Not necessary for local dev usually, but good for Supabase)
NOTIFY pgrst, 'reload schema';
