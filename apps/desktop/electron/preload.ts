import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    printReceipt: (data: any) => ipcRenderer.invoke('print-receipt', data),
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    getAppVersion: () => '1.0.7',
    // Persistent storage methods
    storageGet: (key: string) => ipcRenderer.invoke('storage-get', key),
    storageSet: (key: string, value: any) => ipcRenderer.invoke('storage-set', key, value),
    storageRemove: (key: string) => ipcRenderer.invoke('storage-remove', key),
    // Hardware ID
    getHWID: () => ipcRenderer.invoke('get-hwid'),
    // Dynamic App Name
    setAppName: (name: string) => ipcRenderer.invoke('set-app-name', name),
    // Custom Alerts
    showAlert: (title: string, message: string) => ipcRenderer.invoke('show-alert', { title, message })
});
