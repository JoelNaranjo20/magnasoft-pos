# v1.0.38 Release Notes

## Correcciones
- **PIN de seguridad obligatorio**: Cuando la protecci贸n de PIN est谩 activada para "Modificar Precio", ahora siempre se pide el PIN, incluso para administradores.
- **Correcci贸n de l贸gica en TableOrderModal y POSCart**: Se elimin贸 el bypass de admin para garantizar consistencia en la protecci贸n por PIN.

## Cambios incluidos desde v1.0.36
- Diferenciaci贸n de Abonos (Efectivo vs Transferencia) en el Resumen del Turno
- Sesi贸n persistente (no pide login al reiniciar la app)
- PIN de seguridad para modificar precios en POS con toggle en configuraci贸n

## Mejoras Recientes
- **Desglose en Conciliaci髇**: Ahora puedes expandir cada fila en el resumen de caja para ver el detalle exacto de cada transacci髇 (Ventas, Abonos, Salidas, etc).
- **Uso Interno**: Los productos de uso interno ya no se registran como salida de efectivo en la caja, sino como valor de producto usado.
- **Reportes Financieros Reales**: Mejoramos la conciliaci髇 para que las promociones y descuentos se resten correctamente y reflejen el valor real de tu negocio en la liquidaci髇 y resumen de turnos.
