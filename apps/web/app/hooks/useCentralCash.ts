
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface CentralMovement {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    created_at: string;
    user_id: string;
}

export function useCentralCash() {
    const [movements, setMovements] = useState<CentralMovement[]>([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const { user, profile } = useAuth();

    const fetchMovements = async () => {
        if (!profile?.business_id) return;

        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from('central_cash_movements' as any)
                .select('*')
                .eq('business_id', profile.business_id)
                .order('created_at', { ascending: false }) as any);

            if (error) throw error;

            const movs = (data as CentralMovement[]) || [];
            setMovements(movs);

            // Ensure amounts are numbers and calculate balance
            const total = movs.reduce((acc, m) => {
                const amount = Number(m.amount) || 0;
                return m.type === 'income' ? acc + amount : acc - amount;
            }, 0);

            setBalance(total);
        } catch (error) {
            console.error('Error fetching central cash movements:', error);
        } finally {
            setLoading(false);
        }
    };

    const addMovement = async (type: 'income' | 'expense', amount: number, description: string) => {
        if (!profile?.business_id || !user?.id) {
            console.error('Missing business_id or user_id for central cash movement');
            return { success: false, error: 'Missing business or user context' };
        }

        try {
            const { error } = await (supabase
                .from('central_cash_movements' as any)
                .insert({
                    business_id: profile.business_id,
                    type,
                    amount,
                    description,
                    user_id: user.id
                }) as any);

            if (error) throw error;
            await fetchMovements();
            return { success: true };
        } catch (error) {
            console.error('Error adding central cash movement:', error);
            return { success: false, error };
        }
    };

    useEffect(() => {
        if (profile?.business_id) {
            fetchMovements();

            // Realtime subscription
            const channel = supabase
                .channel('central_cash_changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'central_cash_movements',
                        filter: `business_id=eq.${profile.business_id}`,
                    },
                    (payload) => {
                        console.log('Realtime update:', payload);
                        fetchMovements();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [profile?.business_id]);

    return {
        movements,
        balance,
        loading,
        refresh: fetchMovements,
        addMovement
    };
}
