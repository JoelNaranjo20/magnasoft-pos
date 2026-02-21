-- Migration: Add dashboard_config to business table
-- Purpose: Store dynamic dashboard layout configuration per business type

-- 1. Add column
ALTER TABLE business 
ADD COLUMN IF NOT EXISTS dashboard_config JSONB DEFAULT '[]'::jsonb;

-- 2. Update Automotive (Lavadero & Mecánica) - MASTER TEMPLATE
UPDATE business
SET dashboard_config = '[
  {
    "type": "kpi",
    "title": "Vehículos Lavados Hoy",
    "icon": "car",
    "value": 0,
    "query": "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE"
  },
  {
    "type": "kpi",
    "title": "Ingresos Servicios",
    "icon": "dollar-sign",
    "value": 0,
    "query": "SELECT COALESCE(SUM(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE"
  },
  {
    "type": "kpi",
    "title": "Ticket Promedio",
    "icon": "trending-up",
    "value": 0,
    "query": "SELECT COALESCE(AVG(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE"
  },
  {
    "type": "chart",
    "title": "Servicios por Día",
    "chartType": "bar",
    "query": "SELECT DATE(created_at) as date, COUNT(*) as count FROM sales WHERE business_id = $1 AND created_at >= CURRENT_DATE - INTERVAL ''7 days'' GROUP BY DATE(created_at) ORDER BY date"
  },
  {
    "type": "table",
    "title": "Vehículos en Pista",
    "columns": [
      {"key": "license_plate", "label": "Placa"},
      {"key": "service_name", "label": "Servicio"},
      {"key": "status", "label": "Estado"},
      {"key": "entry_time", "label": "Hora Entrada"}
    ],
    "query": "SELECT v.license_plate, s.service_name, s.status, s.created_at as entry_time FROM sales s LEFT JOIN vehicles v ON s.vehicle_id = v.id WHERE s.business_id = $1 AND s.status IN (''pending'', ''in_progress'') ORDER BY s.created_at DESC LIMIT 10"
  }
]'::jsonb
WHERE business_type = 'automotive';

-- 3. Update Barbershop
UPDATE business
SET dashboard_config = '[
  {
    "type": "kpi",
    "title": "Cortes Realizados",
    "icon": "scissors",
    "value": 0,
    "query": "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE"
  },
  {
    "type": "kpi",
    "title": "Barbero Top",
    "icon": "award",
    "value": "N/A",
    "query": "SELECT w.name FROM sales s JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE GROUP BY w.name ORDER BY COUNT(*) DESC LIMIT 1"
  },
  {
    "type": "kpi",
    "title": "Venta Productos",
    "icon": "shopping-bag",
    "value": 0,
    "query": "SELECT COALESCE(SUM(si.quantity * si.price), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE"
  },
  {
    "type": "table",
    "title": "Turnos en Espera",
    "columns": [
      {"key": "customer_name", "label": "Cliente"},
      {"key": "worker_name", "label": "Barbero"},
      {"key": "appointment_time", "label": "Hora Cita"},
      {"key": "status", "label": "Estado"}
    ],
    "query": "SELECT c.name as customer_name, w.name as worker_name, s.created_at as appointment_time, s.status FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND s.status IN (''pending'', ''in_progress'') ORDER BY s.created_at LIMIT 10"
  }
]'::jsonb
WHERE business_type = 'barbershop';

