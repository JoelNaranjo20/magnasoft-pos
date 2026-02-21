'use client';

import { useState } from 'react';
import { useCentralCash } from '@/app/hooks/useCentralCash';
import DashboardHeader from '@/app/components/DashboardHeader';

export default function FinanzasPage() {
    const { movements, balance, loading, addMovement } = useCentralCash();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [processing, setProcessing] = useState(false);

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
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0a0f14]">
            <DashboardHeader />

            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-12 pb-20 w-full animate-in fade-in duration-700">
                {/* Header Section */}
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
                        Caja <span className="text-primary tracking-tighter">Central</span>
                    </h1>
                    <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-medium">Gestión financiera y tesorería principal del negocio.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Column: Register Form & Balance */}
                    <div className="w-full lg:w-1/3 space-y-8">
                        {/* Balance Card */}
                        <div className="bg-slate-900 dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full -mr-10 -mt-10 blur-[60px] group-hover:bg-primary/30 transition-all duration-700"></div>
                            <div className="relative z-10">
                                <span className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-[10px] mb-2">
                                    <span className="material-symbols-outlined !text-lg">account_balance</span>
                                    Tesorería
                                </span>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Saldo Disponible</p>
                                <h2 className="text-5xl font-black text-white tabular-nums tracking-tighter">${balance.toLocaleString()}</h2>
                            </div>
                        </div>

                        {/* Transaction Form */}
                        <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">edit_square</span>
                                Registrar Movimiento
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setType('expense')}
                                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${type === 'expense' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-md transform scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Egreso
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('income')}
                                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${type === 'income' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-md transform scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Ingreso
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Monto</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 group-focus-within:text-primary transition-colors">$</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full pl-8 pr-4 py-4 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 font-black text-xl text-slate-900 dark:text-white transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Concepto</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Descripción del movimiento..."
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 font-bold text-slate-900 dark:text-white h-32 resize-none transition-all"
                                        required
                                    />
                                </div>

                                <button
                                    disabled={processing || !amount || !description}
                                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] ${type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30' : 'bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/30'}`}
                                >
                                    {processing ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined !text-xl">{type === 'income' ? 'add_circle' : 'remove_circle'}</span>
                                            {type === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso'}
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right Column: History */}
                    <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col h-[600px] lg:h-auto">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary">history</span>
                                    Historial de Movimientos
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Registro cronológico de operaciones</p>
                            </div>

                            {/* Filter placeholder or export button could go here */}
                            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Últimos registros
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                            {loading && movements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em]">Cargando...</p>
                                </div>
                            ) : movements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-20 filter grayscale py-20">
                                    <span className="material-symbols-outlined !text-9xl">receipt_long</span>
                                    <p className="font-black uppercase tracking-widest text-xs mt-6">Sin movimientos registrados</p>
                                </div>
                            ) : (
                                movements.map((mov) => (
                                    <div key={mov.id} className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-[2rem] flex items-center justify-between group hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-none transition-all duration-300 border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                        <div className="flex items-center gap-6">
                                            <div className={`size-16 rounded-2xl flex items-center justify-center ${mov.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500' : 'bg-rose-100 dark:bg-rose-900/20 text-rose-500'} group-hover:scale-110 transition-transform duration-300`}>
                                                <span className="material-symbols-outlined !text-3xl">
                                                    {mov.type === 'income' ? 'trending_up' : 'trending_down'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-200 text-lg leading-tight mb-1">{mov.description}</p>
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700/50 rounded-md text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                        {new Date(mov.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {new Date(mov.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right pl-4">
                                            <p className={`text-2xl font-black tabular-nums tracking-tighter ${mov.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
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
        </div>
    );
}
