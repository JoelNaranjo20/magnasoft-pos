# Lista de Tareas

## Leyenda de Estados
- `[ ]` Pendiente
- `[/]` En progreso
- `[x]` Completada

---

## Fase 1: Infraestructura y Base de Datos (Supabase)
*   [ ] Crear y validar scripts SQL de migración en `supabase/migrations/`.
*   [ ] Aplicar columnas, tablas o funciones remotas (RPC) en Supabase.
*   [ ] Configurar y validar políticas de Row Level Security (RLS).
*   [ ] Sincronizar tipos en `apps/desktop/src/types/supabase.ts`.
*   [ ] Declarar contratos de tipos TypeScript en `@shared` o `apps/desktop/src/types/`.

## Fase 2: Lógica de Negocio y Stores
*   [ ] Modificar store de autenticación en `useAuthStore.ts` (si aplica).
*   [ ] Modificar store de configuración en `useBusinessStore.ts` (si aplica).
*   [ ] Modificar store de sesión en `useSessionStore.ts` (si aplica).
*   [ ] Modificar store de carrito en `useCartStore.ts` (si aplica).
*   [ ] Modificar store de mesas en `useTableStore.ts` (si aplica).
*   [ ] Envolver consultas a Supabase en bloques `try/catch` con logs detallados.

## Fase 3: Control de Módulos y Feature Flags (`useModule`)
*   [ ] Integrar flag de módulo usando `useModule(key)` o `useModules([keys])`.
*   [ ] Validar existencia de clave en `MODULE_REGISTRY` (`apps/shared/modules.ts`).
*   [ ] Configurar presets de industria en `INDUSTRY_PRESETS`.
*   [ ] Validar que NO se use `business_type` directamente para modular lógica o UI (Sección 2.8 de la Constitución).

## Fase 4: Interfaz de Usuario y UX (`apps/desktop`)
*   [ ] Implementar/modificar componentes en `apps/desktop/src/components/`.
*   [ ] Aplicar estilos premium usando Tailwind CSS y CSS nativo.
*   [ ] Añadir micro-animaciones (spinners, transiciones) y deshabilitar botones en procesos asíncronos.
*   [ ] Diseñar e implementar estados de carga, éxito y error con notificaciones visibles.

## Fase 5: Verificación y Compilación
*   [ ] Probar manualmente el flujo en desarrollo con `pnpm electron:dev`.
*   [ ] Verificar consola de DevTools de Electron libre de excepciones.
*   [ ] Ejecutar `pnpm build` o `pnpm --filter desktop build` para validar que la compilación de producción compile libre de errores TDZ o warnings de TypeScript.
*   [ ] Generar o actualizar el walkthrough y registrar los archivos en la tabla de cambios.
*   [ ] Incrementar versión en `package.json` del monorepo (si aplica).
