
import React, { useState } from 'react';
import { useCentralCash } from '../../hooks/useCentralCash';

interface CentralCashModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CentralCashModal: React.FC<CentralCashModalProps> = ({ isOpen, onClose }) => {
    const { movements, balance, loading, addMovement } = useCentralCash();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [processing, setProcessing] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || val <= 0 || !description) return;

        setProcessing(true);
        const res = await addMovement(type, val, description);
        setProcessing(false);

        if (res.success) {
            setAmount('');
            setDescription('');
        } else {
            alert('Error al registrar movimiento');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 flex flex-col md:flex-row h-[90vh] md:h-auto md:max-h-[85vh]">

                {/* Left Side: Summary & Form */}
                <div className="w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                    <div className="mb-8">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary !text-3xl">account_balance</span>
                            Caja Central
                        </h3>
                        <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">Tesorería Principal</p>
                    </div>

                    <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl mb-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/20 transition-all"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Saldo Disponible</p>
                        <h2 className="text-4xl font-black tabular-nums relative z-10">${balance.toLocaleString()}</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setType('expense')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${type === 'expense' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-sm' : 'text-slate-400'}`}
                            >
                                Egreso
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('income')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${type === 'income' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-slate-400'}`}
                            >
                                Ingreso
                            </button>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-primary font-bold text-slate-900 dark:text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Concepto / Descripción</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ej: Pago de arriendo, Nómina, Suministros..."
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-primary font-bold text-slate-900 dark:text-white h-24 resize-none"
                                required
                            />
                        </div>

                        <button
                            disabled={processing || !amount || !description}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'}`}
                        >
                            {processing ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <span className="material-symbols-outlined !text-xl">{type === 'income' ? 'add_circle' : 'remove_circle'}</span>
                            )}
                            {type === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso'}
                        </button>
                    </form>

                    <button
                        onClick={onClose}
                        className="mt-4 w-full py-3 text-slate-400 font-bold hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase text-[10px] tracking-widest"
                    >
                        Cerrar Ventana
                    </button>
                </div>

                {/* Right Side: History */}
                <div className="w-full md:w-2/3 p-8 flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Historial de Movimientos</h4>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {loading && movements.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            </div>
                        ) : movements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-20 filter grayscale">
                                <span className="material-symbols-outlined !text-8xl">account_balance_wallet</span>
                                <p className="font-black uppercase tracking-widest text-xs mt-4">Sin movimientos aún</p>
                            </div>
                        ) : (
                            movements.map((mov) => (
                                <div key={mov.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-primary/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mov.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'}`}>
                                            <span className="material-symbols-outlined !text-2xl">
                                                {mov.type === 'income' ? 'trending_up' : 'trending_down'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 dark:text-slate-200 leading-none mb-1">{mov.description}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {new Date(mov.created_at).toLocaleDateString()} • {new Date(mov.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xl font-black tabular-nums ${mov.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {mov.type === 'income' ? '+' : '-'}${mov.amount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
