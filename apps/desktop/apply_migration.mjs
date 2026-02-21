// Script to apply the debt payment function migration to Supabase
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables (you'll need to set these)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
    console.error('Set them as environment variables or update this script with your values');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log('📦 Reading migration file...');

    const migrationPath = join(__dirname, 'supabase', 'migrations', '20240112_process_debt_payment_function.sql');
    const migrationSql = readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying migration to Supabase...');
    console.log('Migration content:');
    console.log('─'.repeat(80));
    console.log(migrationSql);
    console.log('─'.repeat(80));

    try {
        // Execute the SQL migration
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql });

        if (error) {
            // The exec_sql function might not exist, let's try a different approach
            console.log('⚠️ exec_sql not available, trying alternative method...');

            // Note: We need to execute this SQL directly in the Supabase SQL Editor
            console.log('\n⚠️ MANUAL MIGRATION REQUIRED:');
            console.log('Please copy the SQL above and execute it in your Supabase SQL Editor');
            console.log('URL: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');

            return;
        }

        console.log('✅ Migration applied successfully!');
        console.log('Result:', data);
    } catch (err) {
        console.error('❌ Error applying migration:', err);
        console.log('\n⚠️ MANUAL MIGRATION REQUIRED:');
        console.log('Please copy the SQL from the file and execute it in your Supabase SQL Editor');
    }
}

applyMigration();
