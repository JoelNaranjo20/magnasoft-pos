
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: 'c:/Users/Windows 11 PRO X 64/Documents/Servicar OV/apps/desktop/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Variables de entorno de Supabase no encontradas.');
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
            console.log('--- Contenido de tabla business ---');
            console.log(JSON.stringify(data, null, 2));
            console.log('------------------------------------');
        }
    } catch (e) {
        console.error('Excepción:', e);
    }
}

checkBusiness();
