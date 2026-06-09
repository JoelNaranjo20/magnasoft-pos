import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface CombinedDebt {
    id: string;
    type: 'customer' | 'worker';
    name: string;
    total_amount: number;
    remaining_amount: number;
    status: string;
    date: string;
    id_ref: string;
    description?: string;
    customer_id?: string;
    worker_id?: string;
}

interface EditDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: CombinedDebt | null;
    onSaveSuccess: () => void;
}

export const EditDebtModal = ({
    isOpen,
    onClose,
    item,
    onSaveSuccess
}: EditDebtModalProps) => {
    const [name, setName] = useState('');
    const [amountStr, setAmountStr] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Calculate previously paid amount
    const totalAbonado = item ? item.total_amount - item.remaining_amount : 0;

    useEffect(() => {
        if (isOpen && item) {
            setName(item.name);
            setAmountStr(item.total_amount.toString());
            setNotes(item.description || '');
            setErrorMsg(null);
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const handleSave = async () => {
        const parsedAmount = parseFloat(amountStr);
        if (!name.trim()) {
            setErrorMsg('El nombre no puede estar vacío');
            return;
        }
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setErrorMsg('Ingresa un monto inicial válido mayor a 0');
            return;
        }
        if (parsedAmount < totalAbonado) {
            setErrorMsg(`El nuevo monto inicial no puede ser menor al total abonado previamente ($${totalAbonado.toLocaleString()})`);
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        try {
            // 1. Update name of the profile (customer or worker)
            if (item.type === 'customer' && item.customer_id) {
                const { error: nameError } = await supabase
                    .from('customers')
                    .update({ name: name.trim() })
                    .eq('id', item.customer_id);

                if (nameError) throw nameError;
            } else if (item.type === 'worker' && item.worker_id) {
                const { error: nameError } = await supabase
                    .from('workers')
                    .update({ name: name.trim() })
                    .eq('id', item.worker_id);

                if (nameError) throw nameError;
            }

            // 2. Update the debt/loan details
            if (item.type === 'customer') {
                const newRemaining = parsedAmount - totalAbonado;
                const newStatus = newRemaining === 0 ? 'paid' : (totalAbonado > 0 ? 'partial' : 'pending');

                const { error: debtError } = await supabase
                    .from('customer_debts')
                    .update({
                        amount: parsedAmount,
                        remaining_amount: newRemaining,
                        notes: notes.trim(),
                        status: newStatus
                    })
                    .eq('id', item.id);

                if (debtError) throw debtError;
            } else if (item.type === 'worker') {
                const newStatus = (parsedAmount - totalAbonado) === 0 ? 'paid' : 'pending';

                const { error: loanError } = await supabase
                    .from('worker_loans')
                    .update({
                        amount: parsedAmount,
                        notes: notes.trim(),
                        status: newStatus
                    })
                    .eq('id', item.id);

                if (loanError) throw loanError;
            }

            onSaveSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating debt record:', err);
            setErrorMsg(err.message || 'Error al actualizar el registro');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">Editar Crédito</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Corrección de Registro</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={loading}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {errorMsg && (
                    <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400">
                        {errorMsg}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                            Nombre del {item.type === 'customer' ? 'Cliente' : 'Trabajador'}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                            placeholder="Nombre..."
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:border-primary transition-all text-slate-800 dark:text-white disabled:opacity-50"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                            Monto Inicial
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">$</span>
                            <input
                                type="number"
                                value={amountStr}
                                onChange={(e) => setAmountStr(e.target.value)}
                                disabled={loading}
                                placeholder="0.00"
                                className="w-full pl-8 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:border-primary transition-all text-slate-800 dark:text-white disabled:opacity-50"
                            />
                        </div>
                        {totalAbonado > 0 && (
                            <p className="mt-1 px-1 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                Abonado previamente: <span className="text-emerald-500 font-black">${totalAbonado.toLocaleString()}</span>
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                            Notas / Concepto
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={loading}
                            rows={3}
                            placeholder="Notas descriptivas..."
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:border-primary transition-all text-slate-800 dark:text-white disabled:opacity-50 resize-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="py-4 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all uppercase tracking-wider disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="py-4 bg-primary hover:bg-[#0b6ddb] dark:hover:bg-[#3b9eff] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin border-2 border-white border-t-transparent w-4 h-4 rounded-full"></span>
                                Guardando...
                            </>
                        ) : (
                            'Guardar'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
