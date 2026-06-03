# Especificación de Funcionalidad: CRUD CarteraHub — Eliminar deuda y filtro por cliente con total

**Rama**: `main` | **Versión**: `1.0.44` | **Fecha**: 2026-06-02

**Input**: "añade la actualización de crud en la cartera, falta borrar y añade el filtro de total por cliente, que salga el total de la deuda por cliente, una vez buscada en el filtro, así como la teníamos."

**Archivo**: [CarteraHub.tsx](../../apps/desktop/src/components/finance/CarteraHub.tsx)

---

## Historias de Usuario

### Historia 1 — Eliminar deuda (Prioridad: P1)

El administrador puede eliminar una deuda de cliente o préstamo de trabajador directamente desde el Hub de Cartera. Solo se permite eliminar deudas que **no tengan abonos registrados**.

**Escenarios de Aceptación**:

1. **Dado** que el admin ve una deuda sin abonos, **Cuando** presiona el ícono de eliminar 🗑️, **Entonces** aparece un modal de confirmación mostrando nombre del cliente y monto, y al confirmar la deuda se elimina de Supabase.
2. **Dado** que el admin ve una deuda con abonos registrados, **Cuando** presiona eliminar, **Entonces** el sistema verifica, detecta los abonos, y muestra un mensaje "No se puede eliminar: esta deuda ya tiene abonos registrados".
3. **Dado** que un cajero sin rol admin ve la lista de pendientes, **Cuando** revisa las acciones disponibles, **Entonces** solo ve el botón "Abonar" — los botones editar y eliminar no aparecen.

---

### Historia 2 — Filtro por cliente con total acumulado (Prioridad: P1)

El usuario puede filtrar las deudas por cliente específico y ver el **total acumulado** de todas las deudas de ese cliente. También puede buscar por nombre en texto libre y ver el total de los resultados visibles.

**Escenarios de Aceptación**:

1. **Dado** que hay varios créditos del mismo cliente, **Cuando** el usuario selecciona ese cliente en el dropdown "Filtrar cliente", **Entonces** la tabla se filtra mostrando solo sus créditos y aparece un banner con: nombre del cliente, **total acumulado de deuda**, y cantidad de créditos.
2. **Dado** que el usuario escribe "Juan" en el buscador, **Cuando** hay 3 créditos de "Juan Pérez" y 1 de "Juan Gómez", **Entonces** la tabla muestra los 4 resultados y un banner muestra: `Total deuda: $X — 4 crédito(s) — 2 cliente(s)`.
3. **Dado** que el usuario tiene ambos filtros activos (cliente + texto), **Cuando** presiona "Limpiar filtro", **Entonces** se resetean ambos y se vuelve a mostrar la lista completa sin banner.
4. **Dado** que el usuario abre el dropdown de clientes, **Cuando** se despliega la lista, **Entonces** los clientes aparecen ordenados de **mayor a menor deuda total**, cada uno con su nombre y monto acumulado.

---

### Casos Límite

- **Eliminar deuda de trabajador**: Misma validación — si tiene `worker_loan_payments`, no se permite.
- **Dropdown de filtro vacío**: Si no hay clientes con deudas pendientes, muestra "No hay clientes con deudas pendientes".
- **Filtro combinado**: Si hay filtro de cliente y texto simultáneamente, se cruzan con AND — solo resultados que cumplan ambos.
- **Persistencia visual**: El filtro de cliente se mantiene al cambiar entre pestañas Pendientes/Historial.

---

## Requerimientos Funcionales

- **RF-001**: El sistema DEBE permitir al admin eliminar una deuda (`customer_debts`) que no tenga pagos asociados (`debt_payments`).
- **RF-002**: El sistema DEBE permitir al admin eliminar un préstamo (`worker_loans`) que no tenga pagos asociados (`worker_loan_payments`).
- **RF-003**: El sistema DEBE mostrar un modal de confirmación antes de eliminar, indicando nombre del responsable y monto.
- **RF-004**: El sistema DEBE validar la existencia de abonos antes de eliminar y rechazar la operación si existen.
- **RF-005**: El sistema DEBE ofrecer un dropdown "Filtrar cliente" con todos los clientes que tienen deudas pendientes, ordenados por deuda total descendente.
- **RF-006**: El sistema DEBE mostrar el total acumulado de deuda (`remaining_amount`) de todas las filas visibles en un banner al tener cualquier filtro activo.
- **RF-007**: El sistema DEBE mostrar en el banner de resultados: monto total, cantidad de créditos y cantidad de clientes únicos.
- **RF-008**: El sistema DEBE ofrecer un botón "Limpiar filtro" para resetear búsqueda y filtro de cliente a su estado inicial.

---

## Criterios de Éxito

- **CE-001**: Un admin puede eliminar una deuda sin abonos en menos de 3 clics (ícono → confirmar → listo).
- **CE-002**: El total acumulado del filtro coincide exactamente con la suma de `remaining_amount` de las filas visibles.
- **CE-003**: El dropdown de clientes carga y ordena correctamente incluso con 200+ deudas pendientes.
- **CE-004**: La funcionalidad de abonar, editar y crear nuevos créditos sigue funcionando sin cambios.

---

## Supuestos

- La eliminación es física (DELETE en Supabase), no lógica. El admin es responsable de no eliminar deudas válidas.
- El dropdown de clientes se construye desde los datos ya cargados en `pendingItems` — no genera consultas adicionales a Supabase.
- El filtro aplica solo a la vista "Pendientes". La vista "Historial de Pagos" mantiene solo el buscador por nombre.
- Los botones de editar y eliminar solo son visibles para usuarios con rol admin (`selectIsAdmin`).
