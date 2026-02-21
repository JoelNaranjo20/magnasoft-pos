import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

export interface DashboardConfig {
    show_summary: boolean;
    show_sales_chart: boolean;
    show_recent_transactions: boolean;
}

const DEFAULT_CONFIG: DashboardConfig = {
    show_summary: true,
    show_sales_chart: true,
    show_recent_transactions: true,
};

export const useDashboardConfig = () => {
    const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);

    // Use state.id directly as per previous learnings
    const businessId = useBusinessStore(state => state.id);

    useEffect(() => {
        if (!businessId) {
            setLoading(false);
            return;
        }

        const fetchConfig = async () => {
            try {
                setLoading(true);

                // Use maybeSingle() so that 0 rows returns null instead of a PGRST116 error
                // Cast to any: desktop Supabase types may not include dashboard_config yet
                const { data, error } = await (supabase as any)
                    .from('business')
                    .select('dashboard_config')
                    .eq('id', businessId)
                    .maybeSingle();

                if (error) {
                    console.warn('Error fetching dashboard config, using default:', error);
                    setConfig(DEFAULT_CONFIG);
                } else if (data?.dashboard_config) {
                    setConfig({ ...DEFAULT_CONFIG, ...data.dashboard_config });
                } else {
                    // No row or null dashboard_config — silently use defaults
                    setConfig(DEFAULT_CONFIG);
                }

            } catch (err) {
                console.error('Error in useDashboardConfig:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();

    }, [businessId]);

    const toggleWidget = async (key: keyof DashboardConfig) => {
        if (!businessId) return;

        const newConfig = { ...config, [key]: !config[key] };
        setConfig(newConfig);

        try {
            await (supabase as any)
                .from('business')
                .update({ dashboard_config: newConfig })
                .eq('id', businessId);
        } catch (err) {
            console.error('Error saving dashboard config:', err);
            // Optional: revert state if save fails
        }
    };

    return { config, loading, toggleWidget };
};
