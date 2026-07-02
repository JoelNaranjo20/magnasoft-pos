# Research: Limpieza de Caja Central y Mejora de Información de Ingresos

**Feature**: 016-admin-caja-central-cleanup
**Date**: 2026-06-25

## Decision 1: Separar `central_cash_movements` en su propio parámetro RPC

**Decision**: Añadir `p_delete_central_cash BOOLEAN DEFAULT FALSE` como séptimo parámetro a `reset_business_data_modules`, y mover la eliminación de `central_cash_movements` fuera del bloque `p_delete_cash`.

**Rationale**:
- Actualmente `central_cash_movements` se borra dentro del bloque `IF p_delete_cash THEN` (línea 52 de la migración `20260325105000`), junto con `cash_sessions` y `cash_movements`.
- El usuario quiere granularidad: poder borrar solo Caja Central sin tocar sesiones de caja.
- Añadir un parámetro independiente es la forma más limpia de lograr esto sin romper la funcionalidad existente.
- Con `DEFAULT FALSE`, las llamadas existentes que no pasen el nuevo parámetro mantienen el comportamiento actual (no se borra central_cash_movements a menos que se pida explícitamente), lo cual es seguro.

**Alternatives considered**:
- **A. Mantener central_cash_movements en p_delete_cash y añadir un sub-checkbox en el frontend**: Rechazado porque no permite borrar Caja Central sin borrar sesiones de caja.
- **B. Crear una RPC separada solo para central_cash_movements**: Rechazado porque añade complejidad innecesaria (dos llamadas RPC en lugar de una) y rompe el patrón existente de un solo entry point para limpieza.

## Decision 2: Resolver `user_id` a nombre de usuario en el hook

**Decision**: Añadir una consulta ligera a `profiles` (o `auth.users`) en el hook `useCentralCash` para construir un mapa `Record<string, string>` de `user_id` → `full_name` (o `email` como fallback), y usarlo para poblar un nuevo campo `user_name` en la interfaz `CentralMovement`.

**Rationale**:
- El campo `user_id` ya existe en `central_cash_movements` y se persiste correctamente en `addMovement` (línea 1369 de `useCentralCash.ts`).
- Para mostrar el nombre, necesitamos resolver el UUID a un nombre legible. La tabla `profiles` (en schema `public`) tiene `id`, `full_name`, `email`.
- Añadir un campo `user_name: string | null` al interface `CentralMovement` y resolverlo en `fetchMovements()` es el approach más limpio: una sola consulta adicional para obtener todos los perfiles necesarios, luego un `map` en memoria.
- Cuando `user_id` es NULL (usuarios 'terminal-local' o movimientos automáticos), `user_name` será `null` y el componente mostrará "Sistema" como fallback.

**Alternatives considered**:
- **A. JOIN en la query de Supabase**: `central_cash_movements` y `profiles` están en schemas diferentes (`public`). PostgREST no soporta JOINs cross-schema fácilmente sin una vista o RPC. Rechazado por complejidad.
- **B. Subquery por cada movimiento**: Ineficiente (N+1 queries). Rechazado.
- **C. Añadir `user_name` como campo redundante en `central_cash_movements`**: Requeriría migración de schema + trigger para mantener sincronía. Overkill para un campo de solo lectura en UI. Rechazado.

## Decision 3: Dónde hacer los cambios de UI para el checkbox

**Decision**: Modificar ambas páginas existentes — `configurations/page.tsx` y `tenants/page.tsx` — que ya tienen modales "Limpiar Datos" idénticos.

**Rationale**:
- Ambas páginas tienen su propio estado `resetOptions` y su propio modal con checkboxes.
- La página de Configuraciones usa el server action `purgeBusinessData`; la página de Tenants llama a `supabase.rpc` directamente.
- Ambas necesitan el nuevo checkbox para consistencia de UX.
- No hay un componente compartido para el modal de limpieza; cada página tiene su propia copia del JSX. Refactorizar eso a un componente compartido está fuera del scope de este feature.

**Alternatives considered**:
- **A. Crear un componente compartido `CleanDataModal`**: Buena idea para reducir duplicación, pero añade scope innecesario a este feature. Se puede hacer en un refactor futuro.

## Decision 4: Estrategia de migración SQL

**Decision**: Crear una nueva migración con `CREATE OR REPLACE FUNCTION` que reemplace la RPC existente, añadiendo solo el nuevo parámetro y moviendo la lógica de `central_cash_movements` a su propio bloque `IF`.

**Rationale**:
- `CREATE OR REPLACE` es idempotente y seguro para aplicar múltiples veces.
- Mantener la migración como un archivo separado permite trazabilidad y rollback si es necesario.
- Las llamadas existentes sin el nuevo parámetro usan `DEFAULT FALSE`, por lo que el comportamiento anterior se preserva (backward compatibility).

**Alternatives considered**:
- **A. Modificar la migración existente**: Rechazado porque las migraciones son inmutables una vez aplicadas; modificar un archivo ya ejecutado no tiene efecto.
