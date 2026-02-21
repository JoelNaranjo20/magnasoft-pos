-- 1. Crear la columna que te dio error (Precio Total de la línea)
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS total_price NUMERIC(15, 2) DEFAULT 0;

-- 2. (Preventivo) Crear Cantidad y Precio Unitario
-- Es 99% seguro que tu sistema los pedirá en el siguiente milisegundo.
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2) DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2) DEFAULT 0;

-- 3. Refrescar el esquema para que la API lo reconozca YA
NOTIFY pgrst, 'reload schema';

