# Plan de Implementación

---

## 1. Revisión de Arquitectura

*   **Subproyectos Monorepo Afectados**:
    *   `apps/desktop`
    *   `apps/shared`
    *   `apps/web`
*   **Componentes Visuales Afectados**:
*   **Stores de Zustand `@shared/store/` Afectados**:
    *   `useAuthStore.ts`
    *   `useBusinessStore.ts`
    *   `useSessionStore.ts`
*   **Servicios e Infraestructura (Supabase)**:
*   **Dependencias de Terceros**:

### 1.1 Análisis de Impacto y No Regresión (OBLIGATORIO)

> [!WARNING]
> Cualquier cambio en el sistema de cobro, el cálculo de totales o la gestión de sesiones debe ser analizado meticulosamente para no paralizar la operación comercial del POS.

*   **Referencias y Dependencias Cruzadas**:
*   **Protección de Módulos Críticos**:
    *   **Persistencia de Sesiones y Almacenamiento Híbrido**: Garantizar que la sesión local en disco (`app-storage.json` a través de IPC) no quede corrupta ni se pierda al reiniciar la app.
    *   **Dinamismo y No Hardcoding**: De acuerdo con la sección 2.8 de la Constitución, está prohibido condicionar lógica o UI directamente con `business_type`. Toda variación funcional debe diseñarse en base a módulos independientes controlados por `useModule(key)`.
*   **Retrocompatibilidad**:

---

## 2. Cambios Propuestos

---

### `apps/desktop` / `apps/shared`

#### [NEW] (file:///c:/Users/Windows%2011%20PRO%20X%2064/Documents/Magnasoft/...)
*   **Responsabilidad**:
*   **API Expuesta**:

#### [MODIFY] (file:///c:/Users/Windows%2011%20PRO%20X%2064/Documents/Magnasoft/...)
*   **Cambios**:
*   **Prevención de Errores TDZ**: Asegurar que no exista shadowing de variables ni declaraciones redundantes en scopes anidados.

#### [DELETE] (file:///c:/Users/Windows%2011%20PRO%20X%2064/Documents/Magnasoft/...)
*   **Razón**:

---

## 3. Plan de Verificación y Pruebas

### Pruebas Locales (Desarrollo)
*   [ ] Levantar en modo desarrollo con `pnpm electron:dev`.
*   [ ] Probar manualmente el flujo de usuario de punta a punta.
*   [ ] Verificar consola de DevTools de Electron libre de excepciones.
*   [ ] Validar registros correctos en Supabase.

### Pruebas de Producción (Build)

> [!IMPORTANT]
> Los errores de Temporal Dead Zone (TDZ) debido a shadowing o dependencias circulares deben descartarse mediante la compilación y minificación de producción.

*   [ ] Ejecutar `pnpm build` o `pnpm --filter desktop build` y confirmar compilación exitosa.
