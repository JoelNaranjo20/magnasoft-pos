// apps/desktop/src/components/dashboard/DynamicOperationalWidgets.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import * as LucideIcons from 'lucide-react';

type IconName = keyof typeof LucideIcons;

interface KPIWidget {
    type: 'kpi';
    title: string;
    icon: string;
    value: number | string;
    data?: any;
}

interface DashboardWidget {
    type: string;
    title?: string;
    icon?: string;
    value?: number | string;
    data?: any;
}

export const DynamicOperationalWidgets = () => {
    const businessId = useBusinessStore((state) => state.id);
    const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!businessId) return;

        const loadWidgets = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .rpc('get_dashboard_metrics', { p_business_id: businessId });

                if (error) {
                    console.error('Error loading dashboard metrics:', error);
                    setWidgets([]);
                    return;
                }

                // Filter only KPI widgets for operational metrics
                const kpiWidgets = (data || []).filter((w: DashboardWidget) => w.type === 'kpi');
                setWidgets(kpiWidgets);
            } catch (err) {
                console.error('Dashboard load failed:', err);
                setWidgets([]);
            } finally {
                setLoading(false);
            }
        };

        loadWidgets();
    }, [businessId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-500 text-xs font-bold">Cargando métricas...</p>
                </div>
            </div>
        );
    }

    if (widgets.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-400 text-sm">No hay métricas configuradas para este tipo de negocio.</p>
            </div>
        );
    }

    // Calculate max value for progress bars
    const maxValue = Math.max(
        ...widgets.map(w => {
            const val = w.data ?? w.value ?? 0;
            return typeof val === 'object' ? Object.values(val)[0] as number : Number(val);
        }),
        1
    );

    return (
        <div className="space-y-6">
            {widgets.map((widget: KPIWidget, idx) => {
                // Extract value from data or fallback to widget.value
                let displayValue = widget.data ?? widget.value ?? 0;

                // If data is an object with a single value, extract it
                if (typeof displayValue === 'object' && displayValue !== null) {
                    displayValue = Object.values(displayValue)[0];
                }

                const numericValue = typeof displayValue === 'number' ? displayValue : 0;

                // Get Lucide icon component
                const IconComponent = LucideIcons[widget.icon as IconName] as React.ComponentType<any>;

                // Color mapping for different metrics
                const colors = [
                    'bg-cyan-500',
                    'bg-purple-500',
                    'bg-indigo-500',
                    'bg-amber-500',
                    'bg-rose-500',
                    'bg-emerald-500'
                ];
                const color = colors[idx % colors.length];

                return (
                    <div key={idx}>
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-2">
                                {IconComponent ? (
                                    <IconComponent className="w-5 h-5 text-slate-400" strokeWidth={2.5} />
                                ) : (
                                    <span className="material-symbols-outlined text-slate-400 !text-lg">analytics</span>
                                )}
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                    {widget.title}
                                </span>
                            </div>
                            <span className="text-lg font-black text-slate-900 dark:text-white">
                                {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
                            </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
                                style={{ width: `${(numericValue / maxValue) * 100}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
