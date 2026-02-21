import { useDashboardConfig } from '../../hooks/useDashboardConfig';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { LayoutDashboard, BarChart3, List } from 'lucide-react';

export const DashboardSettings = () => {
    const { config, toggleWidget, loading } = useDashboardConfig();
    const business = useBusinessStore(state => state.business);

    if (loading) return <div className="h-40 bg-gray-50 animate-pulse rounded-xl" />;

    const options = [
        {
            key: 'show_summary' as const,
            label: 'Resumen Operativo',
            desc: 'Totales de dinero, servicios y productos.',
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
        }
    ];

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((opt) => (
                    <div
                        key={opt.key}
                        onClick={() => toggleWidget(opt.key)}
                        className={`
              flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all select-none
              ${config[opt.key]
                                ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'
                                : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}
            `}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${config[opt.key] ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                                <opt.icon size={18} />
                            </div>
                            <div>
                                <p className={`font-semibold text-sm ${config[opt.key] ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {opt.label}
                                </p>
                            </div>
                        </div>

                        {/* Switch Visual (CSS Puro) */}
                        <div className={`
              w-10 h-6 rounded-full p-1 transition-colors duration-200 flex items-center
              ${config[opt.key] ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}
            `}>
                            <div className={`
                bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200
                ${config[opt.key] ? 'translate-x-4' : 'translate-x-0'}
              `} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
