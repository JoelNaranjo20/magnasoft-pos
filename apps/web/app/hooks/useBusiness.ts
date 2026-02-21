import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface BusinessConfig {
    id: string;
    name: string;
    logo_url: string | null;
    email: string | null;
    pin: string | null;
    location: string | null;
    slug: string;
    status: string;
}

export const useBusiness = () => {
    const [business, setBusiness] = useState<BusinessConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const { profile } = useAuth();

    useEffect(() => {
        const fetchBusiness = async () => {
            if (!profile?.business_id) {
                setLoading(false);
                return;
            }

            try {
                // Fetch the one business record visible to this user (Strict RLS)
                const { data, error } = await supabase
                    .from('business')
                    .select('*')
                    // .eq('id', profile.business_id) // Redundant: RLS enforces this
                    .single();

                if (error) throw error;
                setBusiness(data);
            } catch (error) {
                console.error('Error fetching business info:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBusiness();
    }, [profile]);

    return { business, loading };
};
