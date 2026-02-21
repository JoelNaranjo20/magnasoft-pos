// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Category {
    id: string;
    name: string;
}

export const useCategories = (businessId: string | undefined) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!businessId) {
            setLoading(false);
            return;
        }

        const fetchCategories = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('id, name')
                    .eq('business_id', businessId)
                    .order('name');

                if (error) throw error;
                setCategories(data || []);
            } catch (error) {
                console.error('Error cargando categorías:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, [businessId]);

    return { categories, loading };
};
