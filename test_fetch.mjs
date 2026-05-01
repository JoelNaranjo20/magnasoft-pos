import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'apps/desktop/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in apps/desktop/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log("Fetching a product...");
    const { data, error } = await supabase.from('products').select('*').limit(1);

    if (error) {
        console.error("SUPABASE ERROR:", error);
    } else if (data && data.length > 0) {
        console.log("PRODUCT KEYS:", Object.keys(data[0]));
        console.log("Full product:", data[0]);
    } else {
        console.log("No products found.");
    }
}

testFetch();
