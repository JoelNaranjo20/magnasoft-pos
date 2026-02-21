
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Variables de entorno de Supabase no encontradas en .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBusiness() {
    console.log('Consultando tabla business...');
    try {
        const { data, error } = await supabase
            .from('business')
            .select('*');

        if (error) {
            console.error('Error al consultar tabla business:', error);
        } else {
            console.log('------------------------------------');
            if (data && data.length > 0) {
                console.log('¡ÉXITO! Se encontró información del negocio:');
                console.log(JSON.stringify(data[0], null, 2));
            } else {
                console.log('La tabla business está vacía.');
            }
            console.log('------------------------------------');
        }
    } catch (e) {
        console.error('Excepción:', e);
    }
}

checkBusiness();
