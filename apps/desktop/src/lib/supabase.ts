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


let isInitialized = false;
let refreshPromise: Promise<void> | null = null;

export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            storage: electronStorage as any,  // Use Electron IPC storage
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
        },
        global: {
            fetch: async (url, options) => {
                const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();
                // Avoid recursion: do not run ensureSession for auth-related requests (token refresh, etc.)
                if (!urlStr.includes('/auth/v1/')) {
                    try {
                        await ensureSession();
                    } catch (e) {
                        console.error('[Supabase Fetch Interceptor] Error ensuring session:', e);
                    }
                }
                return fetch(url, options);
            }
        }
    }
);

isInitialized = true;

/**
 * Ensures the current session is valid. If the JWT is expired or close to
 * expiring (< 120 s), it forces a token refresh before the caller proceeds.
 * Call this at the beginning of any write operation to avoid JWT-expired errors.
 */
export async function ensureSession(): Promise<void> {
    if (!isInitialized) return;
    if (refreshPromise) {
        return refreshPromise;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const expiresAt = session.expires_at ?? 0; // Unix timestamp in seconds
    const nowSec = Math.floor(Date.now() / 1000);
    const secondsLeft = expiresAt - nowSec;

    if (secondsLeft < 120) {
        // Token expired or expiring soon — force refresh
        refreshPromise = (async () => {
            try {
                const { error } = await supabase.auth.refreshSession();
                if (error) {
                    console.warn('[ensureSession] Could not refresh session:', error.message);
                } else {
                    console.log('[SessionKeeper] Token refreshed successfully.');
                }
            } catch (err) {
                console.error('[ensureSession] Exception during refresh:', err);
            } finally {
                refreshPromise = null;
            }
        })();
        return refreshPromise;
    }
}

// ═══════════════════════════════════════════════════════════
// GLOBAL SESSION KEEPER — Prevents JWT Expired errors
// ═══════════════════════════════════════════════════════════
// This runs automatically and keeps the session alive without
// needing to add ensureSession() to every individual component.

const SESSION_REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 minutes (JWT expires at 60)

// 1) Periodic heartbeat: refresh every 50 minutes
setInterval(() => {
    ensureSession().catch(() => {});
}, SESSION_REFRESH_INTERVAL_MS);

// 2) Refresh when user returns to the app (tab becomes visible again)
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('[SessionKeeper] App became visible — checking session...');
            ensureSession().catch(() => {});
        }
    });
}

// 3) Refresh when the computer comes back online (after sleep/hibernate)
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('[SessionKeeper] Network reconnected — refreshing session...');
        ensureSession().catch(() => {});
    });

    // Also refresh on focus (Electron app coming back to foreground)
    window.addEventListener('focus', () => {
        ensureSession().catch(() => {});
    });
}

