import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Product {
    id: string;
    commission_percentage?: number | null;
    commission_type?: 'percentage' | 'fixed' | null;
    commission_amount?: number | null;
    price: number;
    category_id?: string | null;
    metadata?: any;
}

interface CategoryMap {
    [id: string]: {
        commission_percentage?: number | null;
        commission_type?: 'percentage' | 'fixed' | null;
        commission_amount?: number | null;
        parent_id?: string | null;
    };
}

interface UseProductCommissionResult {
    loading: boolean;
    calculateCommission: (product: Product, quantity: number) => {
        commissionAmount: number;
        appliedPercentage: number;
        source: 'product' | 'subcategory' | 'category' | 'none';
    };
    refetch: () => Promise<void>;
}

/**
 * React hook to calculate product commissions using the inventory hierarchy:
 *   Product-specific → Subcategory → Category → No commission
 *
 * Supports two commission types:
 *   - 'percentage': standard % of the sale price × quantity
 *   - 'fixed': exact dollar amount per unit sold (quantity multiplied)
 */
export function useProductCommission(businessId: string): UseProductCommissionResult {
    const [categoriesMap, setCategoriesMap] = useState<CategoryMap>({});
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!businessId) {
            setLoading(false);
            return;
        }
        
        try {
            // Fetch all categories for this business (includes subcategories via parent_id)
            const { data: catsData, error: cError } = await (supabase as any)
                .from('categories')
                .select('id, parent_id, commission_percentage, commission_type, commission_amount')
                .eq('business_id', businessId);

            if (!cError && catsData) {
                const map: CategoryMap = {};
                catsData.forEach((c: any) => {
                    map[c.id] = {
                        commission_percentage: c.commission_percentage !== null ? Number(c.commission_percentage) : null,
                        commission_type: c.commission_type || 'percentage',
                        commission_amount: c.commission_amount !== null ? Number(c.commission_amount) : null,
                        parent_id: c.parent_id
                    };
                });
                setCategoriesMap(map);
            }
        } catch (err) {
            console.error('Error fetching category commission data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [businessId]);

    const calculateCommission = (product: Product, quantity: number) => {
        const baseAmount = product.price * quantity;

        // 1. Product-specific commission (highest priority)
        const prodType = product.commission_type || 'percentage';
        if (prodType === 'fixed' && product.commission_amount !== null && product.commission_amount !== undefined && product.commission_amount >= 0) {
            return {
                commissionAmount: product.commission_amount * quantity,
                appliedPercentage: 0,
                source: 'product' as const
            };
        }
        if (prodType === 'percentage' && product.commission_percentage !== undefined && product.commission_percentage !== null) {
            return {
                commissionAmount: (baseAmount * product.commission_percentage) / 100,
                appliedPercentage: product.commission_percentage,
                source: 'product' as const
            };
        }

        // 2. Resolve the category/subcategory the product belongs to.
        const directCategoryId = product.metadata?.subcategory_id || product.category_id;
        const directCategory = directCategoryId ? categoriesMap[directCategoryId] : null;

        if (directCategory) {
            // Priority 2a: The mapped category itself has a commission
            const catType = directCategory.commission_type || 'percentage';
            if (catType === 'fixed' && directCategory.commission_amount !== null && directCategory.commission_amount !== undefined && directCategory.commission_amount >= 0) {
                const isSubcat = !!directCategory.parent_id;
                return {
                    commissionAmount: directCategory.commission_amount * quantity,
                    appliedPercentage: 0,
                    source: isSubcat ? 'subcategory' as const : 'category' as const
                };
            }
            if (catType === 'percentage' && directCategory.commission_percentage !== null && directCategory.commission_percentage !== undefined) {
                const rate = directCategory.commission_percentage;
                const isSubcat = !!directCategory.parent_id;
                return {
                    commissionAmount: (baseAmount * rate) / 100,
                    appliedPercentage: rate,
                    source: isSubcat ? 'subcategory' as const : 'category' as const
                };
            }

            // Priority 2b: The mapped category is a subcategory but lacks a commission. 
            // Fall back to its parent category.
            if (directCategory.parent_id) {
                const parentCategory = categoriesMap[directCategory.parent_id];
                if (parentCategory) {
                    const parentType = parentCategory.commission_type || 'percentage';
                    if (parentType === 'fixed' && parentCategory.commission_amount !== null && parentCategory.commission_amount !== undefined && parentCategory.commission_amount >= 0) {
                        return {
                            commissionAmount: parentCategory.commission_amount * quantity,
                            appliedPercentage: 0,
                            source: 'category' as const
                        };
                    }
                    if (parentType === 'percentage' && parentCategory?.commission_percentage !== null && parentCategory?.commission_percentage !== undefined) {
                        const rate = parentCategory.commission_percentage;
                        return {
                            commissionAmount: (baseAmount * rate) / 100,
                            appliedPercentage: rate,
                            source: 'category' as const
                        };
                    }
                }
            }
        }

        // 3. No commission configured at any level
        return {
            commissionAmount: 0,
            appliedPercentage: 0,
            source: 'none' as const
        };
    };

    return { loading, calculateCommission, refetch: fetchData };
}

