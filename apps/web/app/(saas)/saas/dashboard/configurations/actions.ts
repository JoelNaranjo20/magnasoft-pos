'use server';

import { createClient } from '@supabase/supabase-js';
import { INDUSTRY_PRESETS, MODULE_REGISTRY } from '../../../../constants/ModuleRegistry';

// Use service role to bypass RLS for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Dashboard configuration templates extracted from migration SQL
// Dashboard configuration templates synchronized with 20260208120000_sync_dashboard_config.sql
const TEMPLATES = {
    automotive: [
        {
            id: 'kpi_auto_washed_today',
            type: 'kpi',
            label: 'Vehículos Lavados Hoy',
            icon: 'car',
            query: "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE",
            layout: { x: 0, y: 0, w: 3, h: 2 }
        },
        {
            id: 'kpi_auto_oil_changes',
            type: 'kpi',
            label: 'Cambios de Aceite',
            icon: 'droplet',
            value: 0,
            query: "SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE AND si.name ILIKE '%aceite%'",
            layout: { x: 3, y: 0, w: 3, h: 2 }
        },
        {
            id: 'kpi_auto_alignment',
            type: 'kpi',
            label: 'Alineaciones',
            icon: 'settings',
            value: 0,
            query: "SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE AND si.name ILIKE '%alineacion%'",
            layout: { x: 6, y: 0, w: 3, h: 2 }
        },
        {
            id: 'kpi_auto_balancing',
            type: 'kpi',
            label: 'Balanceos',
            icon: 'refresh-ccw',
            value: 0,
            query: "SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE AND si.name ILIKE '%balanceo%'",
            layout: { x: 9, y: 0, w: 3, h: 2 }
        },
        {
            id: 'kpi_auto_revenue_today',
            type: 'kpi',
            label: 'Ingresos',
            icon: 'dollar-sign',
            value: 0,
            query: 'SELECT COALESCE(SUM(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE',
            layout: { x: 0, y: 2, w: 3, h: 2 }
        },
        {
            id: 'kpi_auto_avg_ticket',
            type: 'kpi',
            label: 'Ticket Promedio',
            icon: 'trending-up',
            value: 0,
            query: 'SELECT COALESCE(AVG(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE',
            layout: { x: 3, y: 2, w: 3, h: 2 }
        },
        {
            id: 'chart_auto_services_week',
            type: 'chart',
            label: 'Servicios por Día (7 días)',
            icon: 'bar-chart-2',
            query: "SELECT DATE(created_at) as date, COUNT(*) as count FROM sales WHERE business_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date",
            layout: { x: 0, y: 4, w: 7, h: 6 }
        },
        {
            id: 'tbl_auto_in_queue',
            type: 'table',
            label: 'Vehículos en Pista',
            icon: 'list',
            query: "SELECT v.license_plate, s.service_name, s.status, s.created_at as entry_time FROM sales s LEFT JOIN vehicles v ON s.vehicle_id = v.id WHERE s.business_id = $1 AND s.status IN ('pending', 'in_progress') ORDER BY s.created_at DESC LIMIT 10",
            layout: { x: 7, y: 4, w: 5, h: 6 }
        },
        {
            id: 'module_config',
            type: 'modules',
            module_vehicles: true,
            module_tables: false,
            module_service_queue: true,
            module_commissions: true,
            module_commission_payment: true,
            module_customers: true,
            module_inventory: true,
            module_payroll: true
        }
    ],
    barbershop: [
        {
            id: 'kpi_barber_cuts_today',
            type: 'kpi',
            label: 'Cortes Realizados',
            icon: 'scissors',
            query: "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE",
            layout: { x: 0, y: 0, w: 4, h: 2 }
        },
        {
            id: 'kpi_barber_top_barber',
            type: 'kpi',
            label: 'Barbero Top',
            icon: 'award',
            value: '',
            query: "SELECT COALESCE(w.name, 'Sin Asignar') FROM sales s LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE GROUP BY w.name ORDER BY COUNT(*) DESC LIMIT 1",
            layout: { x: 4, y: 0, w: 4, h: 2 }
        },
        {
            id: 'kpi_barber_product_sales',
            type: 'kpi',
            label: 'Venta Productos',
            icon: 'shopping-bag',
            query: "SELECT COALESCE(SUM(si.quantity * si.price), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE",
            layout: { x: 8, y: 0, w: 4, h: 2 }
        },
        {
            id: 'tbl_barber_queue',
            type: 'table',
            label: 'Turnos en Espera',
            icon: 'users',
            query: "SELECT c.name as customer_name, w.name as worker_name, s.created_at as appointment_time, s.status FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND s.status IN ('pending', 'in_progress') ORDER BY s.created_at LIMIT 10",
            layout: { x: 0, y: 2, w: 12, h: 6 }
        },
        {
            id: 'module_config',
            type: 'modules',
            module_vehicles: false,
            module_tables: false,
            module_service_queue: false,
            module_commissions: true,
            module_commission_payment: true,
            module_customers: true,
            module_inventory: true,
            module_payroll: true
        }
    ],
    beauty_salon: [
        {
            id: 'kpi_beauty_appointments',
            type: 'kpi',
            label: 'Citas Atendidas',
            icon: 'calendar-check',
            query: "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = 'completed'",
            layout: { x: 0, y: 0, w: 4, h: 2 }
        },
        {
            id: 'kpi_beauty_avg_ticket',
            type: 'kpi',
            label: 'Ticket Promedio',
            icon: 'trending-up',
            query: "SELECT COALESCE(AVG(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE",
            layout: { x: 4, y: 0, w: 4, h: 2 }
        },
        {
            id: 'kpi_beauty_active_treatments',
            type: 'kpi',
            label: 'Tratamientos Activos',
            icon: 'sparkles',
            query: "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND status = 'in_progress'",
            layout: { x: 8, y: 0, w: 4, h: 2 }
        },
        {
            id: 'tbl_beauty_agenda',
            type: 'table',
            label: 'Agenda del Día',
            icon: 'calendar',
            query: "SELECT c.name as customer_name, w.name as stylist_name, s.notes as treatment, s.created_at as appointment_time FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE ORDER BY s.created_at LIMIT 15",
            layout: { x: 0, y: 2, w: 12, h: 6 }
        },
        {
            id: 'module_config',
            type: 'modules',
            module_vehicles: false,
            module_tables: false,
            module_service_queue: false,
            module_commissions: true,
            module_commission_payment: true,
            module_customers: true,
            module_inventory: true,
            module_payroll: true
        }
    ],
    restaurant: [
        {
            id: 'kpi_rest_tables_occupied',
            type: 'kpi',
            label: 'Mesas Ocupadas',
            icon: 'utensils',
            query: "SELECT COUNT(DISTINCT (metadata->>'table_number')::int) FROM sales WHERE business_id = $1 AND status IN ('pending', 'in_progress') AND metadata ? 'table_number'",
            layout: { x: 0, y: 0, w: 4, h: 2 }
        },
        {
            id: 'kpi_rest_sales_today',
            type: 'kpi',
            label: 'Ventas del Día',
            icon: 'dollar-sign',
            query: "SELECT COALESCE(SUM(total), 0) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE",
            layout: { x: 4, y: 0, w: 4, h: 2 }
        },
        {
            id: 'kpi_rest_top_dish',
            type: 'kpi',
            label: 'Plato Más Vendido',
            icon: 'chef-hat',
            query: "SELECT p.name FROM sale_items si JOIN products p ON si.product_id = p.id JOIN sales s ON si.sale_id = s.id WHERE s.business_id = $1 AND DATE(s.created_at) = CURRENT_DATE GROUP BY p.name ORDER BY SUM(si.quantity) DESC LIMIT 1",
            layout: { x: 8, y: 0, w: 4, h: 2 }
        },
        {
            id: 'tbl_rest_orders',
            type: 'table',
            label: 'Comandas en Cocina',
            icon: 'clipboard-list',
            query: "SELECT (s.metadata->>'table_number') as table_number, w.name as waiter_name, EXTRACT(MINUTE FROM (NOW() - s.created_at)) || ' min' as wait_time, s.status FROM sales s LEFT JOIN workers w ON s.worker_id = w.id WHERE s.business_id = $1 AND s.status IN ('pending', 'in_progress') ORDER BY s.created_at LIMIT 10",
            layout: { x: 0, y: 2, w: 12, h: 6 }
        },
        {
            id: 'module_config',
            type: 'modules',
            module_vehicles: false,
            module_tables: true,
            module_service_queue: false,
            module_commissions: false,
            module_commission_payment: false,
            module_customers: true,
            module_inventory: true,
            module_payroll: true
        }
    ],
    hotel: [
        {
            id: 'kpi_hotel_occupancy',
            type: 'kpi',
            label: 'Ocupación (%)',
            icon: 'home',
            query: "SELECT ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM products WHERE business_id = $1), 0)) * 100, 2) FROM sales WHERE business_id = $1 AND status = 'in_progress'",
            layout: { x: 0, y: 0, w: 4, h: 2 }
        },
        {
            id: 'kpi_hotel_checkins',
            type: 'kpi',
            label: 'Check-ins Hoy',
            icon: 'log-in',
            query: "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = 'in_progress'",
            layout: { x: 4, y: 0, w: 4, h: 2 }
        },
        {
            id: 'kpi_hotel_checkouts',
            type: 'kpi',
            label: 'Check-outs Hoy',
            icon: 'log-out',
            query: "SELECT COUNT(*) FROM sales WHERE business_id = $1 AND DATE(updated_at) = CURRENT_DATE AND status = 'completed'",
            layout: { x: 8, y: 0, w: 4, h: 2 }
        },
        {
            id: 'tbl_hotel_guests',
            type: 'table',
            label: 'Recepción / Huéspedes',
            icon: 'users',
            query: "SELECT p.name as room_number, c.name as guest_name, (s.metadata->>'checkout_date') as checkout_date, CASE WHEN s.paid THEN 'Pagado' ELSE 'Pendiente' END as payment_status FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN products p ON s.product_id = p.id WHERE s.business_id = $1 AND s.status = 'in_progress' ORDER BY s.created_at LIMIT 10",
            layout: { x: 0, y: 2, w: 12, h: 6 }
        },
        {
            id: 'module_config',
            type: 'modules',
            module_vehicles: false,
            module_tables: false,
            module_service_queue: false,
            module_commissions: false,
            module_commission_payment: false,
            module_customers: true,
            module_inventory: true,
            module_payroll: true
        }
    ]
};


