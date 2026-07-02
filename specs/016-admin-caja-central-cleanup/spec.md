# Feature Specification: Limpieza de Caja Central y Mejora de Información de Ingresos

**Feature Branch**: `016-admin-caja-central-cleanup`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "en el módulo de administrador en la web, en la opción de limpiar datos, quiero que pongas también para borrar toda la caja central. En información de ingresos e ingresos de la caja central, quiero que salgan con los nombres o motivo."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Borrar Caja Central desde Limpiar Datos (Priority: P1)

Como administrador del sistema (super admin), quiero poder seleccionar explícitamente "Caja Central" como una opción independiente en el panel de "Limpiar Datos" del módulo de administración web, para poder borrar todos los movimientos de caja central de un negocio sin afectar las sesiones de caja ni otros módulos.

**Why this priority**: Es el requerimiento principal del usuario. Actualmente `central_cash_movements` se borra junto con sesiones de caja bajo un solo checkbox, pero el administrador quiere control granular sobre Caja Central.

**Independent Test**: Ir a `/saas/dashboard/configurations` o `/saas/tenants`, abrir "Limpiar Datos" para un negocio, verificar que existe un checkbox independiente para "Caja Central", marcarlo, confirmar, y verificar que solo los movimientos de caja central fueron eliminados.

**Acceptance Scenarios**:

1. **Given** que soy super admin en la página de Configuraciones, **When** abro el modal "Limpiar Datos" para un negocio, **Then** veo un checkbox "Caja Central (movimientos)" separado de "Sesiones de caja y movimientos".
2. **Given** que marco solo el checkbox "Caja Central" y dejo los demás sin marcar, **When** confirmo la limpieza, **Then** solo se borran los registros de `central_cash_movements` del negocio seleccionado; las sesiones de caja, ventas, clientes, etc. permanecen intactos.
3. **Given** que el negocio tiene movimientos de caja central registrados, **When** ejecuto la limpieza de Caja Central, **Then** el dashboard de Caja Central del negocio muestra Balance Total = $0 y todos los cards en cero.
4. **Given** que marco "Seleccionar Todo" en el modal, **When** confirmo, **Then** TODOS los módulos incluyendo Caja Central se borran.

---

### User Story 2 - Ver nombre/usuario en ingresos de Caja Central (Priority: P2)

Como usuario del sistema, quiero ver quién registró cada ingreso en Caja Central o cuál fue el motivo del movimiento, para tener trazabilidad completa de las operaciones financieras.

**Why this priority**: Mejora la transparencia y auditoría de los movimientos. Actualmente el campo `description` existe y se muestra, pero el usuario quiere asegurarse de que siempre se vea un identificador claro (nombre de usuario o motivo).

**Independent Test**: Ir a Caja Central → Balance Total → ver el listado de movimientos. Verificar que cada ingreso muestra el motivo/descripción y, cuando esté disponible, el nombre del usuario que lo registró.

**Acceptance Scenarios**:

1. **Given** que un movimiento de caja central tiene `description` registrada, **When** veo el listado de movimientos en "Balance Total" o en los cards de Ingresos, **Then** la descripción/motivo se muestra como texto principal del movimiento.
2. **Given** que un movimiento fue creado manualmente por un usuario, **When** veo el detalle del movimiento, **Then** se muestra el nombre del usuario que lo creó (ej. "Joel Naranjo" o "Admin") junto al motivo.
3. **Given** que un movimiento fue generado automáticamente por el sistema (cierre de sesión), **When** veo el movimiento, **Then** se muestra la descripción automática (ej. "Cierre de Sesión #abc123 — 25 Jun 2026 18:30").

---

### Edge Cases

- ¿Qué pasa si un negocio no tiene movimientos en Caja Central? El sistema debe mostrar "Sin movimientos" o ejecutar la limpieza sin errores (operación idempotente).
- ¿Qué pasa si el `user_id` del movimiento es NULL (movimientos creados antes de registrar usuario)? Mostrar "Sistema" o "Automático" como fallback.
- ¿Qué pasa si se selecciona solo Caja Central pero el negocio también tiene acreedores (creditor_payments que referencian central_cash_movements)? Los pagos a acreedores que crearon movimientos en caja central quedarán huérfanos si se borra caja central sin borrar acreedores. La limpieza de Caja Central debe hacerse con advertencia si hay module de acreedores activo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El modal "Limpiar Datos" en el panel de administración web (Configuraciones y Tenants) DEBE incluir un checkbox independiente etiquetado "Caja Central (movimientos)" que controle el borrado de la tabla `central_cash_movements`.
- **FR-002**: El checkbox "Sesiones de caja y movimientos" existente DEBE seguir limpiando `cash_sessions` y `cash_movements`, pero DEBE excluir `central_cash_movements` (que ahora se controla con su propio checkbox).
- **FR-003**: El botón "Seleccionar Todo" DEBE incluir el nuevo checkbox de Caja Central.
- **FR-004**: El sistema DEBE advertir al usuario antes de ejecutar la limpieza de Caja Central si hay datos en `creditor_payments` que referencian movimientos de caja central, indicando que los pagos a acreedores pueden quedar inconsistentes.
- **FR-005**: La función RPC `reset_business_data_modules` DEBE aceptar un nuevo parámetro booleano `p_delete_central_cash` para controlar la limpieza de Caja Central de forma independiente.
- **FR-006**: En todas las vistas de movimientos de Caja Central (Balance Total, cards de Ingresos/Egresos, modales de detalle), cada movimiento DEBE mostrar su `description` como etiqueta principal.
- **FR-007**: En las vistas de movimientos de Caja Central, cuando el movimiento tenga `user_id`, el sistema DEBE mostrar el nombre del usuario junto a la descripción (ej. "Admin — Pago de nómina").
- **FR-008**: Cuando `user_id` sea NULL, el sistema DEBE mostrar "Sistema" o "Automático" como fallback en lugar del nombre de usuario.
- **FR-009**: El server action `purgeBusinessData` en `apps/web` DEBE aceptar y propagar el nuevo parámetro `delete_central_cash` hacia la RPC.

### Key Entities

- **central_cash_movements**: Movimientos de ingresos y egresos de la caja central. Atributos relevantes: `id`, `business_id`, `type` (income/expense), `amount`, `description` (motivo), `user_id` (quién lo creó), `session_id`, `created_at`.
- **User (auth.users)**: Usuario del sistema. Vinculado a `central_cash_movements.user_id`. Se usa para mostrar el nombre en el listado de movimientos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El administrador puede borrar exclusivamente los datos de Caja Central sin afectar otros módulos en menos de 3 clics desde que abre el modal de Limpiar Datos.
- **SC-002**: Cada movimiento en el listado de Balance Total muestra una etiqueta descriptiva (motivo + usuario) en una sola línea legible.
- **SC-003**: El 100% de los movimientos con `user_id` poblado muestran el nombre del usuario que los creó.

## Assumptions

- El módulo de administración web con "Limpiar Datos" ya existe en las rutas `/saas/dashboard/configurations` y `/saas/tenants`.
- La tabla `central_cash_movements` ya existe con los campos `description` y `user_id`.
- El usuario tiene acceso como super admin para usar las funciones de limpieza.
- La migración de la RPC se aplicará directamente a Supabase.
- La funcionalidad aplica tanto al portal web (Next.js) como a los server actions existentes.
- Los acreedores (`creditor_payments`) que referencian `central_cash_movements` son un edge case conocido; se advertirá al usuario pero no se bloqueará la operación (periodo de prueba).
