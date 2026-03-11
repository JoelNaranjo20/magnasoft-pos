// Electron IPC Storage Adapter for Supabase Auth
// This bypasses localStorage issues in Electron by using IPC to save to filesystem


export const electronStorage = {
    async getItem(key: string): Promise<string | null> {
        if (window.electronAPI) {
            const value = await window.electronAPI.storageGet(key);
            // Supabase expects a strictly stringified JSON object for the session.
            // If the IPC returned a parsed object (due to main.ts json parse), we must re-stringify it.
            if (value && typeof value !== 'string') {
                return JSON.stringify(value);
            }
            return value as string | null;
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
