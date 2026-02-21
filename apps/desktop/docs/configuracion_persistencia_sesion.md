# Configuración de Persistencia de Sesión (Solución Híbrida Electron)

Este documento explica cómo se implementó la persistencia de datos para que la aplicación mantenga la sesión del usuario (Auth) y el estado de la caja (POS) incluso después de reiniciar la aplicación o la computadora.

## 🚀 El Problema de Origen
En entornos de Electron (especialmente en desarrollo con `localhost`), el `localStorage` del navegador es **efímero**. Esto causaba que:
1. Al cerrar la app, Supabase perdía el token (pedía login/PIN otra vez).
2. Al reiniciar, Zustand perdía el estado de la sesión de caja (se mostraba como "Cerrada").

## 🛠️ La Solución: Puente IPC a Disco Físico
Hemos creado un sistema que puentea el almacenamiento del navegador hacia un archivo JSON real en el sistema de archivos de Windows.

### 1. El Archivo de Almacenamiento
Los datos se guardan permanentemente en:
`%APPDATA%\desktop\app-storage.json`

### 2. Arquitectura del Flujo
La persistencia funciona mediante **IPC (Inter-Process Communication)**:

*   **Renderer Process (React)**: Solicita guardar o leer una clave.
*   **Preload Script**: Expone las funciones `storageGet`, `storageSet` y `storageRemove`.
*   **Main Process (Electron)**: Recibe la petición y usa el módulo `fs` de Node.js para escribir/leer el archivo JSON en el disco.

---

## 🏗️ Componentes de la Implementación

### A. El Motor de Almacenamiento (Main & Preload)
*   **`electron/main.ts`**: Contiene los manejadores (`ipcMain.handle`) que gestionan el archivo `app-storage.json`.
*   **`electron/preload.ts`**: Expone `window.electronAPI` para que React pueda comunicarse con el disco.

### B. Adaptadores para Librerías
*   **`src/lib/electronStorage.ts`**: Un adaptador que engaña a **Supabase Auth** para que use el disco en lugar de `localStorage`.
*   **`src/lib/zustandElectronStorage.ts`**: Un adaptador que permite a **Zustand** (la tienda de la sesión) persistir la caja abierta en el disco de manera asíncrona.

### C. Aplicación en el Código
*   **`src/lib/supabase.ts`**: Configurado con el nuevo `electronStorage`.
*   **`src/store/useSessionStore.ts`**: Configurado para persistir únicamente `cashSession` usando el bridge de Electron.
*   **`src/App.tsx`**: Mejorado para que la sincronización con la Base de Datos sea "no destructiva" (no borra la sesión local si la DB tarda en responder).

---

## 📋 Cómo verificar la persistencia

1.  **Terminal de Electron**: Al iniciar, deberías ver:
    *   `📁 Electron userData path: ...`
    *   `📖 [IPC] Reading key: sb-...-auth-token exists: true`
2.  **Consola del Navegador (F12)**:
    *   `✅ Supabase configurado ... usingElectronStorage: true`
3.  **Prueba de Fuego**:
    *   Inicia sesión y abre la caja.
    *   Cierra la aplicación con la **X**.
    *   Vuelve a abrirla.
    *   **Resultado**: Deberías entrar directamente al POS con la caja abierta sin que te pida el PIN.

---

## ⚠️ Notas de Mantenimiento
Si alguna vez necesitas resetear la aplicación por completo (limpiar todo el almacenamiento):
1. Cierra la aplicación.
2. Ve a `%APPDATA%\desktop\`.
3. Borra el archivo `app-storage.json`.
4. Borra la carpeta `Local Storage`.
5. Reinicia la aplicación.
