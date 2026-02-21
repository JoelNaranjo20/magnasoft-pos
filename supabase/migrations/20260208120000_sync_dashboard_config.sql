-- Migration: 20260208120000_sync_dashboard_config.sql
-- Description: Auto-updates dashboard_config with FULL widget definitions (Query + UI) when business_type changes.

CREATE OR REPLACE FUNCTION public.sync_dashboard_config()
RETURNS TRIGGER AS $$
DECLARE
    v_config_automotive JSONB;
    v_config_barbershop JSONB;
    v_config_beauty     JSONB;
    v_config_restaurant JSONB;
    v_config_hotel      JSONB;
    v_default_layout    JSONB;
BEGIN
    -- 1. Automotive Template
    v_config_automotive := '[
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
    ]';

    -- 2. Barbershop Template
    v_config_barbershop := '[
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
    ]';

    -- 3. Beauty Salon Template
    v_config_beauty := '[
        {
            "id": "kpi_beauty_appointments",
            "type": "kpi",
            "label": "Citas Atendidas",
            "icon": "calendar-check",
            "query": "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = ''completed''",
            "layout": { "x": 0, "y": 0, "w": 4, "h": 2 }
        },
        {
            "id": "kpi_beauty_avg_ticket",
            "type": "kpi",
            "label": "Ticket Promedio",
            "icon": "trending-up",
            "query": "SELECT COALESCE(AVG(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE",
            "layout": { "x": 4, "y": 0, "w": 4, "h": 2 }
        },
        {
            "id": "kpi_beauty_active_treatments",
            "type": "kpi",
            "label": "Tratamientos Activos",
            "icon": "sparkles",
            "query": "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND status = ''in_progress''",
            "layout": { "x": 8, "y": 0, "w": 4, "h": 2 }
        },
        {
            "id": "tbl_beauty_agenda",
            "type": "table",
            "label": "Agenda del Día",
            "icon": "calendar",
            "query": "SELECT c.name as customer_name, w.name as stylist_name, s.notes as treatment, s.created_at as appointment_time FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE ORDER BY s.created_at LIMIT 15",
            "layout": { "x": 0, "y": 2, "w": 12, "h": 6 }
        }
    ]';

    -- 4. Restaurant Template
    v_config_restaurant := '[
        {
            "id": "kpi_rest_tables_occupied",
            "type": "kpi",
            "label": "Mesas Ocupadas",
            "icon": "utensils",
            "query": "SELECT COUNT(DISTINCT (metadata->>''table_number'')::int) FROM sales WHERE business_id = $1 AND status IN (''pending'', ''in_progress'') AND metadata ? ''table_number''",
            "layout": { "x": 0, "y": 0, "w": 4, "h": 2 }
        },
        {
            "id": "kpi_rest_sales_today",
            "type": "kpi",
            "label": "Ventas del Día",
            "icon": "dollar-sign",
            "query": "SELECT COALESCE(SUM(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE",
            "layout": { "x": 4, "y": 0, "w": 4, "h": 2 }
        },
        {
            "id": "kpi_rest_top_dish",
            "type": "kpi",
            "label": "Plato Más Vendido",
            "icon": "chef-hat",
            "query": "SELECT p.name FROM sale_items si JOIN products p ON si.product_id = p.id JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE GROUP BY p.name ORDER BY SUM(si.quantity) DESC LIMIT 1",
            "layout": { "x": 8, "y": 0, "w": 4, "h": 2 }
        },
        {
            "id": "tbl_rest_orders",
            "type": "table",
            "label": "Comandas en Cocina",
            "icon": "clipboard-list",
            "query": "SELECT (s.metadata->>''table_number'') as table_number, w.name as waiter_name, EXTRACT(MINUTE FROM (NOW() - s.created_at)) || '' min'' as wait_time, s.status FROM sales s LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND s.status IN (''pending'', ''in_progress'') ORDER BY s.created_at LIMIT 10",
            "layout": { "x": 0, "y": 2, "w": 12, "h": 6 }
        }
    ]';

    -- 5. Hotel Template
    v_config_hotel := '[
        {
            "id": "kpi_hotel_occupancy",
            "type": "kpi",
            "label": "Ocupación (%)",
            "icon": "home",
            "query": "SELECT ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM products WHERE business_id = $1), 0)) * 100, 2) FROM sales WHERE business_id = $1 AND status = ''in_progress''",
            "layout": { "x": 0, "y": 0, "w": 4, "h": 2 }
        },
        {
            "id": "kpi_hotel_checkins",
            "type": "kpi",
            "label": "Check-ins Hoy",
            "icon": "log-in",
            "query": "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = ''in_progress''",
            "layout": { "x": 4, "y": 0, "w": 4, "h": 2 }
        },
        {
            "id": "kpi_hotel_checkouts",
            "type": "kpi",
            "label": "Check-outs Hoy",
            "icon": "log-out",
            "query": "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(updated_at) = CURRENT_DATE AND status = ''completed''",
            "layout": { "x": 8, "y": 0, "w": 4, "h": 2 }
        },
        {
            "id": "tbl_hotel_guests",
            "type": "table",
            "label": "Recepción / Huéspedes",
            "icon": "users",
            "query": "SELECT p.name as room_number, c.name as guest_name, (s.metadata->>''checkout_date'') as checkout_date, CASE WHEN s.paid THEN ''Pagado'' ELSE ''Pendiente'' END as payment_status FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN products p ON s.product_id = p.id WHERE s.business_id = $1 AND s.status = ''in_progress'' ORDER BY s.created_at LIMIT 10",
            "layout": { "x": 0, "y": 2, "w": 12, "h": 6 }
        }
    ]';

    v_default_layout := '[]';

    -- Logic: Execute only on INSERT or when business_type actually changes
    IF (TG_OP = 'INSERT') OR (OLD.business_type IS DISTINCT FROM NEW.business_type) THEN
        IF NEW.business_type = 'automotive' THEN
            NEW.dashboard_config := v_config_automotive;
        ELSIF NEW.business_type = 'barbershop' THEN
            NEW.dashboard_config := v_config_barbershop;
        ELSIF NEW.business_type = 'beauty_salon' THEN
            NEW.dashboard_config := v_config_beauty;
        ELSIF NEW.business_type = 'restaurant' THEN
            NEW.dashboard_config := v_config_restaurant;
        ELSIF NEW.business_type = 'hotel' THEN
            NEW.dashboard_config := v_config_hotel;
        ELSE
            NEW.dashboard_config := v_default_layout;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger Definition
DROP TRIGGER IF EXISTS trg_update_business_config ON public.business;

CREATE TRIGGER trg_update_business_config
BEFORE INSERT OR UPDATE ON public.business
FOR EACH ROW
EXECUTE FUNCTION public.sync_dashboard_config();
