
// Script to apply a custom migration to Supabase (Dependency Free)
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to load env vars manually
function loadEnv() {
    const envPath = join(__dirname, '.env.local');
    if (!existsSync(envPath)) {
        console.warn('⚠️ .env.local file not found');
        return;
    }
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            process.env[key] = value;
        }
    });
}

loadEnv();

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    const migrationFile = '20260130_fix_queue_rls.sql';
    console.log(`📦 Reading migration file: ${migrationFile}...`);

    const migrationPath = join(__dirname, 'supabase', 'migrations', migrationFile);
    const migrationSql = readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying migration to Supabase...');
    console.log('Migration content:');
    console.log('─'.repeat(80));
    console.log(migrationSql);
    console.log('─'.repeat(80));

    try {
        // Execute the SQL migration using the existing exec_sql RPC
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql });

        if (error) {
            console.error('❌ Error applying migration via RPC:', error);
            console.log('\n⚠️ MANUAL MIGRATION REQUIRED:');
            console.log('Please copy the SQL from the file and execute it in your Supabase SQL Editor');
        } else {
            console.log('✅ Migration applied successfully!');
            console.log('Result:', data);
        }

    } catch (err) {
        console.error('❌ Error applying migration:', err);
    }
}

applyMigration();
