-- 1. Agregar el "Discriminador" (service_type)
-- Esto le dice al sistema si es 'PRODUCT', 'SERVICE' o 'MEMBERSHIP'
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'PRODUCT';

-- 2. Agregar la relación Polimórfica con Trabajadores
-- (Solo se llena si es un Servicio, para saber a quién pagarle la comisión)
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.workers(id);

-- 3. Agregar campos de respaldo (Snapshot)
-- Guardamos el nombre y costo en el momento de la venta por si cambian en el futuro
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS cost NUMERIC(15,2) DEFAULT 0;

-- 4. (Opcional) Crear un Índice para búsquedas rápidas de comisiones
-- Esto hace que buscar "cuánto vendió Jesus Barber este mes" sea instantáneo
CREATE INDEX IF NOT EXISTS idx_sale_items_worker_id ON public.sale_items(worker_id);

-- 5. Refrescar el esquema
NOTIFY pgrst, 'reload schema';
