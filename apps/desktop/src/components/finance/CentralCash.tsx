// @ts-nocheck
import React, { useState } from 'react';
import { useCentralCash } from '../../hooks/useCentralCash';
import { useSessionStore } from '@shared/store/useSessionStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

export const CentralCash = () => {
    const {
        movements, loading, addMovement, updateMovement, deleteMovement,
        cashBalance, transferBalance, totalBalance, monthlySummary,
        backfillSessions, backfillResult, isBackfilling, refresh
    } = useCentralCash();
    const user = useSessionStore(state => state.user);
    const isAdmin = user?.role === 'admin' || user?.email === 'admin';

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
    const [processing, setProcessing] = useState(false);

    // Edit state
    const [editingMovement, setEditingMovement] = useState<any>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editType, setEditType] = useState<'income' | 'expense'>('expense');

    // UI state
    const [activeTab, setActiveTab] = useState<'cash' | 'transfer' | 'total'>('total');
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set([monthlySummary[0]?.month || '']));
    const [expandedMovements, setExpandedMovements] = useState<Set<string>>(new Set());

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Initialize expanded days
    useState(() => {
        setExpandedDays(new Set([today, yesterday]));
    });

    const toggleDay = (day: string) => {
        setExpandedDays(prev => {
            const next = new Set(prev);
            next.has(day) ? next.delete(day) : next.add(day);
            return next;
        });
    };

    const toggleMonth = (month: string) => {
        setExpandedMonths(prev => {
            const next = new Set(prev);
            next.has(month) ? next.delete(month) : next.add(month);
            return next;
        });
    };

    const toggleMetadata = (id: string) => {
        setExpandedMovements(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const startEdit = (mov: any) => {
        setEditingMovement(mov);
        setEditAmount(mov.amount.toString());
        setEditDescription(mov.description);
        setEditType(mov.type);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(editAmount);
        if (!val || val <= 0 || !editDescription) {
            alert('Por favor completa todos los campos correctamente');
            return;
        }
        setProcessing(true);
        await updateMovement(editingMovement.id, editType, val, editDescription);
        setProcessing(false);
        setEditingMovement(null);
        setEditAmount('');
        setEditDescription('');
        setEditType('expense');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || val <= 0 || !description) {
            alert('Por favor completa todos los campos correctamente');
            return;
        }
        setProcessing(true);
        const res = await addMovement(type, val, description, paymentMethod);
        setProcessing(false);
        if (res.success) {
            setAmount('');
            setDescription('');
        } else {
            console.error('❌ Error:', res.error);
            alert(`Error: ${res.error?.message || JSON.stringify(res.error)}`);
        }
    };

    const handleBackfill = async () => {
        if (!isAdmin || isBackfilling) return;
        await backfillSessions();
    };

    // ─── Agrupar movimientos por día ───
    const groupByDay = (movs: typeof movements) => {
        const map = new Map<string, { total: number; items: typeof movements }>();
        movs.forEach(m => {
            const day = (m.created_at || '').split('T')[0];
            if (!map.has(day)) map.set(day, { total: 0, items: [] });
            const entry = map.get(day)!;
            entry.items.push(m);
            if (m.type === 'income') entry.total += m.amount;
            else entry.total -= m.amount;
        });
        return Array.from(map.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([day, data]) => ({ day, ...data }));
    };

    const days = groupByDay(movements);

    const getMovementCashPart = (m: any): number => {
        if (m.payment_method === 'cash' || m.payment_method === null) return m.type === 'income' ? m.amount : -m.amount;
        if (m.payment_method === 'transfer' || m.payment_method === 'card') return 0;
        if (m.payment_method === 'mixed' && m.metadata && m.type === 'income') {
            return (m.metadata.cash_sales || 0) + (m.metadata.cash_abonos || 0) + (m.metadata.cash_loan_payments || 0) + (m.metadata.cash_other || 0);
        }
        return 0;
    };

    const getMovementTransferPart = (m: any): number => {
        if (m.payment_method === 'transfer' || m.payment_method === 'card') return m.type === 'income' ? m.amount : -m.amount;
        if (m.payment_method === 'cash' || m.payment_method === null) return 0;
        if (m.payment_method === 'mixed' && m.metadata && m.type === 'income') {
            return (m.metadata.transfer_sales || 0) + (m.metadata.transfer_abonos || 0) + (m.metadata.transfer_loan_payments || 0) + (m.metadata.transfer_other || 0)
                 + (m.metadata.card_sales || 0) + (m.metadata.card_abonos || 0);
        }
        return 0;
    };

    const formatCurrency = (n: number) =>
        '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const formatDate = (d: string) => {
        const date = new Date(d + 'T00:00:00');
        return format(date, "d 'de' MMMM yyyy", { locale: es });
    };

    // ─── Render Helpers ───

    const renderMetadataCard = (mov: any) => {
        if (!mov.metadata || mov.payment_method !== 'mixed') return null;
        const m = mov.metadata;
        const sections: { icon: string; label: string; items: { label: string; amount: number }[] }[] = [];

        // ─── Filtrar según el tab activo ───
        // Tab "cash": solo items de efectivo
        // Tab "transfer": solo items de transferencia/tarjeta
        // Tab "total": todo combinado

        const isCashTab = activeTab === 'cash';
        const isTransferTab = activeTab === 'transfer';

        // ─── VENTAS ───
        const salesItems = [];
        if (m.cash_sales > 0 && !isTransferTab) salesItems.push({ label: 'Efectivo', amount: m.cash_sales });
        if (m.transfer_sales > 0 && !isCashTab) salesItems.push({ label: 'Transferencia', amount: m.transfer_sales });
        if (m.card_sales > 0 && !isCashTab) salesItems.push({ label: 'Tarjeta', amount: m.card_sales });
        if (salesItems.length > 0) sections.push({ icon: '📦', label: 'Ventas', items: salesItems });

        // ─── CARTERA (ABONOS) ───
        const abonoItems = [];
        if (m.cash_abonos > 0 && !isTransferTab) abonoItems.push({ label: 'Efectivo', amount: m.cash_abonos });
        if (m.transfer_abonos > 0 && !isCashTab) abonoItems.push({ label: 'Transferencia', amount: m.transfer_abonos });
        if (m.card_abonos > 0 && !isCashTab) abonoItems.push({ label: 'Tarjeta', amount: m.card_abonos });
        if (abonoItems.length > 0) sections.push({ icon: '👤', label: 'Cartera de Clientes (Abonos)', items: abonoItems });

        // ─── PRÉSTAMOS TRABAJADORES ───
        const loanItems = [];
        if (m.cash_loan_payments > 0 && !isTransferTab) loanItems.push({ label: 'Efectivo', amount: m.cash_loan_payments });
        if (m.transfer_loan_payments > 0 && !isCashTab) loanItems.push({ label: 'Transferencia', amount: m.transfer_loan_payments });
        if (loanItems.length > 0) sections.push({ icon: '👷', label: 'Préstamos Trabajadores', items: loanItems });

        // ─── OTROS INGRESOS ───
        const otherItems = [];
        if (m.cash_other > 0 && !isTransferTab) otherItems.push({ label: 'Efectivo', amount: m.cash_other });
        if (m.transfer_other > 0 && !isCashTab) otherItems.push({ label: 'Transferencia', amount: m.transfer_other });
        if (otherItems.length > 0) sections.push({ icon: '📌', label: 'Otros Ingresos', items: otherItems });

        if (sections.length === 0) {
            return (
                <div className="mt-2 ml-10 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-[10px] text-slate-400 italic">
                        {isCashTab ? 'Sin ingresos en efectivo en este turno.' : isTransferTab ? 'Sin ingresos por transferencia o tarjeta en este turno.' : 'Sin desglose disponible.'}
                    </p>
                </div>
            );
        }

        return (
            <div className="mt-2 ml-10 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 animate-in slide-in-from-top-2 duration-200">"
                {sections.map((sec, i) => {
                    const secTotal = sec.items.reduce((s, it) => s + it.amount, 0);
                    return (
                        <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    {sec.icon} {sec.label}
                                </span>
                                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    +{formatCurrency(secTotal)}
                                </span>
                            </div>
                            <div className="space-y-0.5 ml-4">
                                {sec.items.map((it, j) => (
                                    <div key={j} className="flex justify-between text-[10px]">
                                        <span className="text-slate-400 dark:text-slate-500">{it.label}</span>
                                        <span className="font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{formatCurrency(it.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {m.commissions_paid > 0 && activeTab === 'total' && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">💰 Comisiones Pagadas (referencia)</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">−{formatCurrency(m.commissions_paid)}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderMovementRow = (mov: any) => {
        const isSession = !!mov.session_id;
        const cashPart = getMovementCashPart(mov);
        const transferPart = getMovementTransferPart(mov);
        const isExpanded = expandedMovements.has(mov.id);

        // Qué mostrar según el tab activo
        let displayAmount = mov.amount;
        if (activeTab === 'cash') displayAmount = Math.abs(cashPart);
        else if (activeTab === 'transfer') displayAmount = Math.abs(transferPart);

        const isPositive = mov.type === 'income';

        return (
            <div key={mov.id}>
                <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            mov.type === 'income'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                        }`}>
                            <span className="material-symbols-outlined !text-[20px]">
                                {mov.type === 'income' ? 'trending_up' : 'trending_down'}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={mov.description}>
                                    {mov.description}
                                </p>
                                {isSession && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                        <span className="material-symbols-outlined !text-[12px]">point_of_sale</span>
                                        Cierre
                                    </span>
                                )}
                                {!isSession && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex-shrink-0">
                                        <span className="material-symbols-outlined !text-[12px]">edit_note</span>
                                        Manual
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {new Date(mov.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {' · '}
                                {new Date(mov.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                {isSession && (
                                    <span className="ml-1 text-indigo-400">· Sesión #{mov.session_id?.slice(0, 8)}</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 pl-4 flex-shrink-0">
                        <div className="text-right">
                            <p className={`text-lg font-black tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isPositive ? '+' : '−'}{formatCurrency(displayAmount)}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isSession && mov.metadata && (
                                <button
                                    onClick={() => toggleMetadata(mov.id)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors"
                                    title="Ver desglose"
                                >
                                    <span className="material-symbols-outlined !text-[18px]">{isExpanded ? 'unfold_less' : 'unfold_more'}</span>
                                </button>
                            )}
                            <button
                                onClick={() => startEdit(mov)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-primary transition-colors"
                                title="Editar"
                            >
                                <span className="material-symbols-outlined !text-[16px]">edit</span>
                            </button>
                            <button
                                onClick={async () => { if (confirm('¿Eliminar este movimiento?')) await deleteMovement(mov.id); }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                                title="Eliminar"
                            >
                                <span className="material-symbols-outlined !text-[16px]">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
                {isExpanded && renderMetadataCard(mov)}
            </div>
        );
    };

    // ─── RENDER ───

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            {/* Header + Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary !text-3xl">account_balance</span>
                        Caja Central
                    </h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">Tesorería Principal</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                    {(['cash', 'transfer', 'total'] as const).map(tab => {
                        const isActive = activeTab === tab;
                        const balanceForTab = tab === 'cash' ? cashBalance : tab === 'transfer' ? transferBalance : totalBalance;
                        const label = tab === 'cash' ? '💰 Efectivo' : tab === 'transfer' ? '🏦 Transferencia' : '📊 Total General';
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                    isActive
                                        ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                <span>{label}</span>
                                <span className={`text-[10px] font-black tabular-nums ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                                    {formatCurrency(balanceForTab)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0">
                {/* Left Panel: Form */}
                <div className="w-full md:w-[380px] p-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0 flex flex-col">
                    {/* Hero Card */}
                    {activeTab === 'total' ? (
                        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl mb-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Balance Total</p>
                            <h2 className="text-3xl font-black tabular-nums relative z-10">{formatCurrency(totalBalance)}</h2>
                            <div className="flex gap-4 mt-3 relative z-10">
                                <div>
                                    <p className="text-[9px] text-slate-400 uppercase">Efectivo</p>
                                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(cashBalance)}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-400 uppercase">Transferencia</p>
                                    <p className="text-sm font-bold text-sky-400">{formatCurrency(transferBalance)}</p>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'cash' ? (
                        <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-xl mb-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1 relative z-10">Efectivo Disponible</p>
                            <h2 className="text-3xl font-black tabular-nums relative z-10">{formatCurrency(cashBalance)}</h2>
                        </div>
                    ) : (
                        <div className="bg-sky-600 text-white rounded-2xl p-6 shadow-xl mb-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                            <p className="text-[10px] font-black text-sky-100 uppercase tracking-widest mb-1 relative z-10">Transferencia Disponible</p>
                            <h2 className="text-3xl font-black tabular-nums relative z-10">{formatCurrency(transferBalance)}</h2>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button type="button" onClick={() => setType('expense')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${type === 'expense' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-sm' : 'text-slate-400'}`}>
                                Egreso
                            </button>
                            <button type="button" onClick={() => setType('income')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${type === 'income' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-slate-400'}`}>
                                Ingreso
                            </button>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Método de Pago</label>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                <button type="button" onClick={() => setPaymentMethod('cash')}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${paymentMethod === 'cash' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
                                    💰 Efectivo
                                </button>
                                <button type="button" onClick={() => setPaymentMethod('transfer')}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${paymentMethod === 'transfer' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-400'}`}>
                                    🏦 Transferencia
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-primary font-bold text-slate-900 dark:text-white"
                                    placeholder="0" required />
                            </div>
                        </div>

                        <div className="flex-grow flex flex-col min-h-0">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Concepto</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ej: Pago de arriendo, Nómina..."
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-primary font-bold text-slate-900 dark:text-white resize-none flex-grow min-h-[80px]"
                                required />
                        </div>

                        <button type="submit" disabled={processing || !amount || !description}
                            className={`w-full py-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                                type === 'income'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 focus:ring-emerald-400/50'
                                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 focus:ring-rose-400/50'
                            }`}>
                            {processing ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <span className="material-symbols-outlined !text-xl">{type === 'income' ? 'add_circle' : 'remove_circle'}</span>
                            )}
                            {type === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso'}
                        </button>
                    </form>

                    {/* Backfill button (admin only) */}
                    {isAdmin && (
                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                                ⚠️ Sesiones históricas
                            </p>
                            <p className="text-[10px] text-amber-600 dark:text-amber-500 mb-3">
                                Procesa sesiones cerradas anteriores y las registra en Caja Central con metadata completa.
                            </p>
                            <button onClick={handleBackfill} disabled={isBackfilling}
                                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isBackfilling ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Procesando...
                                    </>
                                ) : 'Ejecutar Backfill'}
                            </button>
                            {backfillResult && (
                                <p className={`text-[10px] font-bold mt-2 ${backfillResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {backfillResult.success ? '✅' : '❌'} {backfillResult.message}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel: History */}
                <div className="flex-1 p-6 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900">
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                            {activeTab === 'total' ? 'Resumen Mensual' : 'Historial de Movimientos'}
                        </h4>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-2">
                        {loading && movements.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            </div>
                        ) : movements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600">
                                <span className="material-symbols-outlined !text-8xl">account_balance_wallet</span>
                                <p className="font-black uppercase tracking-widest text-xs mt-4">Sin movimientos aún</p>
                            </div>
                        ) : activeTab === 'total' ? (
                            /* ─── TOTAL GENERAL: Resumen Mensual ─── */
                            <div className="space-y-3">
                                {monthlySummary.map(month => {
                                    const isMonthExpanded = expandedMonths.has(month.month);
                                    return (
                                        <div key={month.month} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            <button
                                                onClick={() => toggleMonth(month.month)}
                                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-slate-400 !text-[20px] transition-transform duration-200"
                                                        style={{ transform: isMonthExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                        chevron_right
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{month.label}</p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {month.sessionCount} cierres{month.manualIncomeCount > 0 ? ` · ${month.manualIncomeCount} ingresos manuales` : ''}{month.abonos > 0 ? ` · abonos ya incluidos` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 text-right">
                                                    <div>
                                                        <p className="text-[9px] text-slate-400 uppercase">Entradas</p>
                                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(month.incomes)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-slate-400 uppercase">Gastos</p>
                                                        <p className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">−{formatCurrency(month.expenses)}</p>
                                                    </div>
                                                    <div className="w-20">
                                                        <p className="text-[9px] text-slate-400 uppercase">Neto</p>
                                                        <p className={`text-base font-black tabular-nums ${month.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                            {month.net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(month.net))}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>

                                            {isMonthExpanded && (
                                                <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                    {/* Entradas */}
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">📥 Entradas del Mes</p>
                                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 space-y-1">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-slate-500">Cierres de Turno ({month.sessionCount} sesiones)</span>
                                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                                    {formatCurrency(movements.filter(m => m.type === 'income' && m.session_id && (m.created_at || '').startsWith(month.month)).reduce((s, m) => s + m.amount, 0))}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-slate-500">Ingresos Manuales ({month.manualIncomeCount})</span>
                                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                                    {formatCurrency(movements.filter(m => m.type === 'income' && !m.session_id && (m.created_at || '').startsWith(month.month) && !(m.description || '').toLowerCase().includes('abono crédito')).reduce((s, m) => s + m.amount, 0))}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {month.abonos > 0 && (
                                                            <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-2 ml-1">
                                                                💡 Los abonos de cartera (+{formatCurrency(month.abonos)}) están incluidos dentro del efectivo de cada cierre de turno.
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Gastos */}
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">📤 Gastos del Mes</p>
                                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 space-y-1">
                                                            {month.commissionsPaid > 0 && (
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-slate-500">💰 Comisiones Pagadas a Trabajadores</span>
                                                                    <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">−{formatCurrency(month.commissionsPaid)}</span>
                                                                </div>
                                                            )}
                                                            {month.salaryExpenses > 0 && (
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-slate-500">👷 Salarios / Adelantos / Préstamos</span>
                                                                    <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">−{formatCurrency(month.salaryExpenses)}</span>
                                                                </div>
                                                            )}
                                                            {month.otherExpenses > 0 && (
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-slate-500">📌 Otros Egresos Manuales</span>
                                                                    <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">−{formatCurrency(month.otherExpenses)}</span>
                                                                </div>
                                                            )}
                                                            {month.expenses === 0 && (
                                                                <p className="text-xs text-slate-400 italic">Sin gastos este mes</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Movimientos del mes */}
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Movimientos</p>
                                                        <div className="space-y-0.5">
                                                            {movements
                                                                .filter(m => (m.created_at || '').startsWith(month.month))
                                                                .map(m => renderMovementRow(m))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* ─── CASH / TRANSFER: Agrupado por día ─── */
                            <div className="space-y-3">
                                {days.map(({ day, items }) => {
                                    const isExpanded = expandedDays.has(day);
                                    const filteredItems = items.filter(m => {
                                        if (activeTab === 'cash') return getMovementCashPart(m) !== 0;
                                        return getMovementTransferPart(m) !== 0;
                                    });
                                    if (filteredItems.length === 0) return null;

                                    const dayTotal = filteredItems.reduce((s, m) => {
                                        return s + (activeTab === 'cash' ? getMovementCashPart(m) : getMovementTransferPart(m));
                                    }, 0);

                                    return (
                                        <div key={day} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            <button
                                                onClick={() => toggleDay(day)}
                                                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-slate-400 !text-[18px] transition-transform duration-200"
                                                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                        chevron_right
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        {day === today ? 'Hoy' : day === yesterday ? 'Ayer' : formatDate(day)}
                                                    </span>
                                                </div>
                                                <span className={`text-sm font-black tabular-nums ${dayTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                    {dayTotal >= 0 ? '+' : '−'}{formatCurrency(Math.abs(dayTotal))}
                                                </span>
                                            </button>
                                            {isExpanded && (
                                                <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/30">
                                                    {filteredItems.map(m => renderMovementRow(m))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingMovement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editar Movimiento</h3>
                            <button onClick={() => setEditingMovement(null)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <span className="material-symbols-outlined !text-[18px]">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                                <button type="button" onClick={() => setEditType('expense')}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${editType === 'expense' ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-sm' : 'text-slate-400'}`}>
                                    Egreso
                                </button>
                                <button type="button" onClick={() => setEditType('income')}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${editType === 'income' ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm' : 'text-slate-400'}`}>
                                    Ingreso
                                </button>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                                    <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-primary font-bold text-slate-900 dark:text-white"
                                        required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Concepto</label>
                                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-primary font-bold text-slate-900 dark:text-white resize-none h-[100px]"
                                    required />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setEditingMovement(null)}
                                    className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={processing}
                                    className="flex-1 py-3 bg-primary hover:bg-[#0b6ddb] dark:hover:bg-[#3b9eff] text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                    {processing ? (
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : null}
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
