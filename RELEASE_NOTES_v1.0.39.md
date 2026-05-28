# Notas de Lanzamiento v1.0.39

## Correcciones
- **PaymentModal.tsx**: Se solucionó el error de referencia `Cannot access 'Kr' before initialization` (Temporal Dead Zone) al ingresar un valor en el modal de cobro/caja. Esto se logró eliminando la declaración duplicada y redundante de `const numericTip` dentro de la función `handleConfirm`.
- **Actualización de Versión**: Incrementado el número de versión a `1.0.39` en todos los subproyectos de Magnasoft.
