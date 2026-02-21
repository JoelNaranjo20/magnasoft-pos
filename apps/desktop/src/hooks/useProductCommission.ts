import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Pure utility function to calculate product commission with hierarchical logic
 * 
 * Priority:
 * 1. Product-specific commission (if not null)
 * 2. Global/business default commission
 * 3. Fallback to 0
 * 
 * @param price - Product unit price
 * @param quantity - Quantity sold
 * @param productCommission - Product-specific commission percentage (nullable)
 * @param globalCommission - Business default commission percentage
 * @returns Object with commission amount, applied percentage, and source
 */
export function calculateProductCommission(
    price: number,
    quantity: number,
    globalCommission: number
): {
    commissionAmount: number;
    appliedPercentage: number;
    source: 'product' | 'global' | 'none';
} {
    const baseAmount = price * quantity;

    // Use Global commission only (product-specific overrides removed at user request)
    if (globalCommission > 0) {
        const commissionAmount = (baseAmount * globalCommission) / 100;
        return {
            commissionAmount,
            appliedPercentage: globalCommission,
            source: 'global'
        };
    }

    // Priority 3: No commission
    return {
        commissionAmount: 0,
        appliedPercentage: 0,
        source: 'none'
    };
}

interface Product {
    id: string;
    commission_percentage?: number | null;
    price: number;
}

interface UseProductCommissionResult {
    serviceRate: number;
    productRate: number;
    loading: boolean;
    calculateCommission: (product: Product, quantity: number) => {
        commissionAmount: number;
        appliedPercentage: number;
        source: 'product' | 'global' | 'none';
    };
}

/**
 * React hook to manage product commission calculations
 * Fetches the global default commission rate and provides a calculation function
 * 
 * @param businessId - Current business ID
 * @returns Object with global commission rate, loading state, and calculation function
 */
export function useProductCommission(businessId: string): UseProductCommissionResult {
    const [rates, setRates] = useState<{ serviceRate: number; productRate: number }>({
        serviceRate: 50.0,
        productRate: 10.0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!businessId) {
            setLoading(false);
            return;
        }

        const fetchCommissions = async () => {
            try {
                // Determine available columns. Based on logs, default_commission might be missing in some environments
                // We'll perform a safer fetch or handle the 400 error
                const { data, error } = await supabase
                    .from('business')
                    .select('id, default_product_commission')
                    .eq('id', businessId)
                    .single();

                if (error) {
                    // If even this fails, we use hardcoded defaults
                    console.warn('Error fetching commission rates (falling back to defaults):', error.message);
                    setRates({
                        serviceRate: 50.0,
                        productRate: 10.0
                    });
                    return;
                }

                if (data) {
                    const businessData = data as any;
                    setRates({
                        // Fallback serviceRate to 50% if column is missing (it's not in the select above for safety)
                        serviceRate: 50.0,
                        productRate: Number(businessData.default_product_commission) || 10.0
                    });
                }
            } catch (err) {
                console.error('Unexpected error fetching commission rates:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCommissions();
    }, [businessId]);

    const calculateCommission = (product: Product, quantity: number) => {
        return calculateProductCommission(
            product.price,
            quantity,
            rates.productRate
        );
    };

    return {
        serviceRate: rates.serviceRate,
        productRate: rates.productRate,
        loading,
        calculateCommission
    };
}
