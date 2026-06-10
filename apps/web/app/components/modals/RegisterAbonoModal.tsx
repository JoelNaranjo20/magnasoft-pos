'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface RegisterAbonoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface CustomerDebt {
    id: string;
    customer_id: string;
    remaining_amount: number;
    created_at: string;
    customer: { name: string; phone: string };
}

export const RegisterAbonoModal = ({ isOpen, onClose, onSuccess }: RegisterAbonoModalProps) => {
    const [loading, setLoading] = useState(false);
    const [debts, setDebts] = useState<CustomerDebt[]>([]);
    const [selectedDebtId, setSelectedDebtId] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('transfer');
    const [notes, setNotes] = useState('');
    const { user, profile } = useAuth();

    const selectedDebt = debts.find(d => d.id === selectedDebtId) ?? null;

    useEffect(() => {
        if (isOpen) {
            fetchDebts();
        }
    }, [isOpen]);

    const fetchDebts = async () => {
        try {
            const { data, error } = await supabase
                .from('customer_debts')
                .select(`
                    id,
                    customer_id,
                    remaining_amount,
                    created_at,
                    customer:customers(name, phone)
                `)
                .gt('remaining_amount', 0)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDebts(data as any[] || []);
        } catch (error) {
            console.error('Error fetching debts:', error);
        }
    };

    const handleSubmit = async () => {
        if (!selectedDebtId || !amount) return;

        setLoading(true);
        try {
            const numAmount = parseFloat(amount);

            if (!selectedDebt) throw new Error('Deuda no encontrada');
            if (numAmount > selectedDebt.remaining_amount) {
                alert('El monto no puede superar el saldo pendiente');
                return;
            }

            // All customer debt payments always go to Central Cash
            const goToCentral = true;

            const { data, error } = await supabase.rpc('process_debt_payment', {
                p_debt_id: selectedDebtId,
                p_amount: numAmount,
                p_payment_method: paymentMethod,
                p_cash_session_id: null,
                p_notes: notes || `Abono de ${selectedDebt.customer.name} (Web)`
            });

            if (error) throw error;

            // The function returns a single JSON object (RETURNS json)
            const result = data;
            if (result?.success) {
                // Register in Central Cash if needed
                if (goToCentral) {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    const { error: centralError } = await (supabase as any)
                        .from('central_cash_movements')
                        .insert({
                            type: 'income',
                            amount: numAmount,
                            payment_method: paymentMethod,
                            description: `Abono crédito - ${selectedDebt.customer.name} (${new Date(selectedDebt.created_at).toLocaleDateString()})`,
                            user_id: authUser?.id,
                            business_id: profile?.business_id,
                        });

                    if (centralError) {
                        console.error('⚠️ Error registering in Central Cash:', centralError);
                    } else {
                        console.log('✅ Abono registered in Central Cash (web)');
                    }
                }

                alert('Abono registrado con éxito');
                onSuccess?.();
                onClose();
            } else {
                alert(result?.message || 'Error al procesar el pago');
            }
        } catch (error: any) {
            console.error('Error registering abono:', error);
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary !text-3xl">add_card</span>
                            Registrar <span className="text-primary">Abono</span>
                        </h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Ingreso por Transferencia / Otros</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-slate-400">close</span>
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Customer Selection */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Seleccionar Cliente</label>
                        <select
                            value={selectedDebtId}
                            onChange={(e) => setSelectedDebtId(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-slate-900 dark:text-white"
                        >
                            <option value="">Seleccione un cliente con deuda...</option>
                            {debts.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.customer.name} - Pendiente: ${d.remaining_amount.toLocaleString()}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Monto del Pago</label>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black text-lg">$</span>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-10 pr-5 py-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-2xl text-slate-900 dark:text-white placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Método de Pago</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'transfer', label: 'Transf.', icon: 'account_balance' },
                                { id: 'cash', label: 'Efectivo', icon: 'payments' },
                                { id: 'card', label: 'Tarjeta', icon: 'credit_card' }
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setPaymentMethod(m.id as any)}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === m.id
                                        ? 'bg-primary/5 border-primary text-primary shadow-inner shadow-primary/10'
                                        : 'bg-slate-50 dark:bg-slate-900/50 border-transparent text-slate-500 hover:border-slate-200'
                                        }`}
                                >
                                    <span className="material-symbols-outlined !text-[20px]">{m.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* All payments always go to Central Cash */}

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Notas (Opcional)</label>
                        <textarea
                            placeholder="Referencia, número de transferencia..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-slate-900 dark:text-white text-sm min-h-[80px]"
                        />
                    </div>
                </div>

                <div className="p-8 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/50">
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !selectedDebtId || !amount}
                        className="w-full py-5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest text-sm"
                    >
                        {loading ? 'Procesando...' : 'Confirmar Registro'}
                    </button>
                </div>
            </div>
        </div>
    );
};
