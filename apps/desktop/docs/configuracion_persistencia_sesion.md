# Configuración de Persistencia de Sesión (Solución Híbrida Electron)

**Actualizado**: 2026-06-05 — Revisado contra el código actual.

---

## El Problema

En entornos Electron, el `localStorage` del navegador es efímero. Al cerrar la app:
1. Supabase pierde el token de autenticación (pide login/PIN otra vez)
2. Zustand pierde el estado de la sesión de caja (se muestra como "Cerrada")

---

## La Solución: Puente IPC a Disco Físico

Los datos se guardan permanentemente en un archivo JSON:
`%APPDATA%\desktop\app-storage.json`

### Arquitectura del Flujo

```
Renderer Process (React)
    ↕ window.electronAPI.storageGet / storageSet / storageRemove
Preload Script (electron/preload.ts)
    ↕ ipcRenderer.invoke('storage-get') / ('storage-set') / ('storage-remove')
Main Process (electron/main.ts)
    ↕ fs.readFileSync / fs.writeFileSync
Disco: app-storage.json
```

### Componentes

| Componente | Archivo | Propósito |
|---|---|---|
| Motor IPC | `electron/main.ts` (líneas 154-212) | Handlers `storage-get`, `storage-set`, `storage-remove`. Cache en memoria con `inMemoryStorageCache` |
| Puente | `electron/preload.ts` (líneas 9-11) | Expone `window.electronAPI.storageGet/Set/Remove` |
| Adaptador Supabase | `apps/desktop/src/lib/electronStorage.ts` | Implementa `getItem/setItem/removeItem` para Supabase Auth. Fallback a localStorage si no hay `window.electronAPI` |
| Adaptador Zustand | `apps/shared/lib/zustandElectronStorage.ts` | `createElectronZustandStorage()` → `StateStorage` para middleware `persist` de Zustand |
| Session Keeper | `apps/desktop/src/lib/supabase.ts` (líneas 62-129) | `ensureSession()` — refresca JWT si expira en <120s. Heartbeat cada 50 min. Listeners: visibilitychange, online, focus |

### Qué se Persiste

| Store | Clave | Datos |
|---|---|---|
| Zustand `useSessionStore` | `session-storage` | `user`, `isAuthenticated`, `cashSession`, `workerRole`, `isWorkerAdmin` |
| Supabase Auth (vía `electronStorage`) | `sb-*-auth-token` | Token JWT, refresh token |

**NO se persiste** `isConfigAuthenticated` — el PIN se requiere en cada reinicio de la app.

---

## Verificación

1. **Terminal de Electron**: Al iniciar debe mostrar:
   - `📁 Electron userData path: ...`
   - `📖 [IPC] Reading key: sb-...-auth-token exists: true`
2. **Consola del navegador (F12)**: `✅ Supabase configurado ... usingElectronStorage: true`
3. **Prueba**: Inicia sesión, abre caja, cierra la app con X, reabre → entra directo al POS con caja abierta sin pedir PIN.

---

## Limpieza de Almacenamiento

Para reset completo:
1. Cerrar la app
2. Ir a `%APPDATA%\desktop\`
3. Borrar `app-storage.json`
4. Borrar carpeta `Local Storage`
5. Reiniciar la app
