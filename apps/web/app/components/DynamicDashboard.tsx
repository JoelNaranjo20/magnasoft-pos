// apps/web/app/components/DynamicDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { supabase } from '../../lib/supabase';
import DashboardRenderer from './DashboardRenderer';

export default function DynamicDashboard() {
    const { business } = useBusiness();
    const [widgets, setWidgets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!business?.id) return;

        const loadDashboard = async () => {
            setLoading(true);

            try {
                // Call secure RPC that reads pre-configured queries from dashboard_config
                const { data, error } = await supabase
                    .rpc('get_dashboard_metrics', { p_business_id: business.id });

                if (error) {
                    console.error('Error loading dashboard:', error);
                    setWidgets([]);
                    setLoading(false);
                    return;
                }

                // The RPC returns widgets with data already attached
                setWidgets(data || []);

            } catch (err) {
                console.error('Dashboard load failed:', err);
                setWidgets([]);
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, [business?.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm font-medium">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    if (!widgets.length) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-slate-500">No hay configuración de dashboard para este negocio.</p>
            </div>
        );
    }

    return <DashboardRenderer widgets={widgets} />;
}
