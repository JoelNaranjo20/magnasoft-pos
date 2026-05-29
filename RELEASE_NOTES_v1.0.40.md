# Notas de Lanzamiento v1.0.40

**Fecha:** 2026-05-29

## Nuevas Funcionalidades y Mejoras

### 🔐 Seguridad de Módulos — Re-autenticación de PIN por Ruta

- **`ConfigGuard.tsx`**: Se añadió un `useEffect` que escucha cambios en `location.pathname`. Cada vez que el usuario navega a una ruta distinta, el estado interno `isAuthenticated` se resetea a `false`, forzando al usuario a ingresar el PIN nuevamente en módulos protegidos (Auditoría, Configuración, etc.).
- La sesión de inicio de sesión del usuario **no** se ve afectada; solo se resetea la autenticación de módulos individuales.
- Esto elimina el riesgo de que un usuario con acceso temporal a un módulo protegido pueda seguir navegando a otros módulos protegidos sin re-autenticarse.

### 🛡️ Validación Atómica de Ventas — Bloqueo Preventivo en POS

- **`PaymentModal.tsx`**: Se implementaron validaciones reactivas en tiempo real antes de permitir confirmar el cobro:
  - **Falta de trabajador**: Si hay ítems con comisión en el carrito y no se ha asignado un trabajador, el botón **CONFIRMAR PAGO** se deshabilita automáticamente y se muestra un mensaje de alerta preventiva en el modal.
  - **Falta de vehículo**: Si el tipo de negocio requiere vehículo y no se ha seleccionado uno, el botón de confirmación también se bloquea.
  - La validación opera sobre el estado `canConfirm`, derivado de las flags `isMissingVehicle` e `isMissingWorker`.
- **`POSCart.tsx`**: Se añadió feedback visual predictivo (`animate-pulse` con borde rosa) al selector de trabajador cuando hay ítems con comisión sin asignar, guiando al usuario antes de que abra el modal de cobro.

## Correcciones

- Se elimina el comportamiento anterior donde se mostraba un error **post-procesamiento** pero la venta ya había sido insertada parcialmente en Supabase, generando registros huérfanos o duplicados. Ahora la validación es **preventiva** y la venta no se inicia si no cumple los requisitos mínimos.

## Archivos Modificados

| Archivo | Cambio |
|---|---|
| `apps/desktop/src/components/auth/ConfigGuard.tsx` | Reset de PIN al cambiar de ruta |
| `apps/desktop/src/components/modals/PaymentModal.tsx` | Bloqueo preventivo y validaciones reactivas |
| `apps/desktop/src/components/pos/POSCart.tsx` | Indicador visual de trabajador faltante |
| `package.json` (x4) | Versión incrementada a `1.0.40` |
| `docs/features/seguridad_y_validacion_ventas_specification.md` | Especificación técnica de los cambios |

## Actualización de Versión

- Incrementado el número de versión a `1.0.40` en todos los subproyectos del monorepo (`root`, `desktop`, `shared`, `web`).
