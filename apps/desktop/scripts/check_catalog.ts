
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    try {
        console.log('--- SCHEMA: products ---');
        const { data: pData, error: pError } = await (supabase as any).from('products').select('*').limit(1);
        if (pError) console.error(pError);
        else console.log('Columns in products:', Object.keys(pData[0] || {}).join(', '));

        console.log('\n--- SCHEMA: services ---');
        const { data: sData, error: sError } = await (supabase as any).from('services').select('*').limit(1);
        if (sError) console.error(sError);
        else console.log('Columns in services:', Object.keys(sData[0] || {}).join(', '));

        if (sData && sData[0]) {
            console.log('Sample service:', sData[0]);
        }
    } catch (e) {
        console.error(e);
    }
}

checkSchema();
