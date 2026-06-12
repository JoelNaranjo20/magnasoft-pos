import React, { useState } from 'react';
import type { CategorySalesData } from '@shared/hooks/useCentralCash';

interface CategorySalesModalProps {
    isOpen: boolean;
    onClose: () => void;
    monthLabel: string;
    categoryData: CategorySalesData[];
    loading?: boolean;
}

export const CategorySalesModal: React.FC<CategorySalesModalProps> = ({
    isOpen,
    onClose,
    monthLabel,
    categoryData,
    loading = false,
}) => {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const grandTotal = categoryData.reduce((s, c) => s + c.totalAmount, 0);
    const formatCurrency = (n: number) =>
        '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const toggleCategory = (catId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            next.has(catId) ? next.delete(catId) : next.add(catId);
            return next;
        });
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">📊 Ventas de {monthLabel}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Total vendido en el mes: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(grandTotal)}</span>
                            {' · '}{categoryData.length} categorías
                            {' · '}{categoryData.reduce((s, c) => s + c.services.length, 0)} servicios
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        <span className="material-symbols-outlined !text-[20px]">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : categoryData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <span className="material-symbols-outlined !text-[48px] opacity-30">bar_chart</span>
                            <p className="text-sm font-semibold mt-2">Sin datos de ventas para este mes</p>
                            <p className="text-xs mt-1">No se encontraron ventas completadas en el período.</p>
                        </div>
                    ) : (
                        categoryData.map(cat => {
                            const isExpanded = expandedCategories.has(cat.categoryId);
                            const barWidth = Math.max(2, Math.round(cat.percentage));
                            return (
                                <div key={cat.categoryId} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <button
                                        onClick={() => toggleCategory(cat.categoryId)}
                                        className="w-full p-4 hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors text-left"
                                    >
                                        {/* Category header */}
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-slate-400 !text-[18px] transition-transform duration-200"
                                                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                    chevron_right
                                                </span>
                                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                    {cat.categoryIcon && <span className="mr-1">{cat.categoryIcon}</span>}
                                                    {cat.categoryName}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                    {formatCurrency(cat.totalAmount)}
                                                </span>
                                                <span className="text-[10px] text-slate-400 ml-2">
                                                    ({cat.percentage}%)
                                                </span>
                                            </div>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                                                style={{ width: `${barWidth}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {cat.salesCount} ventas · {cat.services.length} servicios
                                        </p>
                                    </button>

                                    {/* Services list (expanded) */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50 animate-in slide-in-from-top-2 duration-200">
                                            {cat.services.map(svc => (
                                                <div key={svc.serviceId} className="flex items-center justify-between py-2.5 px-4 ml-8 text-xs">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">{svc.serviceName}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            {svc.quantity} × {formatCurrency(svc.avgPrice)} c/u
                                                        </p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-4">
                                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                            {formatCurrency(svc.totalAmount)}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400">{Math.round((svc.totalAmount / cat.totalAmount) * 100)}% de la categoría</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end px-6 pb-5 pt-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
