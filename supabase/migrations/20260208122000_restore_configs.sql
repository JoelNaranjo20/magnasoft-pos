-- Migration: 20260208122000_restore_configs.sql
-- Description: Forces update of dashboard_config for Automotive (restoring missing widgets) and Barbershop (LEFT JOIN fix).

-- 1. Restore Automotive Config
UPDATE business 
SET dashboard_config = '[
    {
        "id": "kpi_auto_washed_today",
        "type": "kpi",
        "label": "Vehículos Lavados Hoy",
        "icon": "car",
        "query": "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE",
        "layout": { "x": 0, "y": 0, "w": 3, "h": 2 }
    },
    {
        "id": "kpi_auto_oil_changes",
        "type": "kpi",
        "label": "Cambios de Aceite",
        "icon": "droplet",
        "query": "SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE AND si.name ILIKE ''%aceite%''",
        "layout": { "x": 3, "y": 0, "w": 3, "h": 2 }
    },
    {
        "id": "kpi_auto_alignment",
        "type": "kpi",
        "label": "Alineaciones",
        "icon": "settings",
        "query": "SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE AND si.name ILIKE ''%alineacion%''",
        "layout": { "x": 6, "y": 0, "w": 3, "h": 2 }
    },
    {
        "id": "kpi_auto_balancing",
        "type": "kpi",
        "label": "Balanceos",
        "icon": "refresh-ccw",
        "query": "SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE AND si.name ILIKE ''%balanceo%''",
        "layout": { "x": 9, "y": 0, "w": 3, "h": 2 }
    },
    {
        "id": "kpi_auto_revenue_today",
        "type": "kpi",
        "label": "Ingresos",
        "icon": "dollar-sign",
        "query": "SELECT COALESCE(SUM(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE",
        "layout": { "x": 0, "y": 2, "w": 3, "h": 2 }
    },
    {
        "id": "kpi_auto_avg_ticket",
        "type": "kpi",
        "label": "Ticket Promedio",
        "icon": "trending-up",
        "query": "SELECT COALESCE(AVG(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE",
        "layout": { "x": 3, "y": 2, "w": 3, "h": 2 }
    },
    {
        "id": "chart_auto_services_week",
        "type": "chart",
        "label": "Servicios por Día (7 días)",
        "icon": "bar-chart-2",
        "query": "SELECT DATE(created_at) as date, COUNT(*) as count FROM sales WHERE business_id = $1 AND created_at >= CURRENT_DATE - INTERVAL ''7 days'' GROUP BY DATE(created_at) ORDER BY date",
        "layout": { "x": 0, "y": 4, "w": 7, "h": 6 }
    },
    {
        "id": "tbl_auto_in_queue",
        "type": "table",
        "label": "Vehículos en cola",
        "icon": "list",
        "query": "SELECT v.license_plate, s.service_name, s.status, s.created_at as entry_time FROM sales s LEFT JOIN vehicles v ON s.vehicle_id = v.id WHERE s.business_id = $1 AND s.status IN (''pending'', ''in_progress'') ORDER BY s.created_at DESC LIMIT 10",
        "layout": { "x": 7, "y": 4, "w": 5, "h": 6 }
    }
]'::jsonb
WHERE business_type = 'automotive';

-- 2. Restore Barbershop Config (Fixing JOIN to LEFT JOIN)
UPDATE business
SET dashboard_config = '[
    {
        "id": "kpi_barber_cuts_today",
        "type": "kpi",
        "label": "Cortes Realizados",
        "icon": "scissors",
        "query": "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE",
        "layout": { "x": 0, "y": 0, "w": 4, "h": 2 }
    },
    {
        "id": "kpi_barber_top_barber",
        "type": "kpi",
        "label": "Barbero Top",
        "icon": "award",
        "query": "SELECT COALESCE(w.name, ''Sin Asignar'') FROM sales s LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE GROUP BY w.name ORDER BY COUNT(*) DESC LIMIT 1",
        "layout": { "x": 4, "y": 0, "w": 4, "h": 2 }
    },
    {
        "id": "kpi_barber_product_sales",
        "type": "kpi",
        "label": "Venta Productos",
        "icon": "shopping-bag",
        "query": "SELECT COALESCE(SUM(si.quantity * si.price), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE",
        "layout": { "x": 8, "y": 0, "w": 4, "h": 2 }
    },
    {
        "id": "tbl_barber_queue",
        "type": "table",
        "label": "Turnos en Espera",
        "icon": "users",
        "query": "SELECT c.name as customer_name, w.name as worker_name, s.created_at as appointment_time, s.status FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND s.status IN (''pending'', ''in_progress'') ORDER BY s.created_at LIMIT 10",
        "layout": { "x": 0, "y": 4, "w": 12, "h": 6 }
    }
]'::jsonb
WHERE business_type = 'barbershop';
