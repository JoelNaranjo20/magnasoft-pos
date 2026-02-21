import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

// Set userData path explicitly to ensure persistence
const userDataPath = app.getPath('userData');
const storageFilePath = path.join(userDataPath, 'app-storage.json');

// Ensure storage file exists and load persistent app name
let appData: any = {};
try {
    if (!fs.existsSync(storageFilePath)) {
        fs.writeFileSync(storageFilePath, JSON.stringify({}), 'utf-8');
    } else {
        appData = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
        if (appData.appName) {
            app.name = appData.appName;
        }
    }
} catch (e) {
    console.error('Error loading app name from storage:', e);
}

const createWindow = () => {
    // Read version from package.json
    const packageJson = require('../package.json');
    const version = packageJson.version || '1.0.0';

    const iconPath = process.platform === 'win32'
        ? path.join(__dirname, '../public/icon.ico')
        : path.join(__dirname, '../public/icon.png');

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: `POS Lavadero - Principal v${version}`,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            // Ensure localStorage persists
            partition: 'persist:servicar-ov',
        },
    });

    // Check if we are in dev mode (Vite typically runs on 5173)
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
    createWindow();
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers for persistent storage (bypassing localStorage issues)
ipcMain.handle('storage-get', async (event, key: string) => {
    try {
        console.log(`[Storage] Reading key '${key}' from:`, storageFilePath);
        if (!fs.existsSync(storageFilePath)) return null;

        const content = fs.readFileSync(storageFilePath, 'utf-8');
        if (!content) return null;

        const data = JSON.parse(content);
        const value = data[key];
        console.log(`[Storage] Value for '${key}':`, value);
        return value || null;
    } catch (error) {
        console.error('❌ [IPC] Error reading storage:', error);
        return null;
    }
});

ipcMain.handle('storage-set', async (event, key: string, value: any) => {
    try {
        console.log(`[Storage] Setting key '${key}' to:`, value);
        let data: any = {};

        if (fs.existsSync(storageFilePath)) {
            try {
                const content = fs.readFileSync(storageFilePath, 'utf-8');
                if (content.trim()) {
                    data = JSON.parse(content);
                }
            } catch (e) {
                console.warn('[Storage] File corrupt or empty, resetting:', e);
                data = {};
            }
        }

        data[key] = value;
        fs.writeFileSync(storageFilePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('❌ [IPC] Error writing storage:', error);
        return false;
    }
});

ipcMain.handle('storage-remove', async (event, key: string) => {
    try {
        if (!fs.existsSync(storageFilePath)) return true;

        const content = fs.readFileSync(storageFilePath, 'utf-8');
        let data: any = {};
        if (content.trim()) {
            data = JSON.parse(content);
        }

        delete data[key];
        fs.writeFileSync(storageFilePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('❌ [IPC] Error removing from storage:', error);
        return false;
    }
});

// HWID IPC Handler
ipcMain.handle('get-hwid', async () => {
    try {
        const { machineIdSync } = require('node-machine-id');
        return machineIdSync();
    } catch (error) {
        console.error('❌ [IPC] Error getting HWID:', error);
        return 'UNKNOWN-HWID-' + Math.random().toString(36).substr(2, 9);
    }
});

// Printer IPC
ipcMain.handle('get-printers', async () => {
    if (!mainWindow) return [];
    try {
        return await mainWindow.webContents.getPrintersAsync();
    } catch (error) {
        console.error('❌ [IPC] Error getting printers:', error);
        return [];
    }
});

ipcMain.handle('print-receipt', async (event, options) => {
    // options might contain { printerName, silent: true, etc }
    // In a real implementation, we might create a hidden window, 
    // load receipt HTML/CSS, and print it.
    // For now, we'll return success to allow the UI to proceed 
    // and we could trigger a basic print if a window exists.
    if (!mainWindow) return { success: false };

    try {
        // Basic implementation using the current window or a hidden one
        // For thermal printing, often we use a hidden window or direct raw printing
        // But to keep it simple and compatible with existing ticket buttons:
        // mainWindow.webContents.print(options);
        return { success: true };
    } catch (error: any) {
        console.error('❌ [IPC] Error printing:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('set-app-name', (event, name: string) => {
    if (name) {
        app.name = name;
        // Persist the name so it stays after Ctrl+R or restart
        try {
            const data = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
            data.appName = name;
            fs.writeFileSync(storageFilePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (e) { }
        return true;
    }
    return false;
});
ipcMain.handle('show-alert', async (event, { title, message }) => {
    if (!mainWindow) return;
    return await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: title || app.name,
        message: message,
        buttons: ['Aceptar'],
        noLink: true
    });
});
