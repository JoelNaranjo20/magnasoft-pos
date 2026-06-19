-- Migration: Módulo de Acreedores — creditor_debts + creditor_payments
-- Feature: 015-acreedores-modulo
-- Date: 2026-06-19

-- =========================================================
-- 1. Tabla de deudas con acreedores
-- =========================================================
CREATE TABLE IF NOT EXISTS public.creditor_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    creditor_name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    remaining_amount DECIMAL(10,2) NOT NULL,
    invoice_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creditor_debts_business_id ON public.creditor_debts(business_id);
CREATE INDEX IF NOT EXISTS idx_creditor_debts_status ON public.creditor_debts(business_id, status);

-- =========================================================
-- 2. Tabla de abonos a acreedores
-- =========================================================
CREATE TABLE IF NOT EXISTS public.creditor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    creditor_debt_id UUID REFERENCES public.creditor_debts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creditor_payments_business_id ON public.creditor_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_creditor_payments_debt_id ON public.creditor_payments(creditor_debt_id);
CREATE INDEX IF NOT EXISTS idx_creditor_payments_created ON public.creditor_payments(business_id, created_at);

-- =========================================================
-- 3. RLS — Tenant Isolation
-- =========================================================
ALTER TABLE public.creditor_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creditor_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'creditor_debts'
        AND policyname = 'Tenant Isolation'
    ) THEN
        CREATE POLICY "Tenant Isolation" ON public.creditor_debts
        FOR ALL TO authenticated
        USING (business_id = public.get_my_business_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'creditor_payments'
        AND policyname = 'Tenant Isolation'
    ) THEN
        CREATE POLICY "Tenant Isolation" ON public.creditor_payments
        FOR ALL TO authenticated
        USING (business_id = public.get_my_business_id());
    END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
