// Zustand Storage Adapter for Electron and Web
// Makes Zustand persist to Electron filesystem on Desktop and LocalStorage on Web/SSR

import type { StateStorage } from 'zustand/middleware';

export const createElectronZustandStorage = (): StateStorage => {
    return {
        getItem: async (name: string): Promise<string | null> => {
            // SSR Check
            if (typeof window === 'undefined') return null;

            // Electron Check
            if ((window as any).electronAPI) {
                return await (window as any).electronAPI.storageGet(name);
            }

            // Web Fallback
            return localStorage.getItem(name);
        },

        setItem: async (name: string, value: string): Promise<void> => {
            // SSR Check
            if (typeof window === 'undefined') return;

            // Electron Check
            if ((window as any).electronAPI) {
                await (window as any).electronAPI.storageSet(name, value);
            } else {
                // Web Fallback
                localStorage.setItem(name, value);
            }
        },

        removeItem: async (name: string): Promise<void> => {
            // SSR Check
            if (typeof window === 'undefined') return;

            // Electron Check
            if ((window as any).electronAPI) {
                await (window as any).electronAPI.storageRemove(name);
            } else {
                // Web Fallback
                localStorage.removeItem(name);
            }
        },
    };
};
