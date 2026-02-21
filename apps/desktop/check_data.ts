
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env manually
const envPath = 'c:/Users/Windows 11 PRO X 64/Documents/Servicar OV/apps/desktop/.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');

const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim();
    }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Variables de entorno de Supabase no encontradas.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBusinessData() {
    console.log('Consultando datos de la tabla business...');

    const { data, error, count } = await supabase
        .from('business')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Error al consultar tabla business:', error.message);
    } else {
        console.log(`Registros encontrados: ${count}`);
        if (data && data.length > 0) {
            console.log('Primer negocio:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('La tabla business está VACÍA.');
        }
    }
}

checkBusinessData();
