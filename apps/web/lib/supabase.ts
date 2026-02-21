import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // In development, this log might be spammy if envs are not set yet, 
    // but helpful for debugging.
    // console.warn('Missing Supabase Environment Variables');
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);
