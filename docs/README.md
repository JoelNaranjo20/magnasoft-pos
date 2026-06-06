# Documentación — Magnasoft POS v1.0.46

**Actualizado**: 2026-06-05

---

## Arquitectura

| Documento | Contenido |
|---|---|
| [architecture/monorepo.md](architecture/monorepo.md) | Estructura del monorepo, paquetes, rutas, Electron, TypeScript |

## Base de Datos

| Documento | Contenido |
|---|---|
| [database/schema.md](database/schema.md) | Tablas, funciones RPC, RLS, relaciones, JSONB metadata |

## Features

| Documento | Contenido |
|---|---|
| [features/cash-flow.md](features/cash-flow.md) | Flujo completo de caja: apertura, sesión, cierre, caja central |
| [features/customers.md](features/customers.md) | Módulo de clientes: gestión, unificación, prevención de duplicados |
| [features/pos-payment.md](features/pos-payment.md) | Sistema POS: PaymentModal, propinas, cambio cruzado, metadata |

## Desarrollo

| Documento | Contenido |
|---|---|
| [development/stores.md](development/stores.md) | Stores de Zustand (compartidas y desktop), persistencia, módulos |
| [development/module-system.md](development/module-system.md) | Sistema de módulos multi-industria, presets, feature flags |

## Desktop

| Documento | Contenido |
|---|---|
| [apps/desktop/docs/configuracion_persistencia_sesion.md](../apps/desktop/docs/configuracion_persistencia_sesion.md) | Persistencia de sesión con Electron IPC |

## Guías

| Documento | Contenido |
|---|---|
| [FRONTEND_OPTIMIZATION.md](FRONTEND_OPTIMIZATION.md) | Guía de optimización frontend (virtualización, memoización) |

---

## Specs Activas

| Spec | Rama |
|---|---|
| [005-mejora-cambio-propinas](../specs/005-mejora-cambio-propinas/spec.md) | `005-mejora-cambio-propinas` |
| [004-fix-duplicados-pagos](../specs/004-fix-duplicados-pagos/spec.md) | `004-fix-duplicados-pagos` |
| [003-unificar-clientes](../specs/003-unificar-clientes/spec.md) | `003-unificar-clientes` (merged) |

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Desktop runtime | Electron 33 + React 19 + Vite 7 |
| Web | Next.js 16 + React 19 |
| Estado | Zustand 5 |
| Base de datos | PostgreSQL (Supabase) |
| Estilos | Tailwind CSS 3.4 (desktop), v4 (web) |
| Gráficos | Recharts 3.6 |
| Íconos | Material Symbols + Lucide React |
| Monorepo | pnpm workspaces |
| CI/CD | electron-builder + auto-updater |
