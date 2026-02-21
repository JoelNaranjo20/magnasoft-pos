
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface CashMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'income' | 'expense';
}

export const CashMovementModal = ({ isOpen, onClose, type }: CashMovementModalProps) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const cashSession = useSessionStore((state) => state.cashSession);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const numericAmount = parseFloat(amount);

        if (!cashSession) {
            alert('No hay una sesión de caja abierta.');
            setLoading(false);
            return;
        }

        try {
            const { error } = await (supabase.from('cash_movements') as any)
                .insert({
                    session_id: cashSession.id,
                    business_id: useBusinessStore.getState().id,
                    type: type, // 'income' or 'expense'
                    amount: numericAmount,
                    description: description,
                    user_id: null, // Escritorio usa PIN
                });

            if (error) throw error;

            onClose();
            alert('Movimiento registrado correctamente.');
        } catch (error: any) {
            console.error('Error creating movement:', error);
            alert(`Error al registrar movimiento: ${error.message || 'Error desconocido'}\n\nEs posible que necesites crear la tabla "cash_movements" en Supabase.`);
        } finally {
            setLoading(false);
        }
    };

    const title = type === 'income' ? 'Registrar Ingreso Extra' : 'Registrar Gasto Rápido';
    const colorClass = type === 'income' ? 'text-emerald-600' : 'text-rose-600';
    const bgClass = type === 'income' ? 'bg-emerald-600' : 'bg-rose-600';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className={`font-bold text-lg ${colorClass}`}>{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

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
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción / Motivo</label>
                        <textarea
                            required
                            rows={3}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                            placeholder={type === 'income' ? "Ej: Devolución de cambio..." : "Ej: Pago de almuerzo..."}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg shadow-current/20 transition-all active:scale-95 disabled:opacity-50 ${bgClass}`}
                    >
                        {loading ? 'Registrando...' : 'Registrar Movimiento'}
                    </button>
                </form>
            </div>
        </div>
    );
};
