# Investigación: Unificar Clientes Duplicados

**Funcionalidad**: `003-unificar-clientes` | **Fecha**: 2026-06-03

## Decisión 1: Implementación de Unificación Atómica

**Decisión**: Usar una función RPC de PostgreSQL (`merge_customers`) ejecutada vía `supabase.rpc()`

**Justificación**:
- El código base ya usa exclusivamente atomicidad basada en RPC (`process_debt_payment`, `deduct_product_stock`, `create_business_without_serial`). No existen transacciones del lado del cliente.
- Una unificación modifica 3+ tablas (`sales`, `customer_debts`, `vehicles`) que deben actualizarse atómicamente. Las escrituras secuenciales del lado del cliente podrían dejar datos inconsistentes ante un fallo.
- La función RPC se ejecuta en una sola transacción de base de datos, garantizando semántica todo-o-nada (FR-006, CE-003).
- Sin backend propio — la constitución prohíbe Express/Fastify. RPC es el único código de servidor permitido.

**Alternativas consideradas**:
- Actualizaciones secuenciales del lado del cliente con rollback manual — rechazado: frágil, sin garantía de atomicidad, viola CE-003.
- Supabase Edge Functions — rechazado: introduce nueva infraestructura no presente en el proyecto.

## Decisión 2: Almacenamiento de Trazabilidad de Unificación

**Decisión**: Almacenar metadatos de unificación en `customers.metadata` (JSONB) — sin nuevas columnas ni tablas

**Justificación**:
- `customers.metadata` ya existe como `JSONB DEFAULT '{}'` con solo `loyalty_opt_out` como consumidor.
- Agregar `merged_into_id`, `merged_at`, `merged_by` al mismo objeto JSONB evita cualquier migración de esquema.
- El log de auditoría también puede residir en `customers.metadata` del cliente destino (ej. `merged_from: [{id, at, by}]`).
- Más simple que una tabla dedicada `customer_merges` — sin nuevas políticas RLS, sin nuevos tipos.

**Alternativas consideradas**:
- Nueva tabla de auditoría `customer_merges` — rechazado: requiere migración de esquema, nuevas políticas RLS, nuevos tipos TypeScript. Excesivo para v1.
- Nuevas columnas `merged_into_id`, `merged_at` en `customers` — rechazado: requiere migración. JSONB es suficientemente flexible.

**Esquema de metadata**:
```json
// En el cliente fuente (unificado):
{ "loyalty_opt_out": false, "merged_into_id": "<target-uuid>", "merged_at": "<iso8601>", "merged_by": "<admin-uuid>" }

// En el cliente destino (sobreviviente):
{ "loyalty_opt_out": false, "merged_from": [{ "id": "<source-uuid>", "at": "<iso8601>", "by": "<admin-uuid>" }] }
```

## Decisión 3: Integración de Prevención de Duplicados

**Decisión**: Extraer la lógica de verificación de duplicados en una utilidad compartida, actualizar los 3 formularios de creación

**Justificación**:
- Existen tres formularios de creación, cada uno con lógica de verificación de duplicados idéntica pero comportamientos distintos al encontrar coincidencia.
- Las verificaciones actuales son: coincidencia exacta de teléfono (si se proporciona), luego nombre `ilike` (si no hay teléfono). Sin normalización.
- FR-013/FR-014/FR-015 requieren verificaciones mejoradas: normalización de teléfono, similitud de nombre (no solo ILIKE exacto), más el diálogo "Usar existente / Crear de todos modos".
- Una función compartida `checkCustomerDuplicate(phone, name, businessId)` normaliza entradas y retorna coincidencias potenciales. Cada formulario maneja la respuesta UI (alerta + seleccionar existente vs alerta + continuar).
- SimpleCustomerModal y CustomerVehicleModal ya auto-seleccionan el existente al encontrar duplicado (buena UX). Solo CustomerCreateModal necesita cambio de comportamiento — hoy solo alerta y detiene.

**Alternativas consideradas**:
- Duplicar la lógica en 3 lugares — rechazado: viola DRY, más difícil de mantener, riesgo de divergencia.
- Restricción UNIQUE de base de datos en teléfono — rechazado: el teléfono es nullable, muchos clientes no tienen teléfono, y queremos una advertencia suave, no un bloqueo fuerte.

## Decisión 4: Algoritmo de Detección de Duplicados (Vista Unificar)

**Decisión**: Agrupación del lado del cliente en dos pasadas — grupos por teléfono (coincidencia exacta tras normalización) y grupos por nombre (similitud tras normalización)

**Justificación**:
- El CustomerManager del admin ya obtiene TODOS los clientes por negocio. Sin necesidad de consultas adicionales al servidor para la mayoría de negocios.
- Para negocios con <500 clientes (CE-004), el procesamiento del lado del cliente es instantáneo.
- Normalización de teléfono: eliminar caracteres no numéricos, comparar coincidencia exacta.
- Normalización de nombre: descomposición Unicode NFKD (eliminar acentos), minúsculas, trim, colapsar espacios múltiples, eliminar puntuación. Agrupar clientes con el mismo nombre normalizado.
- Ambos grupos se fusionan: si los clientes A, B, C comparten teléfono X, y A y D comparten nombre normalizado, la unión {A, B, C, D} se convierte en un solo grupo de sugerencia.

