-- 1. Agregar 'end_amount' (El dinero total que el cajero contó)
ALTER TABLE public.cash_sessions 
ADD COLUMN IF NOT EXISTS end_amount NUMERIC(15, 2) DEFAULT 0;

-- 2. (Preventivo) Agregar 'difference' (La diferencia entre lo esperado y lo real)
-- Es muy probable que tu sistema también intente guardar si sobró o faltó dinero.
ALTER TABLE public.cash_sessions 
ADD COLUMN IF NOT EXISTS difference NUMERIC(15, 2) DEFAULT 0;

-- 3. Refrescar el caché
NOTIFY pgrst, 'reload schema';