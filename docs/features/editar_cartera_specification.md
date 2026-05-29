# Especificación: Edición de Deudas y Créditos en Cartera (CRUD - Editar)

*   **Autor/IA**: Antigravity AI
*   **Fecha**: 2026-05-29
*   **Estado**: Borrador
*   **Módulo Asociado**: `pos`

---

## 1. Objetivos y Alcance

### Objetivos Clave
*   Permitir corrección de notas, descripciones y montos iniciales de deudas manuales, incluso si ya registran abonos previos.
*   Asegurar el recálculo correcto del saldo restante tras la modificación del monto inicial.
*   Restringir la acción únicamente a roles administrativos (`admin` y `super_admin`).

### Fuera de Alcance
*   Edición de deudas originadas por ventas reales (`sale_id` no nulo).
*   Eliminación física del registro en la base de datos.

---

## 2. Requerimientos del Usuario

| ID | Requerimiento | Descripción / Comportamiento Esperado | Prioridad |
|---|---|---|---|
| REQ-01 | Botón de Edición | Agregar botón en la columna "Acción" de la tabla de pendientes. | Alta |
| REQ-02 | Validación de Rol | El botón "Editar" solo está disponible para usuarios con rol `admin` o `super_admin`. | Alta |
| REQ-03 | Validación de Nuevo Monto | Permitir editar el monto siempre que el nuevo valor sea igual o mayor al total ya pagado (`amount` - `remaining_amount`). | Alta |
| REQ-04 | Modal de Edición | Formulario con los datos cargados del registro al hacer clic en "Editar". | Alta |
| REQ-05 | Confirmación y Registro | Actualización reactiva en Supabase y la UI en tiempo real. | Alta |

---

## 3. Comportamiento de la UI e Interacciones

*   **Pantallas y Modales Afectados**:
    *   `apps/desktop/src/components/finance/CarteraHub.tsx`
    *   `apps/desktop/src/components/modals/EditDebtModal.tsx`
*   **Flujo del POS / Usuario**:
    1. El administrador accede a pestaña Finanzas -> Pendientes y hace clic en Editar.
    2. Se abre el modal `EditDebtModal` con campos cargados.
    3. El administrador modifica los datos y guarda cambios.
    4. El sistema valida en frontend: `nuevo_monto >= (monto_original - saldo_restante)`. Si no cumple, muestra alerta ("El nuevo monto no puede ser menor a los abonos realizados").
    5. Se envía la actualización a Supabase y se cierra el modal.
*   **Estilo y UX (Sujeto a la Constitución)**:
    - Uso de Tailwind CSS.
    - Botón de edición discreto en columna de acción.
    - Modal con fondo desenfocado (`backdrop-blur-sm`).

---

## 4. Requerimientos Técnicos y de Datos

### 4.1 Base de Datos (Supabase)
*   **Operaciones SQL**:
    - `customer_debts`: UPDATE `amount`, `remaining_amount`, `notes`
    - `worker_loans`: UPDATE `amount`, `notes`
*   **Políticas RLS**:
    - Validar que la actualización provenga de un rol `admin` o `super_admin`.

### 4.2 Control de Estado (Zustand & Hooks Compartidos)
1.  **useAuthStore.ts** (`@shared/store/useAuthStore`):
    *   Uso de `selectIsAdmin`.
2.  **useSessionStore.ts** (`@shared/store/useSessionStore`):
    *   Uso de `cashSession`.

### 4.3 Control de Impacto y No Regresión (CRÍTICO)

> [!CAUTION]
> **Regla de Dinamismo (Constitución 2.8)**: Está estrictamente prohibido usar condicionales basadas en `business_type === 'restaurant'`. Toda variación funcional debe realizarse mediante el módulo reactivo respectivo (ej. `useModule('vehicles')`).

*   **Evitar Shadowing (TDZ)**:
    - No declarar variables locales que hagan shadowing de variables de módulo en `EditDebtModal.tsx`.
*   **Integridad de Datos (Fórmula de Recálculo)**:
    - Al actualizar el monto inicial de la deuda (`amount`), el nuevo saldo restante (`remaining_amount`) debe calcularse como:
      `total_pagado = amount - remaining_amount`
      `nuevo_remaining_amount = nuevo_amount - total_pagado`

---

## 5. Plan de Verificación Sugerido

### Pruebas Manuales
1. Validar que un rol `cashier` no visualice ni acceda al botón de edición.
2. Crear un crédito manual como `admin` por $100.
3. Realizar un abono parcial de $30 (saldo restante $70).
4. Editar el crédito manual cambiando el monto a $150. Verificar que el saldo restante se actualice a $120 (`150 - 30`).
5. Intentar editar el crédito cambiando el monto a $20. Verificar que el sistema bloquee la edición con una validación ("El nuevo monto no puede ser menor a los abonos realizados: $30").
