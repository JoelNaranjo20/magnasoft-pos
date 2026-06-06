# Arquitectura del Monorepo — Magnasoft POS

**Versión**: 1.0.46 | **Actualizado**: 2026-06-05

---

## Estructura General

```
magnasoft/
├── apps/
│   ├── desktop/       # Electron + React 19 + Vite 7 + Zustand
│   ├── web/           # Next.js 16 (SSR) + Tailwind v4
│   └── shared/        # Paquete @shared/logic — stores, hooks, utilidades
├── supabase/          # Migraciones, RPCs, políticas RLS
├── specs/             # Artefactos SDD por feature (spec, plan, tasks, research)
├── docs/              # Documentación técnica general
├── apps/desktop/docs/ # Documentación específica del desktop
├── .specify/          # Infraestructura Speckit (templates, extensions, scripts)
├── pnpm-workspace.yaml
└── package.json
```

**Gestor de paquetes**: `pnpm@10.2.0` con workspaces configurados en `pnpm-workspace.yaml`.

## Paquetes del Workspace

### apps/desktop (`magnasoft-pos`)

Aplicación Electron + React con Vite. Es el punto de venta principal.

| Aspecto | Detalle |
|---|---|
| UI | React 19.2.0, TailwindCSS 3.4.17 |
| Build | `vite build` + `tsc -b` + `electron-builder` |
| Dev | `concurrently` Vite (puerto 5180) + Electron |
| Estado | Zustand 5.0.3 + stores compartidas |
| Router | `HashRouter` (react-router-dom 7.11.0) |
| Iconos | Material Symbols (Google Fonts) + Lucide React |
| Gráficos | Recharts 3.6.0 |
| Auto-update | `electron-updater` 6.8.3 |
| HWID | `node-machine-id` 1.1.12 |

### apps/web (`magnasoft-web`)

Aplicación web con Next.js 16. Panel de administración SaaS y dashboard web.

| Aspecto | Detalle |
|---|---|
| UI | React 19.2.3, TailwindCSS v4 |
| Build | `next build` |
| Formularios | react-hook-form 7.71.1 + Zod 4.3.6 |
| Tablas | @tanstack/react-table 8.21.3 |
| Estado | Zustand 5.0.11 + @shared/logic |

### apps/shared (`@shared/logic`)

Paquete compartido con lógica de negocio, stores Zustand, hooks y utilidades. Usado por ambos desktop y web.

## Configuración TypeScript

- **Desktop (`tsconfig.app.json`)**: target ES2022, strict true, `noUnusedLocals`, `noUnusedParameters`, paths `@/*` → `./src/*` y `@shared/*` → `../shared/*`
- **Electron (`tsconfig.electron.json`)**: target ESNext, module commonjs, outDir `dist-electron`
- **Node (`tsconfig.node.json`)**: solo incluye `vite.config.ts`
- **Web**: Configuración por defecto de Next.js (no tiene tsconfig propio)
- **Shared**: No tiene tsconfig propio, se referencia vía paths desde desktop y como `@shared/logic` desde web

## Patrón de Rutas (Desktop)

Usa `HashRouter` para compatibilidad con Electron (`file://` protocol). Rutas principales:

| Ruta | Componente | Protección |
|---|---|---|
| `/` | FinanceDashboard | ConfigGuard (dashboard) |
| `/sales` | SalesPage | ConfigGuard (sales) |
| `/finance` | FinancePage | ConfigGuard (finance) |
| `/customers` | CustomersPage | ConfigGuard (customers) |
| `/audit` | AuditPage | ConfigGuard + AdminGuard |
| `/inventory` | InventoryPage | ConfigGuard + AdminGuard |
| `/config` | ConfigPage | ConfigGuard + AdminGuard |
| `/pos/*` | POSLayout + modales | Sesión activa requerida |
| `/setup` | DesktopSetup | Sin autenticación |
| `/login` | LoginPage | Sin autenticación |

**Protección**:
- `ConfigGuard`: Requiere PIN maestro para módulos protegidos
- `AdminGuard`: Solo usuarios con rol `admin`, `super_admin` o `saas_role` admin

## Flujo de Inicio (App.tsx)

**Máquina de estados**:

1. **LOADING**: Mientras `useAuthStore` carga — spinner
2. **NO USER**: Sin autenticación → solo `/login` y `/reset-password`
3. **NO BUSINESS**: Autenticado sin negocio → solo `/setup`
4. **BUSINESS NOT ACTIVE**: Negocio inactivo → pantalla de bloqueo
5. **FULL ACCESS**: Aplicación principal con todas las rutas

## Electron: Puente IPC

El main process expone handlers IPC y el preload script los puentea al renderer vía `window.electronAPI`:

| Método | Handler | Propósito |
|---|---|---|
| `storageGet/Set/Remove` | `storage-get/set/remove` | Persistencia en `app-storage.json` |
| `getHWID` | `get-hwid` | ID único de hardware |
| `getPrinters` | `get-printers` | Lista impresoras del sistema |
| `printReceipt` | `print-receipt` | Impresión de recibos |
| `getAppVersion` | `get-app-version` | Versión del binario |
| `checkForUpdates` | `check-for-updates` | Auto-updater |
| `quitAndInstall` | `quit-and-install` | Instalar actualización |
| `setAppName` | `set-app-name` | Persiste nombre del negocio |
| `showAlert` | `show-alert` | Diálogo nativo del SO |
