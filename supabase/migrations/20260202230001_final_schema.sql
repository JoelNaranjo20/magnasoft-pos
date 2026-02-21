-- =========================================================
-- PRODUCTION-READY UNIVERSAL MULTI-VERTICAL SAAS V3 FINAL
-- Includes: Licensing Module + Super Admin Controls
-- Supports: Automotive, Restaurant, Retail, and more
-- =========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- 2. CORE TABLES (Auth & Multi-tenancy)
-- =========================================================

CREATE TABLE public.business (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    plan TEXT DEFAULT 'standard',
    business_type TEXT DEFAULT 'automotive',  -- 'automotive', 'restaurant', 'retail', etc.
    pin TEXT DEFAULT '1234',
    address TEXT,
    phone TEXT,
    email TEXT,
    location TEXT,
    logo_url TEXT,
    module_pos BOOLEAN DEFAULT true,
    module_analytics BOOLEAN DEFAULT false,
    module_inventory BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',  -- Business-type specific configuration
    owner_id UUID,  -- NO FK to auth.users (production-safe)
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,  -- Links to auth.users
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'worker',
    saas_role TEXT DEFAULT 'user',
    business_id UUID,  -- NULLABLE for super_admins
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- LICENSING MODULE
CREATE TABLE public.activation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    hwid TEXT,
    status TEXT DEFAULT 'pending',
    max_devices INTEGER DEFAULT 1,
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID
);
COMMENT ON TABLE public.activation_codes IS 'Licensing system for desktop app activation. Managed by super_admin.';

CREATE TABLE public.business_settings (
    id TEXT PRIMARY KEY,
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- 3. UNIVERSAL ENTITIES (Works for all business types)
-- =========================================================

CREATE TABLE public.workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pin TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    last_visit TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',  -- Preferences, allergies, size, etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- AUTOMOTIVE MODULE (Optional for other business types)
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    license_plate TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    type TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.vehicles IS 'Optional module for automotive businesses. Ignored by restaurants/retail.';

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    category TEXT DEFAULT 'General',
    barcode TEXT,
    metadata JSONB DEFAULT '{}',  -- Size, color, brand, ingredients, etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category TEXT DEFAULT 'General',
    is_variable_price BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',  -- Service-specific details
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- 4. UNIVERSAL OPERATIONS (Cash & Sales)
-- =========================================================

CREATE TABLE public.cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.workers(id),
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    opening_balance DECIMAL(10,2) DEFAULT 0,
    closing_balance DECIMAL(10,2),
    status TEXT DEFAULT 'open'
);

CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.cash_sessions(id),
    customer_id UUID REFERENCES public.customers(id),
    vehicle_id UUID REFERENCES public.vehicles(id),  -- NULLABLE for non-automotive
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    metadata JSONB DEFAULT '{}',  -- Table number, tip, delivery info, etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    service_id UUID REFERENCES public.services(id),
    name TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    metadata JSONB DEFAULT '{}',  -- Cooking notes, modifications, etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.cash_sessions(id),
    type TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- 5. UNIVERSAL QUEUE SYSTEM
-- =========================================================

CREATE TABLE public.service_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    reference_info TEXT,  -- License plate (automotive) OR Table number (restaurant) OR Order ID
    worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON COLUMN public.service_queue.reference_info IS 'Flexible reference: license plate for automotive, table number for restaurant, order ID for retail';

