
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ujlzwtqvtswtgjzabpjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqbHp3dHF2dHN3dGdqemFicGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTUwNDIsImV4cCI6MjA4MjU5MTA0Mn0.2xfLZcR-SO4_2LwlYdjqCiEa3EHfyW1nVVIGDYsO4eA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking for worker_loans table...');

    // Use a simple select
    const { data, error } = await supabase
        .from('worker_loans')
        .select('id')
        .limit(1);

    if (error) {
        console.log('Result: TABLE NOT FOUND or Error');
        console.log('Message:', error.message);
    } else {
        console.log('Result: TABLE EXISTS');
        console.log('Data:', data);
    }
}

checkTables();
