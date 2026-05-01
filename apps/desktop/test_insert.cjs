import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    
    // First, let's get a business_id to use
    const { data: bData } = await supabase.from('businesses').select('id').limit(1);
    const businessId = bData?.[0]?.id;
    
    if (!businessId) {
        console.error("No business found");
        return;
    }

    const payload = {
        name: "Test Fixed Commission Product",
        price: 15.00,
        cost_price: 5.00,
        stock: 10,
        commission_type: 'fixed',
        commission_amount: 1000,
        business_id: businessId,
    };

    console.log("Inserting payload...");
    const { data, error } = await supabase.from('products').insert([payload]);

    if (error) {
        console.error("SUPABASE ERROR:", error);
    } else {
        console.log("SUCCESS:", data);
        
        // Clean up
        if (data?.[0]?.id) {
            await supabase.from('products').delete().eq('id', data[0].id);
        }
    }
}

test();
