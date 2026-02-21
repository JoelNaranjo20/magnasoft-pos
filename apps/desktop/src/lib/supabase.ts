import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { electronStorage } from './electronStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validación de variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = `
❌ ERROR: Variables de entorno de Supabase no configuradas
- VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Configurada' : '❌ Falta'}
- VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Configurada' : '❌ Falta'}

Verifica que:
1. El archivo .env.local existe en la raíz del proyecto
2. Las variables comienzan con VITE_ 
3. El servidor de desarrollo se reinició después de modificar .env.local
`;
    console.error(errorMsg);
    throw new Error('Supabase no está configurado correctamente. Revisa .env.local y reinicia el servidor.');
}


export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            storage: electronStorage as any,  // Use Electron IPC storage
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
        }
    }
);

