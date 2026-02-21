import { createClient } from '@supabase/supabase-js';

// Environment-safe access to environment variables
// We use literal access (process.env.NAME) to ensure Next.js and Vite can statically replace them
const supabaseUrl =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) ||
    // @ts-ignore
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    '';

const supabaseAnonKey =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) ||
    // @ts-ignore
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    '';

// Environment-aware storage for Supabase Auth
const isBrowser = typeof window !== 'undefined';
const customStorage = {
    getItem: async (key: string) => {
        if (!isBrowser) return null;
        if ((window as any).electronAPI) {
            return await (window as any).electronAPI.storageGet(key);
        }
        return localStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
        if (!isBrowser) return;
        if ((window as any).electronAPI) {
            await (window as any).electronAPI.storageSet(key, value);
        } else {
            localStorage.setItem(key, value);
        }
    },
    removeItem: async (key: string) => {
        if (!isBrowser) return;
        if ((window as any).electronAPI) {
            await (window as any).electronAPI.storageRemove(key);
        } else {
            localStorage.removeItem(key);
        }
    },
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        storage: customStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});
