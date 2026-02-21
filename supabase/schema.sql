-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES & USERS
-- Links to auth.users
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT CHECK (role IN ('super_admin', 'admin_caja')) DEFAULT 'admin_caja',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PRODUCTS & SERVICES
-- Keeping them separate as requested, though Odoo usually merges them.
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    cost DECIMAL(12, 2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CASH SESSIONS (Sesiones de Caja)
CREATE TABLE cash_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    start_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    end_amount DECIMAL(12, 2), -- Calculated system amount
    manual_end_amount DECIMAL(12, 2), -- Real counted amount
    difference DECIMAL(12, 2), -- manual - end
    status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    notes TEXT
);

-- 4. SALES
CREATE TABLE sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES cash_sessions(id),
    user_id UUID REFERENCES auth.users(id),
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')) DEFAULT 'cash',
    status TEXT CHECK (status IN ('completed', 'cancelled')) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SALE ITEMS
CREATE TABLE sale_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id), -- Nullable if service
    service_id UUID REFERENCES services(id), -- Nullable if product
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    name TEXT NOT NULL -- Snapshot of product/service name
);

-- 6. CASH COUNTS (Cierre de caja - conteo de billetes)
CREATE TABLE cash_counts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES cash_sessions(id) ON DELETE CASCADE,
    denomination DECIMAL(10, 2) NOT NULL, -- e.g., 10000, 50000
    quantity INTEGER NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REALTIME SUBSCRIPTION
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE cash_sessions;

-- RLS POLICIES

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_counts ENABLE ROW LEVEL SECURITY;

-- Helper function to check for super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies

-- Profiles: Users can read their own, Super Admin can read all
CREATE POLICY "Users can see own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super Admins can see all profiles" ON profiles
    FOR ALL USING (is_super_admin());

-- Products/Services: Read access for authenticated, Write for super_admin
CREATE POLICY "Enable read access for all authenticated users" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write access for super_admin" ON products FOR ALL USING (is_super_admin());

CREATE POLICY "Enable read access for all authenticated users" ON services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write access for super_admin" ON services FOR ALL USING (is_super_admin());

-- Cash Sessions:
-- Admins can see/manage their own sessions. Super Admin implies all.
CREATE POLICY "Users receive their own sessions" ON cash_sessions
    FOR SELECT USING (auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Users can insert their own sessions" ON cash_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own open sessions" ON cash_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Sales
CREATE POLICY "Authenticated users can create sales" ON sales
    FOR INSERT WITH CHECK (auth.role() = 'authenticated'); 

CREATE POLICY "Users can view sales from their sessions or if super_admin" ON sales
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM cash_sessions WHERE id = sales.session_id AND user_id = auth.uid())
        OR is_super_admin()
    );

-- Sale Items
CREATE POLICY "Authenticated users can create sale items" ON sale_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view sale items" ON sale_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM sales WHERE id = sale_items.sale_id AND (
            EXISTS (SELECT 1 FROM cash_sessions WHERE id = sales.session_id AND user_id = auth.uid())
            OR is_super_admin()
        ))
    );

