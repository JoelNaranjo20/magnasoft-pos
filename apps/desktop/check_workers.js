
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ujlzwtqvtswtgjzabpjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqbHp3dHF2dHN3dGdqemFicGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTUwNDIsImV4cCI6MjA4MjU5MTA0Mn0.2xfLZcR-SO4_2LwlYdjqCiEa3EHfyW1nVVIGDYsO4eA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWorkers() {
    console.log('Checking workers table...');

    // 1. Get all workers without filter
    const { data: allWorkers, error } = await supabase
        .from('workers')
        .select('*');

    if (error) {
        console.error('Error fetching workers:', error);
        return;
    }

    console.log(`Total workers found: ${allWorkers?.length}`);

    if (allWorkers?.length > 0) {
        console.log('Sample worker:', JSON.stringify(allWorkers[0], null, 2));
    }

    // 2. Check active filter specifically
    const { data: activeWorkers } = await supabase
        .from('workers')
        .select('id, name, active')
        .eq('active', true);

    console.log(`Active workers found: ${activeWorkers?.length}`);
    if (activeWorkers?.length > 0) {
        console.log('Active workers:', JSON.stringify(activeWorkers, null, 2));
    } else {
        console.log('No active workers found. Checking logic...');
        // Check if 'active' column exists or handled differently (e.g. string 'true' vs boolean true, or null)
        const { data: check } = await supabase.from('workers').select('active').limit(5);
        console.log('Active column values:', check);
    }
}

checkWorkers();
