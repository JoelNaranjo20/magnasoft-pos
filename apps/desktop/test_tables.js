
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple manual env parser
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) {
        env[parts[0].trim()] = parts[1].trim();
    }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('Listando tablas disponibles en el esquema public...');
    try {
        // Querying PostgREST directly for schema info might be restricted, 
        // but we can try to select from a non-existent table to see the error message which often hints at schema.
        // Or better, try to select from 'profiles' and 'business' separately.

        console.log('--- Probando "profiles" ---');
        const { error: errorProfiles } = await supabase.from('profiles').select('*').limit(1);
        console.log('Error profiles:', errorProfiles ? errorProfiles.message : 'Ninguno (La tabla existe)');

        console.log('\n--- Probando "business" ---');
        const { error: errorBusiness } = await supabase.from('business').select('*').limit(1);
        console.log('Error business:', errorBusiness ? errorBusiness.message : 'Ninguno (La tabla existe)');

        // We can also try a raw SQL query if we had an admin client, but we don't.
        // Let's try to query a known table if any.
        console.log('\n--- Probando "workers" ---');
        const { error: errorWorkers } = await supabase.from('workers').select('*').limit(1);
        console.log('Error workers:', errorWorkers ? errorWorkers.message : 'Ninguno (La tabla existe)');

    } catch (e) {
        console.error('Excepción:', e);
    }
}

listTables();
