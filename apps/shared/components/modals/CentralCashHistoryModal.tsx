// @ts-nocheck
import React, { useState } from 'react';
import type { DetailItem, CategorySalesData } from '@shared/hooks/useCentralCash';

interface MonthlyBreakdown {
    month: string;
    label: string;
    cashIngresos: DetailItem[];
    transferIngresos: DetailItem[];
    egresos: DetailItem[];
    totalCash: number;
    totalTransfer: number;
    totalEgresos: number;
    neto: number;
}

interface CentralCashHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    monthlyBreakdown: MonthlyBreakdown[];
    categorySales: CategorySalesData[];
    serviceSalesCount: { name: string; quantity: number }[];
    fetchCategorySales: (monthKey: string) => Promise<CategorySalesData[]>;
    categorySalesLoading: boolean;
    loading?: boolean;
}

export const CentralCashHistoryModal: React.FC<CentralCashHistoryModalProps> = ({
    isOpen, onClose,
    monthlyBreakdown, categorySales, serviceSalesCount,
    fetchCategorySales, categorySalesLoading,
    loading = false,
}) => {
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set([monthlyBreakdown[0]?.month || '']));

    if (!isOpen) return null;

    const formatCurrency = (n: number) =>
        '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const formatDate = (d?: string) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const toggleMonth = (month: string) => {
        setExpandedMonths(prev => {
            const next = new Set(prev);
            if (next.has(month)) { next.delete(month); }
            else { next.add(month); fetchCategorySales(month); }
            return next;
        });
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[88vh] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">📋 Historial Completo</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{monthlyBreakdown.length} meses registrados</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <span className="material-symbols-outlined !text-[20px]">close</span>
                    </button>
                </div>

                {/* Body — acordeones por mes */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 py-4 space-y-3">
                    {loading && monthlyBreakdown.length === 0 ? (
                        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
                    ) : monthlyBreakdown.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <span className="material-symbols-outlined !text-[48px] opacity-30">receipt_long</span>
                            <p className="text-sm font-semibold mt-2">Sin movimientos aún</p>
                        </div>
                    ) : (
                        monthlyBreakdown.map(mb => {
                            const isExpanded = expandedMonths.has(mb.month);
                            const totalIngresos = mb.totalCash + mb.totalTransfer;

                            return (
                                <div key={mb.month} className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    {/* ── Acordeón header (colapsado: totales) ── */}
                                    <button
                                        onClick={() => toggleMonth(mb.month)}
                                        className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 justify-between p-3 md:p-4 hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-400 !text-[18px] transition-transform duration-200"
                                                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                chevron_right
                                            </span>
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{mb.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3 ml-7 sm:ml-0 text-xs">
                                            <span className="text-emerald-600 font-bold">+{formatCurrency(totalIngresos)}</span>
                                            <span className="text-rose-600 font-bold">−{formatCurrency(mb.totalEgresos)}</span>
                                            <span className={`font-black ${mb.neto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {mb.neto >= 0 ? '+' : '−'}{formatCurrency(Math.abs(mb.neto))}
                                            </span>
                                        </div>
                                    </button>

                                    {/* ── Acordeón expandido: detalle 2 columnas ── */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4 animate-in slide-in-from-top-2">
                                            {/* 2 Columnas: Ingresos Efectivo + Transferencia */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Ingresos Efectivo */}
                                                <div className="bg-emerald-50/50 dark:bg-emerald-900/5 rounded-xl border border-emerald-200 dark:border-emerald-800/30 overflow-hidden">
                                                    <div className="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800/30 flex justify-between items-center">
                                                        <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase">💰 Ingresos Efectivo</h3>
                                                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(mb.totalCash)}</span>
                                                    </div>
                                                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                                        {mb.cashIngresos.length === 0 ? (
                                                            <p className="text-[10px] text-slate-400 italic p-3 text-center">Sin ingresos en efectivo</p>
                                                        ) : (
                                                            mb.cashIngresos.map((item, i) => (
                                                                <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-emerald-100 dark:border-emerald-800/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors">
                                                                    <div className="min-w-0 flex-1 mr-2">
                                                                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{item.label}</p>
                                                                        {item.date && <p className="text-[9px] text-slate-400">{formatDate(item.date)}</p>}
                                                                    </div>
                                                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums flex-shrink-0">+{formatCurrency(item.amount)}</span>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Ingresos Transferencia */}
                                                <div className="bg-sky-50/50 dark:bg-sky-900/5 rounded-xl border border-sky-200 dark:border-sky-800/30 overflow-hidden">
                                                    <div className="px-3 py-2 bg-sky-100 dark:bg-sky-900/20 border-b border-sky-200 dark:border-sky-800/30 flex justify-between items-center">
                                                        <h3 className="text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase">🏦 Ingresos Transferencia</h3>
                                                        <span className="text-xs font-black text-sky-700 dark:text-sky-400 tabular-nums">{formatCurrency(mb.totalTransfer)}</span>
                                                    </div>
                                                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                                        {mb.transferIngresos.length === 0 ? (
                                                            <p className="text-[10px] text-slate-400 italic p-3 text-center">Sin ingresos por transferencia</p>
                                                        ) : (
                                                            mb.transferIngresos.map((item, i) => (
                                                                <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-sky-100 dark:border-sky-800/10 hover:bg-sky-50 dark:hover:bg-sky-900/10 transition-colors">
                                                                    <div className="min-w-0 flex-1 mr-2">
                                                                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{item.label}</p>
                                                                        {item.date && <p className="text-[9px] text-slate-400">{formatDate(item.date)}</p>}
                                                                    </div>
                                                                    <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 tabular-nums flex-shrink-0">+{formatCurrency(item.amount)}</span>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Egresos */}
                                            <div className="bg-rose-50/50 dark:bg-rose-900/5 rounded-xl border border-rose-200 dark:border-rose-800/30 overflow-hidden">
                                                <div className="px-3 py-2 bg-rose-100 dark:bg-rose-900/20 border-b border-rose-200 dark:border-rose-800/30 flex justify-between items-center">
                                                    <h3 className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase">📤 Egresos</h3>
                                                    <span className="text-xs font-black text-rose-700 dark:text-rose-400 tabular-nums">−{formatCurrency(mb.totalEgresos)}</span>
                                                </div>
                                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    {mb.egresos.length === 0 ? (
                                                        <p className="text-[10px] text-slate-400 italic p-3 text-center">Sin egresos</p>
                                                    ) : (
                                                        mb.egresos.map((item, i) => (
                                                            <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-rose-100 dark:border-rose-800/10 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors">
                                                                <div className="min-w-0 flex-1 mr-2">
                                                                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{item.label}</p>
                                                                    {item.date && <p className="text-[9px] text-slate-400">{formatDate(item.date)}</p>}
                                                                </div>
                                                                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 tabular-nums flex-shrink-0">−{formatCurrency(item.amount)}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            {/* Ventas por Categoría (cargar al expandir) */}
                                            <div>
                                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">📊 Ventas por Categoría</p>
                                                {categorySalesLoading ? (
                                                    <div className="flex justify-center py-3"><div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
                                                ) : (categorySales && categorySales.length > 0) ? (
                                                    <div className="bg-slate-100 dark:bg-slate-900/30 rounded-lg divide-y divide-slate-200 dark:divide-slate-700/50">
                                                        {categorySales.map(cat => (
                                                            <div key={cat.categoryId} className="flex items-center justify-between px-3 py-2 text-xs">
                                                                <div className="flex-1 min-w-0 mr-3">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.categoryName}</span>
                                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(cat.totalAmount)}</span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full" style={{ width: `${Math.max(2, Math.round(cat.percentage))}%` }} />
                                                                    </div>
                                                                    <p className="text-[9px] text-slate-400 mt-0.5">{cat.percentage}% · {cat.services.length} servicios</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-slate-400 italic">Cargar analytics →</p>
                                                )}
                                            </div>

                                            {/* Servicios Vendidos (cantidad) */}
                                            {serviceSalesCount.length > 0 && (
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">🔢 Servicios Vendidos (cantidad)</p>
                                                    <div className="bg-slate-100 dark:bg-slate-900/30 rounded-lg divide-y divide-slate-200 dark:divide-slate-700/50 max-h-[150px] overflow-y-auto custom-scrollbar">
                                                        {serviceSalesCount.map((svc, i) => (
                                                            <div key={i} className="flex justify-between items-center px-3 py-1.5 text-xs">
                                                                <span className="font-medium text-slate-700 dark:text-slate-300">{svc.name}</span>
                                                                <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{svc.quantity} ventas</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Neto del mes */}
                                            <div className={`p-3 rounded-lg flex justify-between items-center text-sm font-bold ${mb.neto >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400'}`}>
                                                <span>Neto de {mb.label}</span>
                                                <span className="text-lg tabular-nums">{mb.neto >= 0 ? '' : '−'}{formatCurrency(Math.abs(mb.neto))}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end px-6 pb-5 pt-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
