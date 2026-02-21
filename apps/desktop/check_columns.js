
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

async function checkColumns() {
    console.log('Verificando columnas de la tabla "workers"...');
    try {
        // Querying one row to see keys
        const { data, error } = await supabase.from('workers').select('*').limit(1);
        if (error) {
            console.error('Error:', error.message);
        } else if (data) {
            console.log('Columnas encontradas (si hay datos):', data.length > 0 ? Object.keys(data[0]) : 'Sin datos para inferir');
            console.log('Data sample:', data[0]);
        }
    } catch (e) {
        console.error('Excepción:', e);
    }
}

checkColumns();
