// @ts-nocheck
import React, { useState } from 'react';

interface CentralCashMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    addMovement: (type: 'income' | 'expense', amount: number, description: string, paymentMethod: 'cash' | 'transfer') => Promise<{ success: boolean; error?: any }>;
}

export const CentralCashMovementModal: React.FC<CentralCashMovementModalProps> = ({
    isOpen,
    onClose,
    addMovement,
}) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
    const [processing, setProcessing] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || val <= 0 || !description) return;
        setProcessing(true);
        await addMovement(type, val, description, paymentMethod);
        setProcessing(false);
        setAmount('');
        setDescription('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">add_circle</span>
                        Nuevo Movimiento
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        <span className="material-symbols-outlined !text-[20px]">close</span>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Type selector */}
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${
                                type === 'expense'
                                    ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-sm'
                                    : 'text-slate-400'
                            }`}
                        >
                            Egreso
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${
                                type === 'income'
                                    ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm'
                                    : 'text-slate-400'
                            }`}
                        >
                            Ingreso
                        </button>
                    </div>

                    {/* Payment method selector */}
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setPaymentMethod('cash')}
                            className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${
                                paymentMethod === 'cash'
                                    ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm'
                                    : 'text-slate-400'
                            }`}
                        >
                            💰 Efectivo
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentMethod('transfer')}
                            className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${
                                paymentMethod === 'transfer'
                                    ? 'bg-white dark:bg-slate-800 text-sky-600 shadow-sm'
                                    : 'text-slate-400'
                            }`}
                        >
                            🏦 Transferencia
                        </button>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Monto</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-primary font-bold text-sm text-slate-900 dark:text-white transition-colors"
                                placeholder="0"
                                required
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Concepto del movimiento..."
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-primary font-bold text-sm text-slate-900 dark:text-white h-24 resize-none transition-colors"
                            required
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={processing || !amount || !description}
                        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                            type === 'income'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {processing ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="material-symbols-outlined !text-[18px]">
                                    {type === 'income' ? 'add' : 'remove'}
                                </span>
                                {type === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
