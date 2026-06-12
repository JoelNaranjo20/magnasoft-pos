// @ts-nocheck
import React, { useState } from 'react';
import type { TrabajadorAsalariado, ComisionistaDiario, SemanaNomina } from '@shared/hooks/useCentralCash';

interface NominaDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    nominaTotal: number;
    asalariados: TrabajadorAsalariado[];
    semanas: SemanaNomina[];
    comisionistas: ComisionistaDiario[];
    loading?: boolean;
}

export const NominaDetailModal: React.FC<NominaDetailModalProps> = ({
    isOpen,
    onClose,
    nominaTotal,
    asalariados,
    semanas,
    comisionistas,
    loading = false,
}) => {
    const [expandedSemana, setExpandedSemana] = useState<number | null>(null);

    if (!isOpen) return null;

    const formatCurrency = (n: number) =>
        '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const totalComisionistas = comisionistas.reduce((s, c) => s + c.totalComisiones, 0);
    const totalGeneral = nominaTotal + totalComisionistas;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">👥 Detalle de Nómina</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Total General: <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalGeneral)}</span>
                            {' · '}Semanal: {formatCurrency(nominaTotal)} + Liquidaciones: {formatCurrency(totalComisionistas)}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <span className="material-symbols-outlined !text-[20px]">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
                    ) : (
                        <>
                            {/* ===== Nómina Semanal ===== */}
                            <div>
                                <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-5 bg-indigo-500 rounded-full" />
                                    Nómina Semanal
                                </h3>
                                {asalariados.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Sin trabajadores asalariados.</p>
                                ) : (
                                    <>
                                        {/* Semanas */}
                                        <div className="grid grid-cols-4 md:grid-cols-5 gap-2 mb-3">
                                            {semanas.map(sem => (
                                                <button key={sem.numero} onClick={() => setExpandedSemana(expandedSemana === sem.numero ? null : sem.numero)}
                                                    className={`p-2 rounded-lg text-xs font-bold transition-colors text-center ${expandedSemana === sem.numero ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10'}`}>
                                                    <p className="text-[9px] uppercase">{sem.label}</p>
                                                    <p className="text-sm tabular-nums mt-0.5">{formatCurrency(sem.subtotal)}</p>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Trabajadores asalariados */}
                                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg divide-y divide-slate-100 dark:divide-slate-700/50">
                                            {asalariados.map(w => (
                                                <div key={w.id} className="flex justify-between items-center px-3 py-2.5 text-xs">
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{w.name}</span>
                                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{formatCurrency(w.salary)}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center px-3 py-2.5 text-xs bg-indigo-50 dark:bg-indigo-900/20">
                                                <span className="font-bold text-indigo-700 dark:text-indigo-300">Total Nómina Semanal</span>
                                                <span className="font-black text-indigo-700 dark:text-indigo-300 tabular-nums">{formatCurrency(nominaTotal)}</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* ===== Liquidaciones Diarias ===== */}
                            <div className="pt-2">
                                <h3 className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-5 bg-amber-500 rounded-full" />
                                    Liquidaciones Diarias
                                </h3>
                                {comisionistas.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Sin trabajadores a comisión este mes.</p>
                                ) : (
                                    <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {comisionistas.map(c => (
                                            <div key={c.id} className="flex justify-between items-center px-3 py-2.5 text-xs">
                                                <div>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                                                    <span className="text-[9px] text-slate-400 ml-2">{c.cantidadComisiones} comisiones</span>
                                                </div>
                                                <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(c.totalComisiones)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center px-3 py-2.5 text-xs bg-amber-50 dark:bg-amber-900/20">
                                            <span className="font-bold text-amber-700 dark:text-amber-300">Total Liquidaciones</span>
                                            <span className="font-black text-amber-700 dark:text-amber-300 tabular-nums">{formatCurrency(totalComisionistas)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer con Total General */}
                <div className="px-6 py-3 border-t bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 flex justify-between items-center text-sm font-bold text-indigo-700 dark:text-indigo-400">
                    <span>Total General (Semanal + Liquidaciones)</span>
                    <span className="text-xl tabular-nums">{formatCurrency(totalGeneral)}</span>
                </div>
                <div className="flex justify-end px-6 pb-5 pt-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
