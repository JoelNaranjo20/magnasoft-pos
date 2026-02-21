'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export interface CashSession {
    id: string;
    opened_at: string;
    closed_at: string | null;
    opening_balance: number;
    worker_id: string;
    worker?: { name: string };
}

export function useActiveSession() {
    const [activeSession, setActiveSession] = useState<CashSession | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchActiveSession = async () => {
        try {
            const { data, error } = await supabase
                .from('cash_sessions')
                .select('*, worker:workers(name)')
                .is('closed_at', null)
                .order('opened_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;
            setActiveSession(data);
        } catch (error) {
            console.error('Error fetching active session:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveSession();
    }, []);

    return { activeSession, loading, refresh: fetchActiveSession };
}