-- 4. Update Beauty Salon (Estilistas)
UPDATE business
SET dashboard_config = '[
  {
    "type": "kpi",
    "title": "Citas Atendidas",
    "icon": "calendar-check",
    "value": 0,
    "query": "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = ''completed''"
  },
  {
    "type": "kpi",
    "title": "Ticket Promedio",
    "icon": "trending-up",
    "value": 0,
    "query": "SELECT COALESCE(AVG(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE"
  },
  {
    "type": "kpi",
    "title": "Tratamientos Activos",
    "icon": "sparkles",
    "value": 0,
    "query": "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND status = ''in_progress''"
  },
  {
    "type": "table",
    "title": "Agenda del Día",
    "columns": [
      {"key": "customer_name", "label": "Cliente"},
      {"key": "stylist_name", "label": "Estilista"},
      {"key": "treatment", "label": "Tratamiento"},
      {"key": "appointment_time", "label": "Hora"}
    ],
    "query": "SELECT c.name as customer_name, w.name as stylist_name, s.notes as treatment, s.created_at as appointment_time FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE ORDER BY s.created_at LIMIT 15"
  }
]'::jsonb
WHERE business_type = 'beauty_salon';

-- 5. Update Restaurant
UPDATE business
SET dashboard_config = '[
  {
    "type": "kpi",
    "title": "Mesas Ocupadas",
    "icon": "utensils",
    "value": 0,
    "query": "SELECT COUNT(DISTINCT (metadata->>''table_number'')::int) FROM sales WHERE business_id = $1 AND status IN (''pending'', ''in_progress'') AND metadata ? ''table_number''"
  },
  {
    "type": "kpi",
    "title": "Ventas del Día",
    "icon": "dollar-sign",
    "value": 0,
    "query": "SELECT COALESCE(SUM(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE"
  },
  {
    "type": "kpi",
    "title": "Plato Más Vendido",
    "icon": "chef-hat",
    "value": "N/A",
    "query": "SELECT p.name FROM sale_items si JOIN products p ON si.product_id = p.id JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE GROUP BY p.name ORDER BY SUM(si.quantity) DESC LIMIT 1"
  },
  {
    "type": "table",
    "title": "Comandas en Cocina",
    "columns": [
      {"key": "table_number", "label": "Mesa"},
      {"key": "waiter_name", "label": "Mesero"},
      {"key": "wait_time", "label": "Tiempo Espera"},
      {"key": "status", "label": "Estado"}
    ],
    "query": "SELECT (s.metadata->>''table_number'') as table_number, w.name as waiter_name, EXTRACT(MINUTE FROM (NOW() - s.created_at)) || '' min'' as wait_time, s.status FROM sales s LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND s.status IN (''pending'', ''in_progress'') ORDER BY s.created_at LIMIT 10"
  }
]'::jsonb
WHERE business_type = 'restaurant';

-- 6. Update Hotel
UPDATE business
SET dashboard_config = '[
  {
    "type": "kpi",
    "title": "Ocupación (%)",
    "icon": "hotel",
    "value": 0,
    "query": "SELECT ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM products WHERE business_id = $1), 0)) * 100, 2) FROM sales WHERE business_id = $1 AND status = ''in_progress''"
  },
  {
    "type": "kpi",
    "title": "Check-ins Hoy",
    "icon": "log-in",
    "value": 0,
    "query": "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = ''in_progress''"
  },
  {
    "type": "kpi",
    "title": "Check-outs Hoy",
    "icon": "log-out",
    "value": 0,
    "query": "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(updated_at) = CURRENT_DATE AND status = ''completed''"
  },
  {
    "type": "table",
    "title": "Recepción / Huéspedes",
    "columns": [
      {"key": "room_number", "label": "Habitación"},
      {"key": "guest_name", "label": "Huésped"},
      {"key": "checkout_date", "label": "Salida Prevista"},
      {"key": "payment_status", "label": "Estado Pago"}
    ],
    "query": "SELECT p.name as room_number, c.name as guest_name, (s.metadata->>''checkout_date'') as checkout_date, CASE WHEN s.paid THEN ''Pagado'' ELSE ''Pendiente'' END as payment_status FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN products p ON s.product_id = p.id WHERE s.business_id = $1 AND s.status = ''in_progress'' ORDER BY s.created_at LIMIT 10"
  }
]'::jsonb
WHERE business_type = 'hotel';

-- 7. Add index for performance
CREATE INDEX IF NOT EXISTS idx_business_dashboard_config ON business USING gin(dashboard_config);

