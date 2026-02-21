import React from 'react';

interface Sale {
    id: string;
    created_at?: string;
    time?: string;
    total: number;
    payment_method?: string;
    customer?: string;
    service?: string;
}

interface SalesSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    sales: any[];
    title?: string;
    subtitle?: string;
    onSelectSale: (sale: any) => void;
}

export const SalesSummaryModal: React.FC<SalesSummaryModalProps> = ({
    isOpen,
    onClose,
    sales,
    title = "Detalle de Ventas",
    subtitle = "Lista de transacciones registradas",
    onSelectSale
}) => {
    if (!isOpen) return null;

    const total = sales.reduce((sum, s) => sum + (s.total || s.total_amount || 0), 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700/50 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/30 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <span className="material-symbols-outlined !text-2xl">payments</span>
                            </div>
                            {title}
                        </h3>
                        <p className="text-slate-500 font-medium text-sm mt-1">{subtitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {sales.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-700">
                            <span className="material-symbols-outlined !text-6xl mb-4 opacity-20">receipt_long</span>
                            <p className="font-black uppercase tracking-[0.2em] text-[10px]">No hay ventas en este periodo</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-900/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-8 py-5">Recibo</th>
                                        <th className="px-8 py-5">Cliente</th>
                                        <th className="px-8 py-5">Items / Concepto</th>
                                        <th className="px-8 py-5 text-right">Monto</th>
                                        <th className="px-8 py-5 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                                    {sales.map((sale) => (
                                        <tr
                                            key={sale.id}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-all group"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                                        <span className="material-symbols-outlined !text-[18px]">receipt</span>
                                                    </div>
                                                    <span className="font-black text-slate-900 dark:text-white uppercase">#{sale.id.slice(0, 8)}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase">
                                                    {sale.customer || sale.customer_id || 'Cliente Gral.'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[250px]">
                                                        {sale.service || (sale.items?.map((i: any) => i.name).join(', ')) || 'Venta de productos/servicios'}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 mt-1 uppercase font-black tracking-tighter">
                                                        {sale.time || new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`text-base font-black tabular-nums ${(sale.total || sale.total_amount) === 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                                    ${(sale.total || sale.total_amount || 0).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button
                                                    onClick={() => onSelectSale(sale)}
                                                    className="size-10 flex items-center justify-center bg-primary/5 hover:bg-primary text-primary hover:text-white rounded-xl transition-all"
                                                >
                                                    <span className="material-symbols-outlined !text-xl">visibility</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/30 shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Resumen Financiero del Periodo</p>
                            <div className="flex items-baseline gap-4">
                                <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tighter">
                                    ${total.toLocaleString()}
                                </p>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{sales.length} Transacciones</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full md:w-auto px-12 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20 dark:shadow-none"
                        >
                            Cerrar Resumen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
