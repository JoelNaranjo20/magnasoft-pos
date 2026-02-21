'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    barcode: string | null;
    category: string | null;
    created_at?: string;
}

export function useInventory() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (error) throw error;
            setProducts((data as any[]) || []);
        } catch (err: any) {
            console.error('Error fetching inventory:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const addProduct = async (product: Omit<Product, 'id' | 'created_at'>) => {
        try {
            const { data, error } = await supabase
                .from('products')
                .insert([product])
                .select();

            if (error) throw error;
            await fetchProducts();
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err };
        }
    };

    const updateProduct = async (id: string, updates: Partial<Product>) => {
        try {
            const { data, error } = await supabase
                .from('products')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            await fetchProducts();
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err };
        }
    };

    const deleteProduct = async (id: string) => {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchProducts();
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

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
