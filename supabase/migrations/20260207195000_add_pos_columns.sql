-- Add active column to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Add active column to services
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Add user_id column to cash_sessions
-- This links the session to the authenticated user who opened it
ALTER TABLE public.cash_sessions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(active);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user_id ON public.cash_sessions(user_id);
