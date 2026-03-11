export { };

declare global {
    interface Window {
        electronAPI: {
            // Storage
            storageGet: (key: string) => Promise<any>;
            storageSet: (key: string, value: any) => Promise<boolean>;
            storageRemove: (key: string) => Promise<boolean>;
            // Printing
            printReceipt: (data: any) => Promise<{ success: boolean; error?: string }>;
            getPrinters: () => Promise<any[]>;
            // App Info
            getAppVersion: () => Promise<string>;
            setAppName: (name: string) => Promise<boolean>;
            // Hardware
            getHWID: () => Promise<string>;
            // Alerts
            showAlert: (title: string, message: string) => Promise<void>;
            // Auto-updater
            checkForUpdates: () => Promise<{ status: string; message?: string }>;
            onUpdateStatus: (callback: (data: {
                status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'dev';
                version?: string;
                percent?: number;
                message?: string;
            }) => void) => void;
            removeUpdateListener: () => void;
            quitAndInstall: () => void;
        };
    }
}
