
export const WIDGET_CATALOG = {
    kpis: [
        // --- Automotive ---
        {
            id: 'kpi_auto_washed_today',
            label: 'Vehículos Lavados Hoy',
            defaultIcon: 'car',
            query: 'SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE',
            tags: ['automotive']
        },
        {
            id: 'kpi_auto_revenue_today',
            label: 'Ingresos Servicios',
            defaultIcon: 'dollar-sign',
            query: 'SELECT COALESCE(SUM(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE',
            tags: ['automotive']
        },
        {
            id: 'kpi_auto_avg_ticket',
            label: 'Ticket Promedio',
            defaultIcon: 'trending-up',
            query: 'SELECT COALESCE(AVG(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE',
            tags: ['automotive']
        },
        {
            id: 'kpi_auto_oil_changes',
            label: 'Cambios de Aceite',
            defaultIcon: 'oil_barrel', // Need to check if this icon exists or use a generic one like 'droplet'
            query: "SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE AND si.name ILIKE '%aceite%'",
            tags: ['automotive']
        },
        {
            id: 'kpi_auto_alignment',
            label: 'Alineaciones',
            defaultIcon: 'settings',
            query: "SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE AND si.name ILIKE '%alineacion%'",
            tags: ['automotive']
        },
        {
            id: 'kpi_auto_balancing',
            label: 'Balanceos',
            defaultIcon: 'refresh-ccw',
            query: "SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE AND si.name ILIKE '%balanceo%'",
            tags: ['automotive']
        },
        // --- Barbershop ---
        {
            id: 'kpi_barber_cuts_today',
            label: 'Cortes Realizados',
            defaultIcon: 'scissors',
            query: 'SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE',
            tags: ['barbershop']
        },
        {
            id: 'kpi_barber_top_barber',
            label: 'Barbero Top',
            defaultIcon: 'award',
            query: "SELECT COALESCE(w.name, 'Sin Asignar') FROM sales s LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE GROUP BY w.name ORDER BY COUNT(*) DESC LIMIT 1",
            tags: ['barbershop']
        },
        {
            id: 'kpi_barber_product_sales',
            label: 'Venta Productos',
            defaultIcon: 'shopping-bag',
            query: 'SELECT COALESCE(SUM(si.quantity * si.price), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE',
            tags: ['barbershop']
        },
        // --- Beauty Salon ---
        {
            id: 'kpi_beauty_appointments',
            label: 'Citas Atendidas',
            defaultIcon: 'calendar-check',
            query: "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = 'completed'",
            tags: ['beauty_salon']
        },
        {
            id: 'kpi_beauty_avg_ticket',
            label: 'Ticket Promedio',
            defaultIcon: 'trending-up',
            query: 'SELECT COALESCE(AVG(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE',
            tags: ['beauty_salon']
        },
        {
            id: 'kpi_beauty_active_treatments',
            label: 'Tratamientos Activos',
            defaultIcon: 'sparkles',
            query: "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND status = 'in_progress'",
            tags: ['beauty_salon']
        },
        // --- Restaurant ---
        {
            id: 'kpi_rest_tables_occupied',
            label: 'Mesas Ocupadas',
            defaultIcon: 'utensils',
            query: "SELECT COUNT(DISTINCT (metadata->>'table_number')::int) FROM sales WHERE business_id = $1 AND status IN ('pending', 'in_progress') AND metadata ? 'table_number'",
            tags: ['restaurant']
        },
        {
            id: 'kpi_rest_sales_today',
            label: 'Ventas del Día',
            defaultIcon: 'dollar-sign',
            query: 'SELECT COALESCE(SUM(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE',
            tags: ['restaurant']
        },
        {
            id: 'kpi_rest_top_dish',
            label: 'Plato Más Vendido',
            defaultIcon: 'chef-hat',
            query: 'SELECT p.name FROM sale_items si JOIN products p ON si.product_id = p.id JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE GROUP BY p.name ORDER BY SUM(si.quantity) DESC LIMIT 1',
            tags: ['restaurant']
        },
        // --- Hotel ---
        {
            id: 'kpi_hotel_occupancy',
            label: 'Ocupación (%)',
            defaultIcon: 'hotel',
            query: "SELECT ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM products WHERE business_id = $1), 0)) * 100, 2) FROM sales WHERE business_id = $1 AND status = 'in_progress'",
            tags: ['hotel']
        },
        {
            id: 'kpi_hotel_checkins',
            label: 'Check-ins Hoy',
            defaultIcon: 'log-in',
            query: "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = 'in_progress'",
            tags: ['hotel']
        },
        {
            id: 'kpi_hotel_checkouts',
            label: 'Check-outs Hoy',
            defaultIcon: 'log-out',
            query: "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(updated_at) = CURRENT_DATE AND status = 'completed'",
            tags: ['hotel']
        }
    ],
    charts: [
        {
            id: 'chart_auto_services_week',
            label: 'Servicios por Día (7 días)',
            chartType: 'bar',
            query: "SELECT DATE(created_at) as date, COUNT(*) as count FROM sales WHERE business_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date",
            tags: ['automotive']
        }
    ],
    tables: [
        // --- Automotive ---
        {
            id: 'tbl_auto_in_queue',
            label: 'Vehículos en Pista',
            columns: [
                { key: 'license_plate', label: 'Placa' },
                { key: 'service_name', label: 'Servicio' },
                { key: 'status', label: 'Estado' },
                { key: 'entry_time', label: 'Hora Entrada' }
            ],
            query: "SELECT v.license_plate, s.service_name, s.status, s.created_at as entry_time FROM sales s LEFT JOIN vehicles v ON s.vehicle_id = v.id WHERE s.business_id = $1 AND s.status IN ('pending', 'in_progress') ORDER BY s.created_at DESC LIMIT 10",
            tags: ['automotive']
        },
        // --- Barbershop ---
        {
            id: 'tbl_barber_queue',
            label: 'Turnos en Espera',
            columns: [
                { key: 'customer_name', label: 'Cliente' },
                { key: 'worker_name', label: 'Barbero' },
                { key: 'appointment_time', label: 'Hora Cita' },
                { key: 'status', label: 'Estado' }
            ],
            query: "SELECT c.name as customer_name, w.name as worker_name, s.created_at as appointment_time, s.status FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND s.status IN ('pending', 'in_progress') ORDER BY s.created_at LIMIT 10",
            tags: ['barbershop']
        },
        // --- Beauty Salon ---
        {
            id: 'tbl_beauty_agenda',
            label: 'Agenda del Día',
            columns: [
                { key: 'customer_name', label: 'Cliente' },
                { key: 'stylist_name', label: 'Estilista' },
                { key: 'treatment', label: 'Tratamiento' },
                { key: 'appointment_time', label: 'Hora' }
            ],
            query: 'SELECT c.name as customer_name, w.name as stylist_name, s.notes as treatment, s.created_at as appointment_time FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE ORDER BY s.created_at LIMIT 15',
            tags: ['beauty_salon']
        },
        // --- Restaurant ---
        {
            id: 'tbl_rest_orders',
            label: 'Comandas en Cocina',
            columns: [
                { key: 'table_number', label: 'Mesa' },
                { key: 'waiter_name', label: 'Mesero' },
                { key: 'wait_time', label: 'Tiempo Espera' },
                { key: 'status', label: 'Estado' }
            ],
            query: "SELECT (s.metadata->>'table_number') as table_number, w.name as waiter_name, EXTRACT(MINUTE FROM (NOW() - s.created_at)) || ' min' as wait_time, s.status FROM sales s LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND s.status IN ('pending', 'in_progress') ORDER BY s.created_at LIMIT 10",
            tags: ['restaurant']
        },
        // --- Hotel ---
        {
            id: 'tbl_hotel_guests',
            label: 'Recepción / Huéspedes',
            columns: [
                { key: 'room_number', label: 'Habitación' },
                { key: 'guest_name', label: 'Huésped' },
                { key: 'checkout_date', label: 'Salida Prevista' },
                { key: 'payment_status', label: 'Estado Pago' }
            ],
            query: "SELECT p.name as room_number, c.name as guest_name, (s.metadata->>'checkout_date') as checkout_date, CASE WHEN s.paid THEN 'Pagado' ELSE 'Pendiente' END as payment_status FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN products p ON s.product_id = p.id WHERE s.business_id = $1 AND s.status = 'in_progress' ORDER BY s.created_at LIMIT 10",
            tags: ['hotel']
        }
    ]
};

export const INDUSTRY_PRESETS: Record<string, string[]> = {
    automotive: [
        'kpi_auto_washed_today',
        'kpi_auto_oil_changes', // Added
        'kpi_auto_alignment',   // Added
        'kpi_auto_balancing',   // Added
        'kpi_auto_revenue_today',
        'kpi_auto_avg_ticket',
        'chart_auto_services_week',
        'tbl_auto_in_queue'
    ],
    barbershop: [
        'kpi_barber_cuts_today',
        'kpi_barber_top_barber',
        'kpi_barber_product_sales',
        'tbl_barber_queue'
    ],
    beauty_salon: [
        'kpi_beauty_appointments',
        'kpi_beauty_avg_ticket',
        'kpi_beauty_active_treatments',
        'tbl_beauty_agenda'
    ],
    restaurant: [
        'kpi_rest_tables_occupied',
        'kpi_rest_sales_today',
        'kpi_rest_top_dish',
        'tbl_rest_orders'
    ],
    hotel: [
        'kpi_hotel_occupancy',
        'kpi_hotel_checkins',
        'kpi_hotel_checkouts',
        'tbl_hotel_guests'
    ]
};