**Alternativas consideradas**:
- Agrupación del lado de la base de datos vía SQL — rechazado: requeriría una consulta compleja combinando normalización de teléfono y similitud de nombre. Extensión Postgres `unaccent` no confirmada como disponible. El lado del cliente es más simple y suficiente para la escala.
- Fuzzy matching Levenshtein — rechazado: la sección de Supuestos indica solo normalización básica para v1. Se puede mejorar después.

## Decisión 5: Filtrado de Clientes Unificados de Vistas Regulares

**Decisión**: Agregar filtro `.is('metadata->merged_into_id', null)` a todas las consultas de clientes que no necesiten explícitamente registros unificados

**Justificación**:
- FR-007: los clientes unificados permanecen en la BD pero no aparecen en búsquedas normales ni en el POS.
- Supabase soporta consultas de ruta JSONB vía `.is('metadata->merged_into_id', null)`.
- Se debe actualizar: obtención de CustomerManager, búsqueda de SimpleCustomerModal, búsqueda de CustomerVehicleModal, búsqueda rápida de POSCart.
- La vista de unificar es el único lugar que consulta TODOS los clientes (incluyendo unificados) — los necesita para mostrar trazabilidad de auditoría.

**Alternativas consideradas**:
- Soft-delete con columna `status` — rechazado: requiere migración, y usar metadata logra lo mismo sin cambios de esquema.
- Filtrar en código del cliente después de obtener — rechazado: desperdicia ancho de banda obteniendo registros que siempre serán filtrados.

## Decisión 6: Sin Nuevo Store Zustand

**Decisión**: Gestionar el estado de la UI de unificar con estado local React (`useState`/`useReducer`). Sin nuevo store compartido.

**Justificación**:
- Principio YAGNI de la constitución: "Toda abstracción nueva debe resolver un problema concreto que ya existe — no uno hipotético."
- La vista de unificar es una sola página solo para admin. Su estado (grupos de duplicados, selección) no se comparte entre rutas ni apps.
- La única preocupación compartida es `selectIsAdmin` (ya existe) y `businessId` (ya en `useBusinessStore`).
- Un store Zustand no agregaría valor más allá de lo que el estado local proporciona.

**Alternativas consideradas**:
- Nuevo `useCustomerMergeStore` — rechazado: sin consumidores fuera de la página de unificar. Violaría YAGNI.

## Decisión 7: Utilidad de Normalización de Teléfono

**Decisión**: Crear `apps/shared/lib/normalizePhone.ts` con una sola exportación `normalizePhone(phone: string): string`

**Justificación**:
- Usada por detección de duplicados, verificaciones de prevención y búsqueda. Extraer evita duplicación.
- Función pura, sin dependencias, trivialmente testeable.
- La ubicación en `apps/shared/` la hace disponible tanto para desktop como para web si se necesita (aunque web no tiene gestión de clientes todavía).

## Decisión 8: Utilidad de Normalización de Nombre

**Decisión**: Crear `apps/shared/lib/normalizeName.ts` con `normalizeName(name: string): string`

**Justificación**:
- Descomposición Unicode NFKD vía `String.prototype.normalize('NFKD')`.
- Eliminar marcas diacríticas de combinación, minúsculas, trim, colapsar espacios, eliminar puntuación `. , ; :`.
- Función pura, sin dependencias.
- Usada tanto por detección (grupos por nombre normalizado) como por prevención (verificación de similitud de nombre).

## Decisión 9: Diseño de la Función RPC

**Decisión**: Crear función PostgreSQL `merge_customers` con parámetros `(p_target_id uuid, p_source_ids uuid[], p_performed_by uuid)`

**Justificación**:
- Coincide con patrones RPC existentes (`process_debt_payment`, `deduct_product_stock`).
- Una sola llamada hace todas las reasignaciones + actualizaciones de metadata en una transacción.
- Retorna resultado estructurado: `{ success: boolean, message: string, transfers: { sales: int, debts: int, vehicles: int } }`.
- El parámetro `p_performed_by` registra el admin que ejecutó la unificación (almacenado en metadata, no impuesto por RLS ya que es una función SECURITY DEFINER).

## Decisión 10: Estrategia de Migración

**Decisión**: Un nuevo archivo de migración: `20260603_merge_customers_function.sql`

**Justificación**:
- Solo la función RPC necesita crearse en la base de datos. Sin cambios de esquema.
- Sigue la convención de nomenclatura de migraciones existente (`YYYYMMDD_descripcion.sql`).
- La función se crea con `CREATE OR REPLACE` para idempotencia.
- La migración también debe agregar una nueva política RLS o ajustar la existente para que la función RPC pueda actualizar clientes a través del negocio (SECURITY DEFINER con verificación de business_id).

**Contenido de la migración**:
```sql
CREATE OR REPLACE FUNCTION public.merge_customers(
    p_target_id uuid,
    p_source_ids uuid[],
    p_performed_by uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Validar mismo business
-- Validar que target no está en source_ids
-- Validar que target no está ya unificado
-- Actualizar sales.customer_id
-- Actualizar customer_debts.customer_id
-- Actualizar vehicles.customer_id
-- Actualizar metadata de clientes fuente (marcar como unificados)
-- Actualizar metadata de cliente destino (registrar historial de unificación)
-- Retornar contadores de transferencias
$$;
```
