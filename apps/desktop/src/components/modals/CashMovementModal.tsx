import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface CashMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'income' | 'expense';
}

type Mode = 'income' | 'expense' | 'favor';
type FavorDirection = 'transfer_to_cash' | 'cash_to_transfer';

export const CashMovementModal = ({ isOpen, onClose, type }: CashMovementModalProps) => {
    const [mode, setMode] = useState<Mode>(type);
    const [favorDirection, setFavorDirection] = useState<FavorDirection>('transfer_to_cash');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const cashSession = useSessionStore((state) => state.cashSession);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
            setMode(type);
            setFavorDirection('transfer_to_cash');
        }
    }, [isOpen, type]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            alert('Ingresa un monto válido.');
            setLoading(false);
            return;
        }
        if (!cashSession) {
            alert('No hay una sesión de caja abierta.');
            setLoading(false);
            return;
        }
        const businessId = useBusinessStore.getState().id;
        try {
            if (mode === 'favor') {
                const movements = favorDirection === 'transfer_to_cash' 
                ? [
                    {
                        session_id: cashSession.id,
                        business_id: businessId,
                        type: 'income',
                        amount: numericAmount,
                        payment_method: 'transfer',
                        description: `[Canje] Transferencia recibida${description ? ': ' + description : ''}`,
                    },
                    {
                        session_id: cashSession.id,
                        business_id: businessId,
                        type: 'expense',
                        amount: numericAmount,
                        payment_method: 'cash',
                        description: `[Canje] Efectivo entregado${description ? ': ' + description : ''}`,
                    },
                ]
                : [
                    {
                        session_id: cashSession.id,
                        business_id: businessId,
                        type: 'income',
                        amount: numericAmount,
                        payment_method: 'cash',
                        description: `[Canje] Efectivo recibido${description ? ': ' + description : ''}`,
                    },
                    {
                        session_id: cashSession.id,
                        business_id: businessId,
                        type: 'expense',
                        amount: numericAmount,
                        payment_method: 'transfer',
                        description: `[Canje] Transferencia enviada${description ? ': ' + description : ''}`,
                    },
                ];
                const { error } = await (supabase.from('cash_movements') as any).insert(movements);
                if (error) throw error;
            } else {
                const { error } = await (supabase.from('cash_movements') as any).insert({
                    session_id: cashSession.id,
                    business_id: businessId,
                    type: mode,
                    amount: numericAmount,
                    payment_method: 'cash',
                    description: description,
                });
                if (error) throw error;
            }
            onClose();
            alert('Movimiento registrado correctamente.');
        } catch (error: any) {
            console.error('Error creating movement:', error);
            alert(`Error al registrar movimiento: ${error.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className={`font-bold text-lg ${mode === 'income' ? 'text-emerald-600' : mode === 'expense' ? 'text-rose-600' : 'text-blue-600'}`}>
                        {mode === 'income' ? 'Registrar Ingreso' : mode === 'expense' ? 'Registrar Gasto' : 'Registrar Canje (Favor)'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-2 px-6 pt-4">
                    {([
                        { key: 'income', label: 'Ingreso', icon: 'add_circle' },
                        { key: 'expense', label: 'Gasto', icon: 'remove_circle' },
                        { key: 'favor', label: 'Canje', icon: 'swap_horiz' },
                    ] as { key: Mode; label: string; icon: string }[]).map(m => (
                        <button
                            key={m.key}
                            type="button"
                            onClick={() => setMode(m.key)}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${mode === m.key
                                ? m.key === 'income' ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                                    : m.key === 'expense' ? 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-900/20'
                                        : 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                                : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}
                        >
                            <span className="material-symbols-outlined !text-lg">{m.icon}</span>
                            {m.label}
                        </button>
                    ))}
                </div>

                {mode === 'favor' && (
                    <div className="mx-6 mt-4 space-y-3">
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setFavorDirection('transfer_to_cash')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${favorDirection === 'transfer_to_cash' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                            >
                                Recibí Transf. → Di Efectivo
                            </button>
                            <button
                                type="button"
                                onClick={() => setFavorDirection('cash_to_transfer')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${favorDirection === 'cash_to_transfer' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                            >
                                Recibí Efectivo → Envié Transf.
                            </button>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 leading-relaxed">
                                {favorDirection === 'transfer_to_cash' 
                                    ? <>Recibiste una <strong>transferencia</strong> y entregaste ese valor en <strong>efectivo</strong>. Suma al total de transferencias y descuenta del efectivo en caja.</>
                                    : <>Recibiste <strong>efectivo</strong> físico y enviaste una <strong>transferencia</strong> desde la cuenta. Suma al efectivo en caja y descuenta de transferencias.</>
                                }
                            </p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monto</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                required
                                min="0"
                                autoFocus
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-2.5 font-bold text-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {mode === 'favor' ? 'Descripción (Opcional)' : 'Descripción / Motivo'}
                        </label>
                        <textarea
                            required={mode !== 'favor'}
                            rows={2}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                            placeholder={mode === 'income' ? 'Ej: Devolución de cambio...' : mode === 'expense' ? 'Ej: Pago de almuerzo...' : 'Ej: Favor a Juan (opcional)...'}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${mode === 'income' ? 'bg-emerald-600' : mode === 'expense' ? 'bg-rose-600' : 'bg-blue-600'}`}
                    >
                        {loading ? 'Registrando...' : mode === 'favor' ? 'Registrar Canje' : 'Registrar Movimiento'}
                    </button>
                </form>
            </div>
        </div>
    );
};