CREATE TABLE public.service_queue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    queue_id UUID REFERENCES public.service_queue(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- 6. UNIVERSAL FINANCES & COMMISSIONS
-- =========================================================

CREATE TABLE public.central_cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.worker_commissions (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    sale_item_id UUID REFERENCES public.sale_items(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
    service_type TEXT,
    base_amount DECIMAL(10,2),
    commission_percentage DECIMAL(5,2),
    commission_amount DECIMAL(10,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.worker_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    total_paid DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
    notes TEXT,
    reason TEXT,
    request_date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.worker_loan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    loan_id UUID REFERENCES public.worker_loans(id) ON DELETE CASCADE,
    cash_session_id UUID REFERENCES public.cash_sessions(id),
    amount DECIMAL(10,2) NOT NULL,
    type TEXT DEFAULT 'payment',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.customer_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    remaining_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
    due_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.debt_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business(id) ON DELETE CASCADE,
    debt_id UUID REFERENCES public.customer_debts(id) ON DELETE CASCADE,
    cash_session_id UUID REFERENCES public.cash_sessions(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- 7. PERFORMANCE INDEXES (Critical for RLS)
-- =========================================================

CREATE INDEX idx_profiles_business_id ON public.profiles(business_id);
CREATE INDEX idx_activation_codes_business_id ON public.activation_codes(business_id);
CREATE INDEX idx_activation_codes_code ON public.activation_codes(code);
CREATE INDEX idx_business_settings_business_id ON public.business_settings(business_id);
CREATE INDEX idx_workers_business_id ON public.workers(business_id);
CREATE INDEX idx_customers_business_id ON public.customers(business_id);
CREATE INDEX idx_vehicles_business_id ON public.vehicles(business_id);
CREATE INDEX idx_products_business_id ON public.products(business_id);
CREATE INDEX idx_services_business_id ON public.services(business_id);
CREATE INDEX idx_cash_sessions_business_id ON public.cash_sessions(business_id);
CREATE INDEX idx_sales_business_id ON public.sales(business_id);
CREATE INDEX idx_sale_items_business_id ON public.sale_items(business_id);
CREATE INDEX idx_service_queue_business_id ON public.service_queue(business_id);
CREATE INDEX idx_central_cash_business_id ON public.central_cash_movements(business_id);
CREATE INDEX idx_worker_commissions_business_id ON public.worker_commissions(business_id);
CREATE INDEX idx_worker_loans_business_id ON public.worker_loans(business_id);
CREATE INDEX idx_customer_debts_business_id ON public.customer_debts(business_id);

-- Index for business_type queries
CREATE INDEX idx_business_type ON public.business(business_type);

-- =========================================================
-- 8. TRIGGERS & FUNCTIONS (Application Logic)
-- =========================================================

-- Generic updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER on_profile_updated BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER on_loan_updated BEFORE UPDATE ON public.worker_loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER on_debt_updated BEFORE UPDATE ON public.customer_debts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Worker loan status updater
CREATE OR REPLACE FUNCTION update_worker_loan_status()
RETURNS TRIGGER AS $$
DECLARE
    curr_total_paid DECIMAL(10,2);
    initial_amount DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO curr_total_paid
    FROM worker_loan_payments
    WHERE loan_id = NEW.loan_id;

    SELECT amount INTO initial_amount
    FROM worker_loans
    WHERE id = NEW.loan_id;

    UPDATE worker_loans
    SET 
        total_paid = curr_total_paid,
        status = CASE 
            WHEN (initial_amount - curr_total_paid) <= 0.01 THEN 'paid'
            WHEN (initial_amount - curr_total_paid) < initial_amount THEN 'partial'
            ELSE 'pending'
        END,
        updated_at = now()
    WHERE id = NEW.loan_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_loan_payment
AFTER INSERT OR DELETE OR UPDATE ON worker_loan_payments
FOR EACH ROW EXECUTE FUNCTION update_worker_loan_status();

-- Customer debt status updater
CREATE OR REPLACE FUNCTION update_debt_status()
RETURNS TRIGGER AS $$
DECLARE
    curr_total_paid DECIMAL(10,2);
    initial_amount DECIMAL(10,2);
    target_debt_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_debt_id := OLD.debt_id;
    ELSE
        target_debt_id := NEW.debt_id;
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO curr_total_paid
    FROM debt_payments
    WHERE debt_id = target_debt_id;

    SELECT amount INTO initial_amount
    FROM customer_debts
    WHERE id = target_debt_id;

    UPDATE customer_debts
    SET 
        remaining_amount = initial_amount - curr_total_paid,
        status = CASE 
            WHEN (initial_amount - curr_total_paid) <= 0.01 THEN 'paid'
            WHEN (initial_amount - curr_total_paid) < initial_amount THEN 'partial'
            ELSE 'pending'
        END,
        updated_at = now()
    WHERE id = target_debt_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_debt_payment
AFTER INSERT OR DELETE OR UPDATE ON debt_payments
FOR EACH ROW EXECUTE FUNCTION update_debt_status();

-- =========================================================
-- NOTE: Auth trigger and RLS will be added in separate files
-- This keeps the schema clean and modular
-- =========================================================
