// Electron IPC Storage Adapter for Supabase Auth
// This bypasses localStorage issues in Electron by using IPC to save to filesystem

declare global {
    interface Window {
        electronAPI?: {
            storageGet: (key: string) => Promise<any>;
            storageSet: (key: string, value: any) => Promise<boolean>;
            storageRemove: (key: string) => Promise<boolean>;
        };
    }
}

export const electronStorage = {
    async getItem(key: string): Promise<string | null> {
        if (window.electronAPI) {
            const value = await window.electronAPI.storageGet(key);
            return value;
        }
        // Fallback to localStorage
        return localStorage.getItem(key);
    },

    async setItem(key: string, value: string): Promise<void> {
        if (window.electronAPI) {
            await window.electronAPI.storageSet(key, value);
        } else {
            // Fallback to localStorage
            localStorage.setItem(key, value);
        }
    },

    async removeItem(key: string): Promise<void> {
        if (window.electronAPI) {
            await window.electronAPI.storageRemove(key);
        } else {
            // Fallback to localStorage
            localStorage.removeItem(key);
        }
    },
};
