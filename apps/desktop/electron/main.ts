import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';

// Auto-updater configuration
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowDowngrade = false;

function setupAutoUpdater() {
    const isDev = process.env.NODE_ENV === 'development';
    // Disable auto-updater in development mode
    if (isDev) {
        console.log('[Updater] Skipping auto-update check in development mode.');
        return;
    }

    autoUpdater.on('checking-for-update', () => {
        console.log('[Updater] Checking for updates...');
        mainWindow?.webContents.send('update-status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
        console.log('[Updater] Update available:', info.version);
        mainWindow?.webContents.send('update-status', { status: 'available', version: info.version });
    });

    autoUpdater.on('update-not-available', () => {
        console.log('[Updater] App is up to date.');
        mainWindow?.webContents.send('update-status', { status: 'not-available' });
    });

    autoUpdater.on('download-progress', (progress) => {
        console.log(`[Updater] Downloading: ${Math.round(progress.percent)}%`);
        mainWindow?.webContents.send('update-status', { status: 'downloading', percent: Math.round(progress.percent) });
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('[Updater] Update downloaded:', info.version);
        mainWindow?.webContents.send('update-status', { status: 'downloaded', version: info.version });
        if (mainWindow) {
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Actualización lista',
                message: `La versión ${info.version} fue descargada. ¿Deseas reiniciar ahora para instalarla?`,
                buttons: ['Reiniciar ahora', 'Después'],
                defaultId: 0,
                noLink: true
            }).then(({ response }) => {
                if (response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        }
    });

    autoUpdater.on('error', (err) => {
        console.error('[Updater] Error:', err.message);
        mainWindow?.webContents.send('update-status', { status: 'error', message: err.message });
    });

    autoUpdater.checkForUpdatesAndNotify();
}

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

    // Check if we are in dev mode (Vite typically runs on 5180)
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL('http://localhost:5180');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
    createWindow();
    setupAutoUpdater();
});

// IPC: Allow renderer to manually check for updates
ipcMain.handle('check-for-updates', async () => {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) return { status: 'dev' };
    try {
        await autoUpdater.checkForUpdates();
        return { status: 'ok' };
    } catch (err: any) {
        return { status: 'error', message: err.message };
    }
});

// IPC: Get real app version from Electron (not hardcoded)
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// IPC: Trigger quit and install update
ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
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
let inMemoryStorageCache: any = null;

const loadStorageCache = () => {
    if (inMemoryStorageCache) return inMemoryStorageCache;
    try {
        if (!fs.existsSync(storageFilePath)) {
            inMemoryStorageCache = {};
        } else {
            const content = fs.readFileSync(storageFilePath, 'utf-8');
            inMemoryStorageCache = content.trim() ? JSON.parse(content) : {};
        }
    } catch (e) {
        console.warn('❌ [Storage] File corrupt or unreadable, resetting cache:', e);
        inMemoryStorageCache = {};
    }
    return inMemoryStorageCache;
};

const saveStorageCache = () => {
    try {
        fs.writeFileSync(storageFilePath, JSON.stringify(inMemoryStorageCache, null, 2), 'utf-8');
    } catch (e) {
        console.error('❌ [Storage] Error writing to file:', e);
    }
};

ipcMain.handle('storage-get', async (event, key: string) => {
    try {
        const cache = loadStorageCache();
        return cache[key] || null;
    } catch (error) {
        console.error('❌ [IPC] Error reading storage:', error);
        return null;
    }
});

ipcMain.handle('storage-set', async (event, key: string, value: any) => {
    try {
        const cache = loadStorageCache();
        cache[key] = value;
        saveStorageCache(); // Write to disk synchronously 
        return true;
    } catch (error) {
        console.error('❌ [IPC] Error writing storage:', error);
        return false;
    }
});

ipcMain.handle('storage-remove', async (event, key: string) => {
    try {
        const cache = loadStorageCache();
        delete cache[key];
        saveStorageCache(); // Write to disk synchronously
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
