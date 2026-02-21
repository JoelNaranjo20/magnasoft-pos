const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const businessId = '4aa15313-f830-4f05-ab65-9038daada5dd';
    console.log('--- STARTING SYNC FIX ---');

    try {
        // 1. Disable commissions modules as requested
        console.log('1. Disabling commissions for servicar OV...');
        const { data: b } = await supabase.from('business').select('config').eq('id', businessId).single();
        const newConfig = {
            ...(b.config || {}),
            module_commissions: false,
            module_commission_payment: false
        };
        await supabase.from('business').update({ config: newConfig }).eq('id', businessId);
        console.log('   Modules disabled successfully.');

        // 2. Clear dashboard_config to trigger a fresh sync if the user want to
        // or just put a clean template. 
        // I'll leave it as is or put a default automotive template without the commissions metrics if they want.
        // Actually, I'll just leave it.

        console.log('2. Syncing business_type to automotive...');
        await supabase.from('business').update({ business_type: 'automotive' }).eq('id', businessId);

        console.log('--- ALL DONE ---');
    } catch (e) {
        console.error('FAILED:', e.message);
    }
}
run();
