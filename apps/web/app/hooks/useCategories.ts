'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export interface Category {
    id: string;
    business_id: string;
    name: string;
    type: 'product' | 'service' | 'general';
    color: string;
}

export function useCategories(type?: 'product' | 'service' | 'general') {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('categories')
                .select('*')
                .order('name');

            if (type) {
                // If specific type is requested, filter. Otherwise show all (including general)
                query = query.or(`type.eq.${type},type.eq.general`);
            }

            const { data, error } = await query;

            if (error) throw error;
            setCategories((data as Category[]) || []);
        } catch (err: any) {
            console.error('Error fetching categories:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [type]);

    return {
        categories,
        loading,
        refresh: fetchCategories
    };
}