export async function applyDefaultTemplate(businessId: string, businessType: string) {
    try {
        // Validate business type
        const validTypes = ['automotive', 'barbershop', 'beauty_salon', 'restaurant', 'hotel'];
        if (!validTypes.includes(businessType)) {
            return {
                success: false,
                error: `Invalid business type: ${businessType}`
            };
        }

        // 1. Get dashboard template
        const template = TEMPLATES[businessType as keyof typeof TEMPLATES];
        if (!template) {
            return {
                success: false,
                error: `No template found for business type: ${businessType}`
            };
        }

        // 2. Get preset operational modules for the POS
        const presetModules = INDUSTRY_PRESETS[businessType as keyof typeof INDUSTRY_PRESETS] || {};

        // 3. Fetch current config to avoid wiping out custom settings (printers, etc)
        const { data: currentBusiness } = await supabaseAdmin
            .from('business')
            .select('config')
            .eq('id', businessId)
            .single();

        const mergedConfig = {
            ...(currentBusiness?.config || {}),
            ...presetModules
        };

        // 4. Update both columns
        const { data, error } = await supabaseAdmin
            .from('business')
            .update({
                dashboard_config: template,
                config: mergedConfig,
                business_type: businessType
            })
            .eq('id', businessId)
            .select()
            .single();

        if (error) {
            console.error('Error applying template:', error);
            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: true,
            data
        };
    } catch (error: any) {
        console.error('Server action error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error'
        };
    }
}

