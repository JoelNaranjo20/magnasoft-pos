# v1.0.38 Release Notes

## Correcciones
- **PIN de seguridad obligatorio**: Cuando la protección de PIN está activada para "Modificar Precio", ahora siempre se pide el PIN, incluso para administradores.
- **Corrección de lógica en TableOrderModal y POSCart**: Se eliminó el bypass de admin para garantizar consistencia en la protección por PIN.

## Cambios incluidos desde v1.0.36
- Diferenciación de Abonos (Efectivo vs Transferencia) en el Resumen del Turno
- Sesión persistente (no pide login al reiniciar la app)
- PIN de seguridad para modificar precios en POS con toggle en configuración
