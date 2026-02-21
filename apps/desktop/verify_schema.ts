
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

async function verifySchema() {
    console.log('Verificando esquema de la tabla business...');

    // Attempt to SELECT specific columns from the table.
    const { data, error } = await supabase
        .from('business')
        .select('name, pin, address, location, phone, logo_url, email')
        .limit(1);

    if (error) {
        console.error('Error al verificar columnas:', error.message);
        console.log('Es posible que una o más columnas no existan.');
    } else {
        console.log('¡Éxito! Todas las columnas (name, pin, address, location, phone, logo_url, email) parecen existir.');
    }
}

verifySchema();
