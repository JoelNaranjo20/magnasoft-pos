const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { join } = require('path');

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in .env");
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
        console.log("Has commission_type?", 'commission_type' in data[0]);
    } else {
        console.log("No products found.");
    }
}

testFetch();
