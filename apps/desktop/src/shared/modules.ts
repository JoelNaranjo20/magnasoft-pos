/**
 * MODULE_REGISTRY
 * Central registry of all available modules in the system.
 * The `id` field maps directly to the key in the `config` JSONB column of the `business` table.
 */
export const MODULE_REGISTRY = {
    pos: {
        id: 'module_pos',
        label: 'Punto de Venta',
        description: 'Módulo principal de ventas y cobros',
        default: true,
    },
    vehicles: {
        id: 'module_vehicles',
        label: 'Gestión de Vehículos',
        description: 'Registro de clientes por placa y tipo de vehículo',
        default: false,
    },
    vehicle_queue: {
        id: 'module_service_queue',
        label: 'Cola de Vehículos / Servicio',
        description: 'Cola de espera para servicios automotrices',
        default: false,
    },
    tables: {
        id: 'module_tables',
        label: 'Mesas / Restaurante',
        description: 'Gestión de mesas y comandas',
        default: false,
    },
    commissions: {
        id: 'module_commissions',
        label: 'Gestión de Comisiones',
        description: 'Cálculo y asignación de comisiones a trabajadores',
        default: false,
    },
    commission_payment: {
        id: 'module_commission_payment',
        label: 'Pago de Comisiones',
        description: 'Liquidación y pago de comisiones',
        default: false,
    },
    customers: {
        id: 'module_customers',
        label: 'Gestión de Clientes',
        description: 'Base de datos de clientes y fidelización',
        default: true,
    },
    inventory: {
        id: 'module_inventory',
        label: 'Control de Inventario',
        description: 'Gestión de stock y productos',
        default: true,
    },
    payroll: {
        id: 'module_payroll',
        label: 'Gestión de Nómina',
        description: 'Salarios y pagos a trabajadores',
        default: false,
    },
    appointments: {
        id: 'module_appointments',
        label: 'Citas y Agenda',
        description: 'Gestión de citas y calendario',
        default: false,
    },
} as const;

/**
 * ModuleKey type — the semantic keys used in code (e.g. 'vehicles', 'commissions')
 */
export type ModuleKey = keyof typeof MODULE_REGISTRY;

/**
 * ConfigKey type — the actual keys stored in the DB config column (e.g. 'module_vehicles')
 */
export type ConfigKey = typeof MODULE_REGISTRY[ModuleKey]['id'];

/**
 * Helper: Get the DB config key for a given module key
 */
export function getConfigKey(moduleKey: ModuleKey): string {
    return MODULE_REGISTRY[moduleKey].id;
}

/**
 * INDUSTRY_PRESETS
 * Business types act as presets that pre-activate a set of modules.
 * When a business is created or its type is changed, these module flags
 * are written to the `config` JSONB column in the `business` table.
 *
 * IMPORTANT: When applying a preset, use a MERGE strategy to avoid
 * overwriting non-module config (e.g. printer settings, tax config).
 * Only the module flags listed here should be overwritten.
 */
export const INDUSTRY_PRESETS = {
    automotive: {
        label: 'Taller Automotriz',
        icon: 'directions_car',
        modules: {
            module_vehicles: true,
            module_service_queue: true,
            module_commissions: true,
            module_commission_payment: true,
            module_customers: true,
            module_inventory: true,
            module_payroll: true,
            module_tables: false,
            module_appointments: false,
        },
    },
    barbershop: {
        label: 'Barbería / Salón',
        icon: 'content_cut',
        modules: {
            module_vehicles: false,
            module_service_queue: false,
            module_commissions: true,
            module_commission_payment: true,
            module_customers: true,
            module_inventory: true,
            module_payroll: true,
            module_tables: false,
            module_appointments: false,
        },
    },
    restaurant: {
        label: 'Restaurante',
        icon: 'restaurant',
        modules: {
            module_vehicles: false,
            module_service_queue: false,
            module_commissions: false,
            module_commission_payment: false,
            module_customers: true,
            module_inventory: true,
            module_payroll: true,
            module_tables: true,
            module_appointments: false,
        },
    },
    retail: {
        label: 'Retail / Tienda',
        icon: 'shopping_cart',
        modules: {
            module_vehicles: false,
            module_service_queue: false,
            module_commissions: false,
            module_commission_payment: false,
            module_customers: true,
            module_inventory: true,
            module_payroll: false,
            module_tables: false,
            module_appointments: false,
        },
    },
    beauty_salon: {
        label: 'Salón de Belleza',
        icon: 'spa',
        modules: {
            module_vehicles: false,
            module_service_queue: false,
            module_commissions: true,
            module_commission_payment: true,
            module_customers: true,
            module_inventory: true,
            module_payroll: true,
            module_tables: false,
            module_appointments: true,
        },
    },
    hotel: {
        label: 'Hotel / Hospedaje',
        icon: 'hotel',
        modules: {
            module_vehicles: false,
            module_service_queue: false,
            module_commissions: false,
            module_commission_payment: false,
            module_customers: true,
            module_inventory: true,
            module_payroll: true,
            module_tables: false,
            module_appointments: false,
        },
    },
} as const;

export type IndustryPresetKey = keyof typeof INDUSTRY_PRESETS;

/**
 * getPresetModules
 * Returns the module flags for a given industry preset.
 * Returns an empty object if the preset is not found.
 */
export function getPresetModules(businessType: string): Record<string, boolean> {
    const preset = INDUSTRY_PRESETS[businessType as IndustryPresetKey];
    return preset ? { ...preset.modules } : {};
}

/**
 * mergeConfigWithPreset
 * Safely merges a new industry preset's module flags into an existing config object.
 * This preserves non-module settings (printers, taxes, etc.) while updating module flags.
 *
 * @param currentConfig - The existing config object from the DB
 * @param businessType - The new industry preset to apply
 * @returns Merged config object
 */
export function mergeConfigWithPreset(
    currentConfig: Record<string, any>,
    businessType: string
): Record<string, any> {
    const presetModules = getPresetModules(businessType);
    return {
        ...currentConfig,    // Preserve all existing settings (printers, taxes, etc.)
        ...presetModules,    // Overwrite ONLY the module flags from the preset
    };
}
