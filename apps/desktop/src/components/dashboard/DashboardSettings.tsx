import { useDashboardConfig } from '@shared/hooks/useDashboardConfig';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { LayoutDashboard, BarChart3, List, ShoppingBag, TrendingUp } from 'lucide-react';

export const DashboardSettings = () => {
    const { config, toggleWidget, loading, updateConfig } = useDashboardConfig();
    const business = useBusinessStore((state: any) => state.business);

    if (loading) return <div className="h-40 bg-gray-50 animate-pulse rounded-xl" />;

    const sectionOptions = [
        {
            key: 'show_summary' as const,
            label: 'Resumen Operativo',
            desc: 'Tarjetas de métricas en la parte superior.',
            icon: LayoutDashboard
        },
        {
            key: 'show_sales_chart' as const,
            label: 'Gráfica de Ingresos',
            desc: 'Historial de dinero en el tiempo.',
            icon: BarChart3
        },
        {
            key: 'show_recent_transactions' as const,
            label: 'Últimas Transacciones',
            desc: 'Tabla inferior con movimientos recientes.',
            icon: List
        },
        {
            key: 'pos_hide_all_items' as const,
            label: 'Ocultar productos/servicios en POS',
            desc: 'El POS inicia vacío: muestra ítems solo al seleccionar categoría o buscar.',
            icon: ShoppingBag
        }
    ];

    const cardOptions = [
        { key: 'show_card_ingresos' as const, label: 'Ingresos', color: 'emerald' },
        { key: 'show_card_ticket' as const, label: 'Ticket Prom.', color: 'blue' },
        { key: 'show_card_items' as const, label: 'Items', color: 'amber' },
        { key: 'show_card_clientes' as const, label: 'Clientes', color: 'purple' },
        { key: 'show_card_gastos' as const, label: 'Gastos', color: 'rose' },
        { key: 'show_card_promo' as const, label: 'Promo', color: 'fuchsia' },
    ];

    const Toggle = ({ active }: { active: boolean }) => (
        <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0 ${active ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${active ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
    );

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-2xl">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <LayoutDashboard className="text-blue-600 dark:text-blue-400" size={20} />
                    Personalizar Vista
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Configurando vista para: <span className="font-bold text-blue-600 dark:text-blue-400">{business?.name || 'Tu Negocio'}</span>
                </p>
            </div>

            {/* Section toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {sectionOptions.map((opt) => (
                    <div
                        key={opt.key}
                        onClick={() => toggleWidget(opt.key)}
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all select-none ${config[opt.key]
                            ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'
                            : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${config[opt.key] ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                                <opt.icon size={18} />
                            </div>
                            <p className={`font-semibold text-sm ${config[opt.key] ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                {opt.label}
                            </p>
                        </div>
                        <Toggle active={!!config[opt.key]} />
                    </div>
                ))}
            </div>

            {/* Individual card toggles */}
            <div className="border-t border-slate-100 dark:border-slate-700 mt-6 pt-5">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp size={13} />
                        Tarjetas del Resumen
                    </h4>
                    
                    {/* Size Selector */}
                    <div className="hidden sm:flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                        {(['small', 'medium', 'large'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => updateConfig({ card_size: s })}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all ${
                                    (config.card_size || 'large') === s
                                        ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                {s === 'small' ? 'Pequeño' : s === 'medium' ? 'Mediano' : 'Grande'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile Size Selector */}
                <div className="flex sm:hidden bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg mb-4 w-full">
                    {(['small', 'medium', 'large'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => updateConfig({ card_size: s })}
                            className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all ${
                                (config.card_size || 'large') === s
                                    ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            {s === 'small' ? 'Pequeño' : s === 'medium' ? 'Mediano' : 'Grande'}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {cardOptions.map((opt) => {
                        const active = config[opt.key] !== false;
                        return (
                            <div
                                key={opt.key}
                                onClick={() => toggleWidget(opt.key)}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-all select-none ${active
                                    ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'
                                    : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                <span className={`text-sm font-semibold ${active ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {opt.label}
                                </span>
                                <Toggle active={active} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

