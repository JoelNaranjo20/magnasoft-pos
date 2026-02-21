import { create } from 'zustand';
import { supabase } from '@shared/lib/supabase';
import { useBusinessStore } from './useBusinessStore';

interface UserProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    role: string | null;
    saas_role: string | null;
    business_id: string | null;
    account_status?: string;
    [key: string]: any;
}

interface Business {
    id: string;
    name: string | null;
    slug: string | null;
    business_type: 'automotive' | 'restaurant' | 'retail' | 'barbershop' | 'other' | string | null;
    config: any;
    status: string | null;
    [key: string]: any;
}


interface AuthState {
    user: any | null;
    profile: UserProfile | null;
    business: Business | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isSuperAdmin: boolean;

    // Actions
    setSession: (session: any) => void;
    setProfile: (profile: UserProfile | null) => void;
    setBusiness: (business: Business | null) => void;
    setLoading: (loading: boolean) => void;
    checkSession: () => Promise<void>;
    signOut: () => Promise<void>;
}

const isBrowser = typeof window !== 'undefined';

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    business: null,
    isLoading: true,
    isAuthenticated: false,
    isSuperAdmin: false,

    setSession: (session) => set((_state) => ({
        user: session?.user || null,
        isAuthenticated: !!session?.user,
        isLoading: false
    })),

    setProfile: (profile) => set((_state) => ({
        profile,
        isSuperAdmin: profile?.role === 'super_admin'
    })),

    setBusiness: (business) => set({ business }),

    setLoading: (isLoading) => set({ isLoading }),

    checkSession: async () => {
        console.log('[Auth] Starting checkSession with Safety Timeout (5s)...');
        set({ isLoading: true });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 5000)
        );

        try {
            await Promise.race([
                (async () => {
                    console.log('[Auth] Fetching session from Supabase...');
                    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                    if (sessionError) throw sessionError;

                    if (!session) {
                        console.warn('[Auth] No session found');
                        set({
                            user: null,
                            profile: null,
                            business: null,
                            isAuthenticated: false,
                        });
                        return;
                    }

                    console.log('[Auth] Session found for user:', session.user.id);
                    set({ user: session.user, isAuthenticated: true });

                    // Fetch Profile + Business in one query (Explicit Foreign Key)
                    // This avoids RLS issues and ensures atomic data fetch
                    console.log('[Auth] Fetching profile with business relation...');
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*, business:business_id(*)')
                        .eq('id', session.user.id)
                        .single();

                    if (profileError) {
                        console.error('[Auth] Error fetching profile:', profileError.message, JSON.stringify(profileError));
                        throw profileError;
                    }

                    if (profile) {
                        console.log('[Auth] Profile found:', profile.full_name, '| Role:', profile.role);


                        // Extract business from the foreign key relation
                        // TypeScript doesn't know about the nested relation, so we cast
                        const business = (profile as any).business;

                        // Set profile in store
                        set({ profile });

                        // Set business if it exists
                        if (business) {
                            console.log('[Auth] Business found:', business.name, '| Status:', business.status);
                            set({ business: business as any });

                            // Sync to LocalStorage
                            if (isBrowser) {
                                localStorage.setItem('sv_business_id', business.id);
                                if (business.name) localStorage.setItem('sv_business_name', business.name);
                                if (business.business_type) localStorage.setItem('sv_business_type', business.business_type);
                            }

                            // Sync to BusinessStore (Fix for Header stuck on "Cargando...")
                            useBusinessStore.setState({
                                id: business.id,
                                name: business.name || 'Empresa',
                                businessType: business.business_type || 'general',
                                logoUrl: (business as any).logo_url // Cast because Business interface might miss logo_url
                            });

                            // Trigger full fetch to load the config JSON and real-time listeners
                            useBusinessStore.getState().fetchBusinessProfile();
                        } else {
                            console.log('[Auth] No business linked to this profile.');
                            set({ business: null });
                        }
                    }
                })(),
                timeoutPromise
            ]);
        } catch (error: any) {
            if (error.message === 'AUTH_TIMEOUT') {
                console.error('[Auth] CRITICAL: Session check TIMEOUT (5s) reached. Unblocking UI.');
            } else {
                console.error('[Auth] CRITICAL ERROR during checkSession:', error.message || error);
            }
        } finally {
            console.log('[Auth] checkSession finished. Setting isLoading to false.');
            set({ isLoading: false });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({
            user: null,
            profile: null,
            business: null,
            isAuthenticated: false,
            isSuperAdmin: false
        });
        if (isBrowser) {
            localStorage.clear(); // Clear all local storage on signout
        }
    },
}));
