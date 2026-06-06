# Base de Datos — Esquema y Funciones

**Actualizado**: 2026-06-05

---

## Visión General

Base de datos PostgreSQL gestionada por Supabase. Aproximadamente 22 tablas, 23 funciones RPC, 11 triggers y 40+ foreign keys. Multi-tenant con Row Level Security basado en `business_id`.

---

## Tablas Principales

### Core del Negocio

| Tabla | Propósito | Columnas Clave |
|---|---|---|
| `business` | Datos del negocio/tenant | `id`, `name`, `type`, `pin`, `config` (JSONB), `dashboard_config` (JSONB), `is_active`, `hwid` |
| `profiles` | Perfiles de usuario | `id` (FK auth.users), `email`, `full_name`, `role`, `saas_role`, `business_id` |
| `workers` | Trabajadores del negocio | `id`, `name`, `role`, `active`, `base_salary`, `commission_enabled` |

### Sesiones y Caja

| Tabla | Propósito | Columnas Clave |
|---|---|---|
| `cash_sessions` | Sesiones de caja (apertura/cierre) | `id`, `business_id`, `worker_id`, `opening_balance`, `end_amount`, `manual_end_amount`, `difference`, `status`, `cash_counts` (JSONB), `opened_at`, `closed_at` |
| `cash_movements` | Movimientos de caja en sesión | `id`, `business_id`, `session_id`, `type` (income/expense), `amount`, `payment_method`, `description`, `user_id`, `worker_id` |
| `central_cash_movements` | Caja central (flujo de fondos) | `id`, `business_id`, `type`, `amount`, `description`, `user_id` |

### Ventas

| Tabla | Propósito | Columnas Clave |
|---|---|---|
| `sales` | Ventas/transacciones | `id`, `business_id`, `session_id`, `customer_id`, `vehicle_id`, `total_amount`, `total_discount`, `payment_method`, `cash_amount`, `transfer_amount`, `card_amount`, `credit_amount`, `metadata` (JSONB), `status`, `user_id`, `worker_id` |
| `sale_items` | Ítems de cada venta | `id`, `sale_id`, `product_id`, `service_id`, `name`, `quantity`, `unit_price`, `discount` |

### Clientes y Vehículos

| Tabla | Propósito | Columnas Clave |
|---|---|---|
| `customers` | Clientes | `id`, `business_id`, `name`, `phone`, `email`, `loyalty_points`, `total_visits`, `last_visit` |
| `vehicles` | Vehículos de clientes | `id`, `business_id`, `customer_id` (ON DELETE CASCADE), `license_plate`, `type`, `brand`, `model`, `year`, `color` |

### Deudas y Créditos

| Tabla | Propósito | Columnas Clave |
|---|---|---|
| `customer_debts` | Deudas de clientes | `id`, `business_id`, `customer_id` (ON DELETE CASCADE), `sale_id` (ON DELETE CASCADE), `amount`, `remaining_amount`, `status`, `due_date` |
| `debt_payments` | Pagos/abonos a deudas | `id`, `business_id`, `debt_id` (ON DELETE CASCADE), `cash_session_id`, `amount`, `payment_method` |
| `worker_loans` | Préstamos a trabajadores | `id`, `business_id`, `worker_id`, `amount`, `status`, `total_paid` |
| `worker_loan_payments` | Pagos de préstamos | `id`, `business_id`, `loan_id`, `amount`, `payment_method` |

### Comisiones

| Tabla | Propósito | Columnas Clave |
|---|---|---|
| `worker_commissions` | Comisiones y propinas | `id`, `business_id`, `sale_id`, `sale_item_id`, `worker_id`, `service_type` (incluye 'tip', 'tip_split'), `base_amount`, `commission_percentage`, `commission_amount`, `status` |

### Inventario y Servicios

| Tabla | Propósito |
|---|---|
| `products` | Productos (inventario) |
| `services` | Servicios ofrecidos |
| `categories` | Categorías (productos y servicios) |
| `inventory_movements` | Movimientos de inventario |

### Restaurante

| Tabla | Propósito |
|---|---|
| `restaurant_tables` | Mesas del restaurante |
| `service_queue` | Cola de servicios |
| `service_queue_items` | Ítems en cola |

---

## Foreign Keys con ON DELETE CASCADE

Estas tablas tienen `ON DELETE CASCADE` en su FK a `customers`:

- `vehicles` → `customers(id)` — Al borrar cliente, se borran sus vehículos
- `customer_debts` → `customers(id)` — Al borrar cliente, se borran sus deudas
- `debt_payments` → `customer_debts(id)` — Cascada indirecta: al borrar deuda, se borran sus pagos

**Importante para la unificación de clientes**: Antes de hacer `DELETE FROM customers`, el RPC `merge_customers` reasigna `vehicles.customer_id` y `customer_debts.customer_id` al cliente principal para prevenir pérdida por cascada.

---

## Row Level Security (RLS)

Todas las tablas de datos tienen RLS habilitado. El patrón general usa:

```sql
CREATE POLICY "Tenant Isolation" ON public.<table>
FOR ALL USING (business_id = get_my_business_id());
```

Donde `get_my_business_id()` obtiene el `business_id` del JWT del usuario autenticado, con fallback a `profiles.business_id`.

---

## Funciones RPC Clave

| Función | Propósito |
|---|---|
| `merge_customers(p_target_id, p_source_ids)` | **Unificar clientes**: Transfiere puntos, visitas, reasigna FK (sales, debts, vehicles), verifica huérfanas, y elimina sources |
| `deduct_product_stock(p_id, p_quantity)` | Descuento atómico de inventario |
| `process_debt_payment(p_debt_id, p_amount, p_payment_method, p_cash_session_id, p_notes)` | Procesa pago de deuda |
| `reset_business_data_modules(p_business_id, p_modules)` | Resetea datos del negocio por módulo |
| `create_and_link_business(p_email, p_business_name, p_business_type)` | Crea negocio y vincula usuario |
| `activate_business_with_code(p_code, p_hwid, p_business_name)` | Activa licencia con código |

---

## JSONB Metadata

Varias tablas usan columnas JSONB para datos flexibles:

| Tabla.Columna | Uso |
|---|---|
| `sales.metadata` | `business_type`, `tip_amount`, `tip_worker_id`, `tip_payment_method`, `tip_distribution`, `cross_change`, datos específicos de industria |
| `cash_sessions.cash_counts` | Desglose de billetes/monedas al cerrar caja |
| `business.config` | Flags de módulos habilitados (module_vehicles, module_tables, etc.) |
| `business.dashboard_config` | Configuración de widgets del dashboard |
