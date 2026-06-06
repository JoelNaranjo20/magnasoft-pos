# Quickstart: Interfaz Correcta Según Tipo de Negocio

**Feature**: [spec.md](./spec.md) | **Date**: 2026-06-06

---

## Archivos a modificar

| # | Archivo | Qué cambia | Tamaño |
|---|---|---|---|
| 1 | `supabase/migrations/20260526100000_remove_serial_and_hwid.sql` | Agregar `p_business_type` y `p_config` al RPC | +5 líneas |
| 2 | `apps/desktop/src/pages/setup/DesktopSetup.tsx` | Nuevas tarjetas (4), vista previa de módulos, llamada RPC actualizada | +60 líneas, -20 líneas |

---

## Orden de implementación

1. **RPC primero** — modificar la función para que sea atómica
2. **Frontend después** — actualizar tarjetas + vista previa + llamada al RPC

---

## Cómo probar

```bash
cd apps/desktop && pnpm electron:dev
```

### Prueba 1: Crear negocio Lavado de Carro
1. Iniciar app → login → pantalla setup
2. Ingresar nombre "Lavadero Express"
3. Seleccionar "Lavado de Carro"
4. **Verificar**: vista previa muestra Vehículos ✓, Cola de Servicio ✓, Comisiones ✓, Mesas ✗, Citas ✗
5. Click "Configurar Negocio"
6. **Verificar**: dashboard carga con sección de vehículos activa, cola de servicio visible
7. Ir al POS → selector de vehículo con placa visible, sin plano de mesas

### Prueba 2: Crear negocio Barber Shop
1. Repetir con nombre "Barbería El Corte"
2. Seleccionar "Barber Shop"
3. **Verificar**: vista previa muestra Comisiones ✓, Vehículos ✗, Mesas ✗, Citas ✗
4. **Verificar**: POS muestra asignación de barberos, sin vehículos

### Prueba 3: Crear negocio Salón de Belleza
1. Repetir con nombre "Salón Bella"
2. Seleccionar "Salón de Belleza"
3. **Verificar**: vista previa muestra Citas ✓, Comisiones ✓, Vehículos ✗, Mesas ✗
4. **Verificar**: navegación incluye agenda de citas

### Prueba 4: Crear negocio Restaurante
1. Repetir con nombre "Restaurante Sabor"
2. Seleccionar "Restaurante"
3. **Verificar**: vista previa muestra Mesas ✓, Vehículos ✗, Comisiones ✗, Citas ✗
4. **Verificar**: POS muestra plano de mesas (PATIO)

### Prueba 5: Atomicidad
1. Desconectar internet
2. Intentar crear negocio
3. **Verificar**: mensaje de error claro
4. Reconectar, verificar que el negocio NO existe (no quedó a medias)

### Prueba 6: Build
```bash
pnpm build
```
Debe compilar sin errores.
