import React from 'react';

interface CashMovement {
    id: string;
    created_at: string;
    amount: number;
    type: 'income' | 'expense';
    description: string;
    reason?: string;
    user_id?: string;
}

interface CashMovementsModalProps {
    isOpen: boolean;
    onClose: () => void;
    movements: CashMovement[];
    title?: string;
    subtitle?: string;
    type?: 'income' | 'expense';
}

export const CashMovementsModal: React.FC<CashMovementsModalProps> = ({
    isOpen,
    onClose,
    movements,
    title,
    subtitle,
    type = 'expense'
}) => {
    if (!isOpen) return null;

    const filteredMovements = movements.filter(m => m.type === type);
    const total = filteredMovements.reduce((sum, m) => sum + m.amount, 0);

    const isIncome = type === 'income';
    const defaultTitle = isIncome ? "Movimientos de Entrada" : "Movimientos de Salida";
    const defaultSubtitle = isIncome ? "Detalle de ingresos manuales y aportes" : "Detalle de egresos, pagos de nómina y liquidaciones";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <span className={`material-symbols-outlined !text-3xl ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isIncome ? 'download' : 'upload'}
                            </span>
                            {title || defaultTitle}
                        </h3>
                        <p className="text-slate-500 font-medium text-sm mt-1">{subtitle || defaultSubtitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {filteredMovements.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined !text-6xl mb-4 opacity-20">receipt_long</span>
                            <p className="font-bold uppercase tracking-widest text-xs">No hay movimientos de {isIncome ? 'entrada' : 'salida'}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredMovements.map((mov) => (
                                <div
                                    key={mov.id}
                                    className={`flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700/50 hover:border-${isIncome ? 'emerald' : 'rose'}-200 dark:hover:border-${isIncome ? 'emerald' : 'rose'}-900/30 transition-all group`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl ${isIncome ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <span className="material-symbols-outlined !text-2xl">
                                                {isIncome ? 'trending_up' : 'trending_down'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5">Concepto:</p>
                                            <p className="font-bold text-slate-800 dark:text-slate-200 capitalize text-sm mb-1">
                                                {mov.description || (isIncome ? 'Ingreso sin descripción' : 'Egreso sin descripción')}
                                            </p>
                                            {mov.reason && mov.reason !== mov.description && (
                                                <p className="text-xs text-slate-500 italic mb-1">"{mov.reason}"</p>
                                            )}
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-[12px]">schedule</span>
                                                {new Date(mov.created_at).toLocaleString('es-ES', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-lg font-black ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {isIncome ? '+' : '-'}${mov.amount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / Summary */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Total {isIncome ? 'Entradas' : 'Egresos'}</span>
                        <div className="flex flex-col items-end">
                            <span className={`text-2xl font-black ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                ${total.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
