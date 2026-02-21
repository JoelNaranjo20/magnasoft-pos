// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';

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
    const user = useSessionStore((state) => state.user);
    const businessId = useBusinessStore((state) => state.id);

    const fetchMovements = async () => {
        if (!businessId) {
            console.warn('⚠️ No business_id available, cannot fetch movements');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            console.log('📥 Fetching central cash movements for business:', businessId);

            const { data, error } = await (supabase
                .from('central_cash_movements' as any)
                .select('*')
                // .eq('business_id', businessId) // Handled by RLS
                .order('created_at', { ascending: false }) as any);

            if (error) {
                console.error('❌ Error fetching movements:', error);
                throw error;
            }

            const movs = (data as CentralMovement[]) || [];
            console.log('✅ Fetched movements:', movs.length);
            setMovements(movs);

            const total = movs.reduce((acc, m) => {
                return m.type === 'income' ? acc + m.amount : acc - m.amount;
            }, 0);

            setBalance(total);
        } catch (error) {
            console.error('Error fetching central cash movements:', error);
        } finally {
            setLoading(false);
        }
    };

    const addMovement = async (type: 'income' | 'expense', amount: number, description: string) => {
        // Business check logic removed as it's handled by RLS/Auth

        try {
            const sanitizedUserId = (user?.id === 'terminal-local' || !user?.id) ? null : user.id;

            console.log('💾 Inserting movement:', { type, amount, description, user_id: sanitizedUserId });

            const { error } = await (supabase
                .from('central_cash_movements' as any)
                .insert({
                    // business_id: businessId, // Auto-assigned by DB Trigger
                    type,
                    amount,
                    description,
                    user_id: sanitizedUserId
                }) as any);

            if (error) {
                console.error('❌ Insert error:', error);
                throw error;
            }

            console.log('✅ Movement inserted successfully');
            await fetchMovements();
            return { success: true };
        } catch (error) {
            console.error('Error adding central cash movement:', error);
            return { success: false, error };
        }
    };

    useEffect(() => {
        fetchMovements();
    }, []);

    return {
        movements,
        balance,
        loading,
        refresh: fetchMovements,
        addMovement
    };
}
