# Notas de Lanzamiento v1.0.53

**Fecha:** 2026-08-31

## Nuevas Funcionalidades y Mejoras

### 💵 Base Diaria de Caja Configurable (spec 018)

El dinero que se deja en la registradora para abrir el día siguiente ya **no pasa por
Caja Central ni se suma a su total** — y ahora es un monto fijo, configurable una sola
vez.

- **Configuración → Caja** (`GeneralSettings.tsx`): nuevo campo "Base Diaria de Caja".
  Se persiste en `business_settings` (`setting_type='cash'`), sin migración de esquema.
- **Apertura de Caja**: el "Monto Inicial en Efectivo" viene pre-cargado con la Base
  Diaria configurada. Editarlo pide el **PIN Maestro** del negocio (solo si hay una base
  configurada — sin base configurada, el campo funciona libre como antes).
- **Cierre de Caja**: "Base Próximo Día" siempre propone la Base Diaria configurada
  (ya no el `opening_balance` de la sesión). Editarlo también pide PIN.
- **Se elimina el egreso "💵 Base próximo día"** que se registraba en Caja Central en
  cada cierre: causaba que el total de Caja Central perdiera el monto de la base todos
  los días aunque nunca se hubiera sumado (descuadre acumulado). Ahora la base
  simplemente nunca entra a Caja Central.

## Correcciones

- **Apertura de Caja**: el pre-llenado del monto inicial con la Base Diaria ahora es
  reactivo a la carga de la configuración del negocio (antes podía quedarse en $0 si el
  ajuste cargaba después de abrir el modal).
- El candado de PIN sobre el monto de apertura/cierre solo se activa cuando hay una
  Base Diaria realmente configurada — evita bloquear la edición libre en negocios que
  aún no configuraron el ajuste.

## Archivos Modificados

| Archivo | Cambio |
|---|---|
| `apps/shared/store/useBusinessStore.ts` | `dailyCashBase` expuesto desde `business_settings` |
| `apps/desktop/src/components/admin/config/GeneralSettings.tsx` | Sección "Caja" — configurar la Base Diaria |
| `apps/desktop/src/components/modals/OpenSessionModal.tsx` | Monto inicial pre-cargado + gate de PIN |
| `apps/desktop/src/components/modals/CloseSessionModal.tsx` | "Base Próximo Día" pre-cargado + gate de PIN; eliminado el egreso en Caja Central |
| `apps/shared/hooks/useCentralCash.ts` | Nota sobre rama inerte `isBaseProximoDia` |
| `docs/features/cash-flow.md` | Flujo de apertura/cierre y Caja Central actualizado |
| `package.json` (x4) | Versión incrementada a `1.0.53` |

## Especificación

`specs/018-base-diaria-caja/` — spec, plan, research (incluye el análisis del
descuadre y la fórmula del cierre), data-model, quickstart y tasks.

## Actualización de Versión

- Incrementado el número de versión a `1.0.53` en todos los subproyectos del monorepo
  (`root`, `desktop`, `shared`, `web`).
