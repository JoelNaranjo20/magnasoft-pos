export { };

declare global {
    interface Window {
        electronAPI: {
            storageGet: (key: string) => Promise<any>;
            storageSet: (key: string, value: any) => Promise<boolean>;
            storageRemove: (key: string) => Promise<boolean>;
            // Add other electronAPI methods here if needed
        };
    }
}
