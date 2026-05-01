import React, { useState, useMemo } from 'react';

interface Sale {
    id: string;
    created_at: string;
    total_amount: number;
    payment_method: string;
    customer?: { name: string };
    vehicle?: { license_plate: string, type: string };
    items?: any[];
}

interface SalesSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    sales: Sale[];
    title?: string;
    subtitle?: string;
    onSelectSale: (sale: Sale) => void;
    additionalIncome?: number;
}

export const SalesSummaryModal: React.FC<SalesSummaryModalProps> = ({
    isOpen,
    onClose,
    sales,
    title = "Detalle de Ventas",
    subtitle = "Lista de transacciones realizadas en el periodo",
    onSelectSale,
    additionalIncome = 0
}) => {
    const [filterBy, setFilterBy] = useState<string>('all');

    const categories = useMemo(() => {
        const cats = new Set<string>();
        sales.forEach(sale => {
            sale.items?.forEach(item => {
                if (item.service_id) {
                    const catName = typeof item.service?.category === 'string'
                        ? item.service.category
                        : (item.service?.category?.name || 'Servicios (Sin Categoría)');
                    cats.add(catName);
                }
            });
        });
        return Array.from(cats).sort();
    }, [sales]);

    const filteredSales = useMemo(() => {
        if (filterBy === 'all') return sales;

        return sales.map(sale => {
            // Filtrar los items de la venta que coincidan con el filtro
            const matchingItems = sale.items?.filter(item => {
                if (filterBy === 'products') {
                    return !!item.product_id;
                } else {
                    // Filtrar por categoría de servicio
                    if (item.product_id) return false;
                    const catName = typeof item.service?.category === 'string'
                        ? item.service.category
                        : (item.service?.category?.name || 'Servicios (Sin Categoría)');
                    return catName === filterBy;
                }
            }) || [];

            if (matchingItems.length === 0) return null; // No matching items in this sale

            // Calcular el nuevo total de la venta basado solo en los items que coinciden
            // Nota: En la base de datos la tabla `items` o `sale_items` tiene `unit_price` y `quantity`.
            const newTotal = matchingItems.reduce((sum, item) => {
                const price = typeof item.unit_price === 'number' ? item.unit_price : 0;
                const qty = item.quantity || 1;
                return sum + (price * qty);
            }, 0);

            return {
                ...sale,
                items: matchingItems,
                // Usar el total recalculado o el original si no podemos recalcular
                total_amount: matchingItems.length === sale.items?.length ? sale.total_amount : newTotal
            };
        }).filter(Boolean) as Sale[];
    }, [sales, filterBy]);

    if (!isOpen) return null;

    const total = filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header & Filters */}
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <span className="material-symbols-outlined !text-3xl text-emerald-500">payments</span>
                                {title}
                            </h3>
                            <p className="text-slate-500 font-medium text-sm mt-1">{subtitle}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 !text-sm pointer-events-none">filter_alt</span>
                                <select
                                    value={filterBy}
                                    onChange={(e) => setFilterBy(e.target.value)}
                                    className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary appearance-none cursor-pointer"
                                >
                                    <option value="all">Todas las Ventas</option>
                                    <option value="products">📦 Productos (Inventario)</option>
                                    {categories.length > 0 && <optgroup label="Servicios" />}
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>🛠️ {cat}</option>
                                    ))}
                                </select>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 !text-sm pointer-events-none">expand_more</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 shrink-0"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    {filteredSales.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined !text-6xl mb-4 opacity-20">receipt_long</span>
                            <p className="font-bold uppercase tracking-widest text-xs">No hay ventas registradas {filterBy !== 'all' && 'con este filtro'}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-y border-slate-100 dark:border-slate-800">
                                        <th className="px-6 py-3">Recibo</th>
                                        <th className="px-6 py-3">Cliente / Vehículo</th>
                                        <th className="px-4 py-3 text-center">Pago</th>
                                        <th className="px-4 py-3">Concepto</th>
                                        <th className="px-4 py-3 text-right">Monto</th>
                                        <th className="px-4 py-3 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                                    {filteredSales.map((sale) => (
                                        <tr
                                            key={sale.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined !text-[16px] text-slate-400">receipt</span>
                                                    <span className="font-bold text-slate-900 dark:text-white">#{sale.id.slice(0, 8)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined !text-[14px] text-slate-400">person</span>
                                                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{sale.customer?.name || 'Cliente Gral.'}</span>
                                                    </div>
                                                    {sale.vehicle && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-black text-white flex items-center gap-1 relative overflow-hidden">
                                                                <span className="w-full h-0.5 bg-yellow-400 absolute top-0 left-0 right-0"></span>
                                                                {sale.vehicle.license_plate}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {sale.payment_method === 'mixed' ? (
                                                    <span className="inline-flex flex-col items-center gap-0.5">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 dark:bg-violet-900/30 flex items-center gap-1">
                                                            <span className="material-symbols-outlined !text-[10px]">shuffle</span>
                                                            Mixto
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-bold">
                                                            {(sale as any).cash_amount > 0 && <span className="mr-1">💵{((sale as any).cash_amount||0).toLocaleString()}</span>}
                                                            {(((sale as any).card_amount||0)+((sale as any).transfer_amount||0)) > 0 && <span>📲{(((sale as any).card_amount||0)+((sale as any).transfer_amount||0)).toLocaleString()}</span>}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${sale.payment_method === 'credit'
                                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30'
                                                            : sale.payment_method === 'transfer'
                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                                                                : sale.payment_method === 'card'
                                                                    ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30'
                                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
                                                        }`}>
                                                        {sale.payment_method === 'credit' ? '📋 Fiado'
                                                            : sale.payment_method === 'transfer' ? '📲 Transf.'
                                                                : sale.payment_method === 'card' ? '💳 Tarjeta'
                                                                    : '💵 Efectivo'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 max-w-[200px]">
                                                <span className="text-slate-500 font-bold truncate block">
                                                    {sale.items?.map((i: any) => i.name).join(', ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                                    ${(sale.total_amount || 0).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button
                                                    onClick={() => onSelectSale(sale)}
                                                    className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-all"
                                                >
                                                    <span className="material-symbols-outlined">visibility</span>
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
                <div className="p-6 md:p-8 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                                {filterBy === 'all' ? 'Total Ventas' : `Total Filtrado`} ({filteredSales.length})
                            </p>
                            {additionalIncome > 0 && filterBy === 'all' && (
                                <p className="text-sm font-black text-slate-500 uppercase">
                                    + Abonos: ${additionalIncome.toLocaleString()}
                                </p>
                            )}
                            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                                ${(total + (filterBy === 'all' ? additionalIncome : 0)).toLocaleString()}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
