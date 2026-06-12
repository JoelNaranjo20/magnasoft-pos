// @ts-nocheck
import React from 'react';
import type { DetailItem } from '@shared/hooks/useCentralCash';

interface CashDashboardDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items?: DetailItem[];
    loading?: boolean;
    // Drill-down mode: separate ingresos & egresos with neto
    showIncomes?: boolean;
    ingresos?: DetailItem[];
    egresos?: DetailItem[];
    neto?: number;
}

export const CashDashboardDetailModal: React.FC<CashDashboardDetailModalProps> = ({
    isOpen,
    onClose,
    title,
    items,
    loading = false,
    showIncomes = false,
    ingresos = [],
    egresos = [],
    neto = 0,
}) => {
    if (!isOpen) return null;

    const formatCurrency = (n: number) =>
        '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const formatDate = (d?: string) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const total = showIncomes ? neto : (items || []).reduce((s, i) => s + i.amount, 0);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl max-h-[80vh] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {showIncomes ? (
                                <>Neto: <span className={`font-bold ${neto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{neto >= 0 ? '' : '−'}{formatCurrency(Math.abs(neto))}</span></>
                            ) : (
                                <>Total: <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(total)}</span></>
                            )}
                            {' · '}{(ingresos.length + egresos.length) || (items || []).length} movimientos
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
                    ) : showIncomes ? (
                        // ── Drill-down mode: Ingresos + Egresos ──
                        <>
                            {/* Ingresos */}
                            <div>
                                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                                    Ingresos ({ingresos.length})
                                </h3>
                                {ingresos.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic pl-3">Sin ingresos este mes</p>
                                ) : (
                                    <div className="space-y-1">
                                        {ingresos.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{item.label}</p>
                                                    {item.date && <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.date)}</p>}
                                                </div>
                                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums flex-shrink-0 ml-4">+{formatCurrency(item.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Egresos */}
                            <div className="pt-2">
                                <h3 className="text-xs font-black text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-rose-500 rounded-full" />
                                    Egresos ({egresos.length})
                                </h3>
                                {egresos.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic pl-3">Sin egresos este mes</p>
                                ) : (
                                    <div className="space-y-1">
                                        {egresos.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{item.label}</p>
                                                    {item.date && <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.date)}</p>}
                                                </div>
                                                <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums flex-shrink-0 ml-4">−{formatCurrency(item.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        // ── Simple mode (egresos only) ──
                        (items || []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <span className="material-symbols-outlined !text-[48px] opacity-30">receipt_long</span>
                                <p className="text-sm font-semibold mt-2">Sin movimientos este mes</p>
                            </div>
                        ) : (
                            (items || []).map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{item.label}</p>
                                        {item.date && <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.date)}</p>}
                                    </div>
                                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums flex-shrink-0 ml-4">−{formatCurrency(item.amount)}</span>
                                </div>
                            ))
                        )
                    )}
                </div>

                {/* Footer */}
                {showIncomes && (
                    <div className={`px-6 py-3 border-t flex justify-between items-center text-sm font-bold ${neto >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'}`}>
                        <span>Neto del Mes</span>
                        <span className="text-lg tabular-nums">{neto >= 0 ? '' : '−'}{formatCurrency(Math.abs(neto))}</span>
                    </div>
                )}
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
