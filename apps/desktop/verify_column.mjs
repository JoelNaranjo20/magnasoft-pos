
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
    const envPath = join(__dirname, '.env.local');
    if (!existsSync(envPath)) return;
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    });
}

loadEnv();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumn() {
    console.log('Checking worker_loans columns...');

    // Attempt to select the new column
    const { data, error } = await supabase
        .from('worker_loans')
        .select('pending_deduction_amount')
        .limit(1);

    if (error) {
        console.log('❌ Column verification failed:', error.message);
        console.log('Diagnosis: The column "pending_deduction_amount" likely does NOT exist.');
    } else {
        console.log('✅ Column verification successful! The column exists.');
    }
}

checkColumn();
