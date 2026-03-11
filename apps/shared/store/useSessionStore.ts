// @ts-nocheck
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@shared/lib/supabase';
import { createElectronZustandStorage } from '@shared/lib/zustandElectronStorage';

// Use any for types to bypass generated type issues with renamed/new tables
type Profile = any;
type CashSession = any;

interface SessionState {
    user: Profile | null;
    isAuthenticated: boolean;
    cashSession: CashSession | null;
    workerRole: string | null;
    isWorkerAdmin: boolean;
    loading: boolean;
    isClosing: boolean;
    isConfigAuthenticated: boolean;
    hasHydrated: boolean;
    setUser: (user: Profile | null) => void;
    setAuthenticated: (authenticated: boolean) => void;
    setConfigAuthenticated: (authenticated: boolean) => void;
    setCashSession: (session: CashSession | null, workerRole?: string | null, isOwner?: boolean, isSuperAdmin?: boolean) => void;
    setLoading: (loading: boolean) => void;
    setClosing: (closing: boolean) => void;
    refreshAdminStatus: () => Promise<void>;
    logout: () => void;


}

export const useSessionStore = create<SessionState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            cashSession: null,
            workerRole: null,
            isWorkerAdmin: false,
            loading: true,
            isClosing: false,
            isConfigAuthenticated: false,
            hasHydrated: false,
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
            setConfigAuthenticated: (authenticated) => set({ isConfigAuthenticated: authenticated }),
            setCashSession: (session, workerRole = null, isOwner = false, isSuperAdmin = false) => set({
                cashSession: session,
                workerRole: workerRole || null,
                isWorkerAdmin: isOwner || isSuperAdmin || (workerRole?.toLowerCase().includes('admin') ?? false)
            }),
            setLoading: (loading) => set({ loading }),
            setClosing: (closing) => set({ isClosing: closing }),
            refreshAdminStatus: async () => {
                const state = useSessionStore.getState();
                if (!state.cashSession) return;

                // Import dynamically to avoid circular dependencies if any
                const { useAuthStore } = await import('./useAuthStore');
                const { profile, business: authBusiness } = useAuthStore.getState();

                const isOwner = profile?.id && authBusiness?.owner_id && profile.id === authBusiness.owner_id;
                const isSuperAdmin = profile?.role === 'super_admin' || profile?.saas_role === 'super_admin';

                // Fetch current worker role
                const { data: workerData } = await supabase
                    .from('workers')
                    .select('*, roles(name)')
                    .eq('id', state.cashSession.worker_id)
                    .single();

                const workerRole = workerData?.roles?.name || workerData?.role || null;
                const isWorkerAdmin = isOwner || isSuperAdmin || (workerRole?.toLowerCase().includes('admin') ?? false);

                console.log("🔄 refreshAdminStatus Details:", {
                    isOwner,
                    isSuperAdmin,
                    workerRole,
                    finalIsAdmin: isWorkerAdmin
                });

                set({
                    workerRole,
                    isWorkerAdmin
                });
            },

            logout: async () => {
                await supabase.auth.signOut();
                set({ user: null, isAuthenticated: false, cashSession: null, workerRole: null, isWorkerAdmin: false, isClosing: false, isConfigAuthenticated: false });
            },

        }),
        {
            name: 'session-storage',
            storage: createJSONStorage(() => createElectronZustandStorage()),
            // Only persist cashSession - let Supabase handle auth persistence
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                cashSession: state.cashSession,
                workerRole: state.workerRole,
                isWorkerAdmin: state.isWorkerAdmin,
                // isConfigAuthenticated is intentionally NOT persisted

                // so PIN is required on every app restart
            }),
            onRehydrateStorage: () => (state) => {
                // This callback is called when rehydration completes
                if (state) {
                    state.hasHydrated = true;
                }
            },
        }
    )
);

