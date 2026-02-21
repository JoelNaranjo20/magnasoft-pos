// Type definitions for Electron API exposed via preload

export interface ElectronAPI {
    printReceipt: (data: any) => Promise<{ success: boolean }>;
    getPrinters: () => Promise<any[]>;
    getAppVersion: () => string | undefined;
    storageGet: (key: string) => Promise<any>;
    storageSet: (key: string, value: any) => Promise<boolean>;
    storageRemove: (key: string) => Promise<boolean>;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
