// @ts-nocheck
/**
 * POS Type Definitions
 * Polymorphic metadata for different business types
 */

export interface TipDistribution {
    worker_id: string;
    amount: number;
}

export interface CrossChange {
    from_method: 'cash' | 'transfer' | 'card';
    to_method: 'cash' | 'transfer' | 'card';
    amount: number;
}

export interface SaleMetadata {
    business_type: 'automotive' | 'retail' | 'restaurant' | 'barbershop';
    created_from: 'desktop_pos' | 'web_pos';

    // Automotive-specific
    mileage?: number;
    vehicle_notes?: string;

    // Restaurant-specific
    table_id?: string;
    table_number?: number;
    diners?: number;
    shift_id?: string;

    // Barbershop/Salon-specific
    stylist_id?: string; // Worker ID for the main stylist/professional
    appointment_id?: string;

    // Retail-specific
    quick_sale_name?: string;
    sale_notes?: string;

    // Tip / Propina (existente + extendido)
    tip_amount?: number;
    tip_worker_id?: string | null;
    tip_payment_method?: 'cash' | 'transfer' | 'card';
    tip_percentage?: number;
    tip_distribution?: TipDistribution[];

    // Cambio cruzado (cross-change)
    cross_change?: CrossChange;
}

export interface AutomotiveSaleMetadata extends SaleMetadata {
    business_type: 'automotive';
    mileage?: number;
    vehicle_notes?: string;
}

export interface RestaurantSaleMetadata extends SaleMetadata {
    business_type: 'restaurant';
    table_id?: string;
    table_number?: number;
    diners?: number;
}

export interface BarbershopSaleMetadata extends SaleMetadata {
    business_type: 'barbershop';
    stylist_id?: string;
    appointment_id?: string;
}

export interface RetailSaleMetadata extends SaleMetadata {
    business_type: 'retail';
    quick_sale_name?: string;
    sale_notes?: string;
}
