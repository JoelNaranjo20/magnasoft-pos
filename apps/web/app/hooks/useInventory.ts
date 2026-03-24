'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    barcode: string | null;
    category: string | null;
    cost_price?: number | null;
    metadata?: any | null;
    created_at?: string;
}

export function useInventory() {
    const { profile, loading: authLoading } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const fetchProducts = useCallback(async () => {
        // Wait for auth to fully resolve before querying
        if (authLoading) return;

        if (!profile?.business_id) {
            setProducts([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('business_id', profile.business_id)
                .order('name');

            if (error) throw error;
            setProducts((data as any[]) || []);
        } catch (err: any) {
            console.error('Error fetching inventory:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [profile?.business_id, authLoading]);

    const addProduct = async (product: Omit<Product, 'id' | 'created_at'>) => {
        if (!profile?.business_id) return { data: null, error: new Error('No business ID') };
        
        try {
            const { data, error } = await supabase
                .from('products')
                .insert([{ ...product, business_id: profile.business_id }])
                .select();

            if (error) throw error;
            await fetchProducts();
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err };
        }
    };

    const updateProduct = async (id: string, updates: Partial<Product>) => {
        if (!profile?.business_id) return { data: null, error: new Error('No business ID') };

        try {
            const { data, error } = await supabase
                .from('products')
                .update(updates)
                .eq('id', id)
                .eq('business_id', profile.business_id) // Security: only update own business products
                .select();

            if (error) throw error;
            await fetchProducts();
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err };
        }
    };

    const deleteProduct = async (id: string) => {
        if (!profile?.business_id) return { error: new Error('No business ID') };

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id)
                .eq('business_id', profile.business_id); // Security: only delete own business products

            if (error) throw error;
            await fetchProducts();
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    return {
        products,
        loading,
        error,
        refresh: fetchProducts,
        addProduct,
        updateProduct,
        deleteProduct
    };
}
