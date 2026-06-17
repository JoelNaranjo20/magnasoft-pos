// @ts-nocheck
import React from 'react';
import type { DetailItem } from '@shared/hooks/useCentralCash';

interface BonosDetalleModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: DetailItem[];
    total: number;
    loading?: boolean;
}

export const BonosDetalleModal: React.FC<BonosDetalleModalProps> = ({
    isOpen, onClose, items, total, loading = false,
}) => {
    if (!isOpen) return null;

    const formatCurrency = (n: number) =>
        '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const formatDate = (d?: string) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl max-h-[80vh] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">🎁 Bonos Entregados</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Total regalado: <span className="font-bold text-amber-600">{formatCurrency(total)}</span>
                            {' · '}{items.length} canjes
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <span className="material-symbols-outlined !text-[20px]">close</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <span className="material-symbols-outlined !text-[48px] opacity-30">card_giftcard</span>
                            <p className="text-sm font-semibold mt-2">Sin bonos entregados este mes</p>
                        </div>
                    ) : (
                        items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{item.label}</p>
                                    {item.date && <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.date)}</p>}
                                </div>
                                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums flex-shrink-0 ml-4">{formatCurrency(item.amount)}</span>
                            </div>
                        ))
                    )}
                </div>
                <div className="px-6 py-3 border-t bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 flex justify-between items-center text-sm font-bold text-amber-700 dark:text-amber-400">
                    <span>Total Regalado</span>
                    <span className="text-lg tabular-nums">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-end px-6 pb-5 pt-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30">Cerrar</button>
                </div>
            </div>
        </div>
    );
};
