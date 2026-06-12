// @ts-nocheck
import React, { useState } from 'react';
import type { CentralMovement, CategorySalesData } from '@shared/hooks/useCentralCash';
import { CategorySalesModal } from '@shared/components/modals/CategorySalesModal';

interface MonthlyEntry {
    month: string;
    label: string;
    incomes: number;
    expenses: number;
    net: number;
    sessionCount: number;
    manualIncomeCount: number;
    abonos: number;
    commissionsPaid: number;
    salaryExpenses: number;
    nextDayBaseExpenses: number;
    otherExpenses: number;
}

interface CentralCashHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    movements: CentralMovement[];
    monthlySummary: MonthlyEntry[];
    loading: boolean;
    categorySales: CategorySalesData[];
    categorySalesLoading: boolean;
    fetchCategorySales: (monthKey: string) => Promise<CategorySalesData[]>;
}

export const CentralCashHistoryModal: React.FC<CentralCashHistoryModalProps> = ({
    isOpen,
    onClose,
    movements,
    monthlySummary,
    loading,
    categorySales,
    categorySalesLoading,
    fetchCategorySales,
}) => {
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set([monthlySummary[0]?.month || '']));
    const [categoryModalMonth, setCategoryModalMonth] = useState<{ month: string; label: string } | null>(null);

    if (!isOpen) return null;

    const formatCurrency = (n: number) =>
        '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const toggleMonth = (month: string) => {
        setExpandedMonths(prev => {
            const next = new Set(prev);
            if (next.has(month)) {
                next.delete(month);
            } else {
                next.add(month);
                fetchCategorySales(month);
            }
            return next;
        });
    };

    return (
        <>
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">📋 Historial de Movimientos</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {monthlySummary.length} meses registrados
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
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 py-4 space-y-3">
                        {loading && movements.length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            </div>
                        ) : monthlySummary.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <span className="material-symbols-outlined !text-[48px] opacity-30">receipt_long</span>
                                <p className="text-sm font-semibold mt-2">Sin movimientos aún</p>
                            </div>
                        ) : (
                            monthlySummary.map(month => {
                                const isExpanded = expandedMonths.has(month.month);
                                return (
                                    <div key={month.month} className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <button
                                            onClick={() => toggleMonth(month.month)}
                                            className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-slate-400 !text-[18px] transition-transform duration-200"
                                                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                    chevron_right
                                                </span>
                                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{month.label}</span>
                                            </div>
                                            <div className="flex items-center gap-3 ml-7 sm:ml-0 text-xs">
                                                <span className="text-emerald-600 font-bold">+{formatCurrency(month.incomes)}</span>
                                                <span className="text-rose-600 font-bold">−{formatCurrency(month.expenses)}</span>
                                                <span className={`font-black ${month.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {month.net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(month.net))}
                                                </span>
                                            </div>
                                        </button>
                                        {isExpanded && (
                                            <div className="px-4 pb-4 space-y-3 border-t border-slate-200 dark:border-slate-700 pt-3 animate-in slide-in-from-top-2">
                                                {/* Entradas */}
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">📥 Entradas del Mes</p>
                                                    <div className="bg-slate-100 dark:bg-slate-900/30 rounded-lg p-3 space-y-1">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-500">Cierres de Turno ({month.sessionCount} sesiones)</span>
                                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                                {formatCurrency(movements.filter(m => m.type === 'income' && m.session_id && (m.created_at || '').startsWith(month.month)).reduce((s, m) => s + m.amount, 0))}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-500">Manuales ({month.manualIncomeCount})</span>
                                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                                {formatCurrency(movements.filter(m => m.type === 'income' && !m.session_id && (m.created_at || '').startsWith(month.month) && !(m.description || '').toLowerCase().includes('abono crédito')).reduce((s, m) => s + m.amount, 0))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {month.abonos > 0 && (
                                                        <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                                                            💡 Abonos incluidos en cierres: +{formatCurrency(month.abonos)}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Gastos */}
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">📤 Gastos del Mes</p>
                                                    <div className="bg-slate-100 dark:bg-slate-900/30 rounded-lg p-3 space-y-1">
                                                        {month.commissionsPaid > 0 && (
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-slate-500">💰 Comisiones Pagadas a Trabajadores</span>
                                                                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">−{formatCurrency(month.commissionsPaid)}</span>
                                                            </div>
                                                        )}
                                                        {month.salaryExpenses > 0 && (
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-slate-500">👷 Salarios / Adelantos / Préstamos</span>
                                                                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">−{formatCurrency(month.salaryExpenses)}</span>
                                                            </div>
                                                        )}
                                                        {month.nextDayBaseExpenses > 0 && (
                                                            <div className="flex justify-between text-xs bg-amber-50 dark:bg-amber-900/20 -mx-1 px-1 py-0.5 rounded">
                                                                <span className="text-amber-700 dark:text-amber-400">💵 Base Próximo Día (retenido en caja)</span>
                                                                <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">−{formatCurrency(month.nextDayBaseExpenses)}</span>
                                                            </div>
                                                        )}
                                                        {month.otherExpenses > 0 && (
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-slate-500">📌 Otros Egresos Manuales</span>
                                                                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">−{formatCurrency(month.otherExpenses)}</span>
                                                            </div>
                                                        )}
                                                        {month.expenses === 0 && (
                                                            <p className="text-xs text-slate-400 italic">Sin gastos este mes</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Analytics */}
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">📊 Ventas por Categoría</p>
                                                    {categorySalesLoading ? (
                                                        <div className="flex justify-center py-3">
                                                            <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                                        </div>
                                                    ) : (categorySales && categorySales.length > 0) ? (
                                                        <>
                                                            <div className="bg-slate-100 dark:bg-slate-900/30 rounded-lg divide-y divide-slate-200 dark:divide-slate-700/50">
                                                                {categorySales.slice(0, 5).map(cat => (
                                                                    <div key={cat.categoryId} className="flex justify-between px-3 py-2 text-xs">
                                                                        <span className="text-slate-600 dark:text-slate-400">{cat.categoryName}</span>
                                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                                            {formatCurrency(cat.totalAmount)}
                                                                            <span className="text-[9px] text-slate-400 ml-1">{cat.percentage}%</span>
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <button
                                                                onClick={() => setCategoryModalMonth({ month: month.month, label: month.label })}
                                                                className="mt-2 w-full py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                                            >
                                                                Ver detalle completo →
                                                            </button>
                                                        </>
                                                    ) : month.sessionCount > 0 ? (
                                                        <button
                                                            onClick={() => fetchCategorySales(month.month)}
                                                            className="text-xs font-bold text-primary hover:bg-primary/5 rounded-lg py-1 px-2 transition-colors"
                                                        >
                                                            Cargar analytics
                                                        </button>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400 italic">Sin sesiones cerradas.</p>
                                                    )}
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
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>

            {/* Nested CategorySalesModal */}
            <CategorySalesModal
                isOpen={!!categoryModalMonth}
                onClose={() => setCategoryModalMonth(null)}
                monthLabel={categoryModalMonth?.label || ''}
                categoryData={categorySales || []}
                loading={categorySalesLoading}
            />
        </>
    );
};
