// Script to apply the products RLS fix migration via Supabase REST API
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env from .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = trimmed.split('=').slice(1).join('=').trim();
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = trimmed.split('=').slice(1).join('=').trim();
});

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Could not read SUPABASE URL or SERVICE_ROLE_KEY from .env.local');
    process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

const migrationSql = `
DROP POLICY IF EXISTS "System: Full Access for Products" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable write access for super_admin" ON public.products;
DROP POLICY IF EXISTS "Business owner full access to products" ON public.products;
DROP POLICY IF EXISTS "Products: Read own business" ON public.products;
DROP POLICY IF EXISTS "Products: Write own business" ON public.products;
DROP POLICY IF EXISTS "Products: Insert own business" ON public.products;
DROP POLICY IF EXISTS "Products: Update own business" ON public.products;
DROP POLICY IF EXISTS "Products: Delete own business" ON public.products;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products: Read own business"
ON public.products FOR SELECT TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Products: Insert own business"
ON public.products FOR INSERT TO authenticated
WITH CHECK (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Products: Update own business"
ON public.products FOR UPDATE TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin())
WITH CHECK (business_id = public.get_my_business_id() OR public.is_super_admin());

CREATE POLICY "Products: Delete own business"
ON public.products FOR DELETE TO authenticated
USING (business_id = public.get_my_business_id() OR public.is_super_admin());

NOTIFY pgrst, 'reload schema';
`;

async function run() {
    console.log('Applying products RLS fix migration...');
    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql });
        if (error) throw error;
        console.log('SUCCESS via exec_sql RPC:', data);
    } catch (err1) {
        console.log('exec_sql RPC not available, trying direct REST approach...');
        // Try calling Supabase pg_dump_policies endpoint - this won't work, so print manual instructions
        console.error('Could not apply automatically. Error:', err1.message);
        console.log('\n=== MANUAL SQL TO RUN IN SUPABASE DASHBOARD > SQL Editor ===');
        console.log(migrationSql);
        console.log('=============================================================');
    }
}

run();
