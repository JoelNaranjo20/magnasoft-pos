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
    loading: boolean;
    isClosing: boolean;
    isConfigAuthenticated: boolean;
    hasHydrated: boolean;
    setUser: (user: Profile | null) => void;
    setAuthenticated: (authenticated: boolean) => void;
    setConfigAuthenticated: (authenticated: boolean) => void;
    setCashSession: (session: CashSession | null) => void;
    setLoading: (loading: boolean) => void;
    setClosing: (closing: boolean) => void;
    logout: () => void;
}

export const useSessionStore = create<SessionState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            cashSession: null,
            loading: true,
            isClosing: false,
            isConfigAuthenticated: false,
            hasHydrated: false,
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
            setConfigAuthenticated: (authenticated) => set({ isConfigAuthenticated: authenticated }),
            setCashSession: (session) => set({ cashSession: session }),
            setLoading: (loading) => set({ loading }),
            setClosing: (closing) => set({ isClosing: closing }),
            logout: async () => {
                await supabase.auth.signOut();
                set({ user: null, isAuthenticated: false, cashSession: null, isClosing: false, isConfigAuthenticated: false });
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