export async function saveDashboardConfig(businessId: string, config: any[]) {
    try {
        // Validate config (basic check)
        if (!Array.isArray(config)) {
            return {
                success: false,
                error: 'Invalid configuration format'
            };
        }

        // Update business config using service role
        const { error } = await supabaseAdmin
            .from('business')
            .update({ dashboard_config: config })
            .eq('id', businessId);

        if (error) {
            console.error('Error saving dashboard config:', error);
            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: true
        };
    } catch (error: any) {
        console.error('Server action error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error'
        };
    }
}

export async function changeBusinessType(businessId: string, newType: string, customConfig?: any[]) {
    try {
        const validTypes = Object.keys(INDUSTRY_PRESETS).concat(['automotive', 'barbershop', 'beauty_salon', 'restaurant', 'hotel', 'retail']);
        const uniqueValidTypes = [...new Set(validTypes)];
        if (!uniqueValidTypes.includes(newType)) {
            return { success: false, error: `Tipo de negocio inválido: ${newType}` };
        }

        const template = TEMPLATES[newType as keyof typeof TEMPLATES];
        if (!template) {
            return { success: false, error: `No hay plantilla para: ${newType}` };
        }

        // 1. Fetch current config to preserve non-module settings (printers, taxes, etc.)
        const { data: currentBusiness } = await supabaseAdmin
            .from('business')
            .select('config')
            .select('config, business_type')
            .eq('id', businessId)
            .single();

        const currentConfig = currentBusiness?.config || {};

        const currentType = (currentBusiness as any).business_type as keyof typeof INDUSTRY_PRESETS;
        const baseModules = (INDUSTRY_PRESETS as any)[currentType] || {};

        // 2. Get preset module flags for the new type
        const presetModules = (INDUSTRY_PRESETS as any)[newType] || {};

        // 3. SAFE MERGE: preserve non-module settings, overwrite only module flags
        const mergedConfig = {
            ...currentConfig,   // Preserve printers, taxes, and other non-module settings
            ...presetModules,   // Overwrite ONLY the module flags from the preset
        };

        // 4. If customConfig is provided, also extract module overrides from it
        if (customConfig) {
            const moduleEntry = customConfig.find((t: any) => t.type === 'modules');
            if (moduleEntry) {
                const { id, type, ...customFlags } = moduleEntry;
                Object.assign(mergedConfig, customFlags);
            }
        }

        console.log('[changeBusinessType] Saving merged config:', JSON.stringify(mergedConfig));

        // 5. Use customConfig for dashboard_config if provided, otherwise use template
        const configToSave = customConfig || template;

        // 6. Update all 3 fields atomically
        const { data, error } = await supabaseAdmin
            .from('business')
            .update({
                business_type: newType,
                dashboard_config: configToSave,
                config: mergedConfig
            })
            .eq('id', businessId)
            .select()
            .single();

        if (error) {
            console.error('Error updating business configuration:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Server action error:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * purgeBusinessData
 * Deletes ALL operational data for a business (sales, sessions, workers, customers,
 * products, services, cash movements, etc.) but keeps the business record itself.
 * Uses service_role to bypass RLS.
 */
export async function purgeBusinessData(businessId: string): Promise<{ success: boolean; error?: string; deleted?: Record<string, number> }> {
    try {
        if (!businessId) return { success: false, error: 'businessId requerido' };

        const deleted: Record<string, number> = {};

        // Helper to delete from a table and count rows
        const purge = async (table: string, column = 'business_id') => {
            const { count, error } = await supabaseAdmin
                .from(table)
                .delete({ count: 'exact' })
                .eq(column, businessId);
            if (error) throw new Error(`Error borrando ${table}: ${error.message}`);
            deleted[table] = count ?? 0;
        };

        // Delete in dependency order (children before parents)
        // 1. Sale items (depend on sales)
        const { data: sales } = await supabaseAdmin
            .from('sales')
            .select('id')
            .eq('business_id', businessId);

        if (sales && sales.length > 0) {
            const saleIds = sales.map((s: any) => s.id);
            const { count: itemCount, error: itemError } = await supabaseAdmin
                .from('sale_items')
                .delete({ count: 'exact' })
                .in('sale_id', saleIds);
            if (itemError) throw new Error(`Error borrando sale_items: ${itemError.message}`);
            deleted['sale_items'] = itemCount ?? 0;
        }

        // 2. Commission records (depend on sales & workers)
        await purge('commissions').catch(() => { deleted['commissions'] = 0; });

        // 3. Sales
        await purge('sales');

        // 4. Cash movements
        await purge('cash_movements');

        // 5. Cash sessions
        await purge('cash_sessions');

        // 6. Service queue
        await purge('service_queue').catch(() => { deleted['service_queue'] = 0; });

        // 7. Vehicles (depend on customers)
        await purge('vehicles').catch(() => { deleted['vehicles'] = 0; });

        // 8. Customers
        await purge('customers');

        // 9. Inventory movements (FK → products AND workers, must go before both)
        await purge('inventory_movements').catch(() => { deleted['inventory_movements'] = 0; });

        // 10. Workers
        await purge('workers');

        // 11. Products & services
        await purge('products');
        await purge('services');

        // 11. Business settings (loyalty, commissions config, etc.)
        await purge('business_settings').catch(() => { deleted['business_settings'] = 0; });

        console.log('[purgeBusinessData] Deleted:', deleted);
        return { success: true, deleted };
    } catch (error: any) {
        console.error('[purgeBusinessData] Error:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * deleteBusiness
 * Purges all operational data AND then deletes the business record itself.
 * This is irreversible.
 */
export async function deleteBusiness(businessId: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!businessId) return { success: false, error: 'businessId requerido' };

        // First purge all data
        const purgeResult = await purgeBusinessData(businessId);
        if (!purgeResult.success) {
            return { success: false, error: `Error en purga: ${purgeResult.error}` };
        }

        // Then delete the business row itself
        const { error } = await supabaseAdmin
            .from('business')
            .delete()
            .eq('id', businessId);

        if (error) {
            return { success: false, error: `Error eliminando negocio: ${error.message}` };
        }

        console.log('[deleteBusiness] Business deleted:', businessId);
        return { success: true };
    } catch (error: any) {
        console.error('[deleteBusiness] Error:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

