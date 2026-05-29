# Especificación

*   **Autor/IA**: 
*   **Fecha**: 
*   **Estado**: 
*   **Módulo Asociado**: 

---

## 1. Objetivos y Alcance

### Objetivos Clave
*   
*   

### Fuera de Alcance (Out of Scope)
*   
*   

---

## 2. Requerimientos del Usuario

| ID | Requerimiento | Descripción / Comportamiento Esperado | Prioridad |
|---|---|---|---|
| REQ-01 | | | |
| REQ-02 | | | |

---

## 3. Comportamiento de la UI e Interacciones

*   **Pantallas y Modales Afectados (Rutas Exactas)**:
    *   
*   **Flujo del POS / Usuario**:
    1. 
*   **Estándar de Diseño y UX (Constitución del Proyecto)**:
    *   *Estilos*:
    *   *Micro-animaciones*:

---

## 4. Requerimientos Técnicos y de Datos

### 4.1 Base de Datos (Supabase)
*   **Tablas y Columnas Afectadas**:
    *   
*   **RLS (Row Level Security)**:
    *   

### 4.2 Control de Estado (Zustand & Hooks Compartidos)
1.  **useAuthStore.ts** (`@shared/store/useAuthStore`)
2.  **useBusinessStore.ts** (`@shared/store/useBusinessStore`)
    *   *Uso de Módulos*: Utilizar `useModule(key)` o `useModules([keys])` desde `apps/desktop/src/hooks/useModule.ts`.
3.  **useSessionStore.ts** (`@shared/store/useSessionStore`)

### 4.3 Control de Impacto y No Regresión (CRÍTICO)
*   **No Regresión de Cobros**: Cualquier cambio no debe impedir que se complete un pago normal en efectivo o tarjeta si el servicio falla.
*   **Evitar Colisiones de Nombres (TDZ)**: No declarar variables locales que hagan shadowing de variables de módulo de nivel superior.
*   **Dinamismo y Prohibición de Hardcoding**: De acuerdo con la sección 2.8 de la Constitución, está prohibido condicionar lógica o UI directamente con `business_type`. Toda variación funcional debe diseñarse en base a módulos independientes controlados por `useModule(key)`.
