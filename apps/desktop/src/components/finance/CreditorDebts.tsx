// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface CreditorDebt {
    id: string;
    creditor_name: string;
    amount: number;
    remaining_amount: number;
    invoice_date: string | null;
    status: 'pending' | 'partial' | 'paid';
    notes: string | null;
    created_at: string;
}

interface CreditorPayment {
    id: string;
    creditor_debt_id: string;
    amount: number;
    payment_method: 'cash' | 'transfer';
    created_at: string;
}

export const CreditorDebts: React.FC = () => {
    const businessId = useBusinessStore((state) => state.id);

    const [debts, setDebts] = useState<CreditorDebt[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // ─── New Debt Modal ───
    const [showNewModal, setShowNewModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newInvoiceDate, setNewInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
    const [newSaving, setNewSaving] = useState(false);

    // ─── Payment Modal ───
    const [showPayModal, setShowPayModal] = useState(false);
    const [payDebt, setPayDebt] = useState<CreditorDebt | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState<'cash' | 'transfer'>('cash');
    const [paySaving, setPaySaving] = useState(false);

    // ─── Payment History Modal ───
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyDebt, setHistoryDebt] = useState<CreditorDebt | null>(null);
    const [historyPayments, setHistoryPayments] = useState<CreditorPayment[]>([]);

    const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const formatDate = (d?: string | null) => {
        if (!d) return '—';
        return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const statusBadge = (s: string) => {
        if (s === 'paid') return <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">Pagado</span>;
        if (s === 'partial') return <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">Parcial</span>;
        return <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">Pendiente</span>;
    };

    const fetchDebts = async () => {
        if (!businessId) return;
        setLoading(true);
        try {
            const q = (supabase as any).from('creditor_debts').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
            if (statusFilter !== 'all') q.eq('status', statusFilter);
            if (searchTerm) q.ilike('creditor_name', `%${searchTerm}%`);
            const { data } = await q;
            setDebts((data || []).map((d: any) => ({
                id: d.id, creditor_name: d.creditor_name, amount: Number(d.amount),
                remaining_amount: Number(d.remaining_amount), invoice_date: d.invoice_date,
                status: d.status, notes: d.notes, created_at: d.created_at,
            })));
        } catch (err) { console.error('Error fetching creditor debts:', err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDebts(); }, [businessId, statusFilter]);

    useEffect(() => {
        if (!businessId) return;
        const timer = setTimeout(() => { fetchDebts(); }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleCreate = async () => {
        if (!newName.trim() || !newAmount || parseFloat(newAmount) <= 0) {
            alert('Completa todos los campos correctamente.'); return;
        }
        setNewSaving(true);
        try {
            const amt = parseFloat(newAmount);
            await (supabase as any).from('creditor_debts').insert({
                business_id: businessId,
                creditor_name: newName.trim(),
                amount: amt,
                remaining_amount: amt,
                invoice_date: newInvoiceDate || null,
                status: 'pending',
            });
            setShowNewModal(false); setNewName(''); setNewAmount(''); setNewInvoiceDate(new Date().toISOString().slice(0, 10));
            fetchDebts();
        } catch (err: any) { alert('Error: ' + (err.message || 'No se pudo crear la deuda')); }
        finally { setNewSaving(false); }
    };

    const handlePay = async () => {
        if (!payDebt || !payAmount || parseFloat(payAmount) <= 0) return;
        const amt = parseFloat(payAmount);
        if (amt > payDebt.remaining_amount) { alert(`El abono no puede exceder el saldo pendiente ($${payDebt.remaining_amount.toLocaleString()}).`); return; }
        setPaySaving(true);
        try {
            // 1. Insert creditor_payment
            await (supabase as any).from('creditor_payments').insert({
                business_id: businessId,
                creditor_debt_id: payDebt.id,
                amount: amt,
                payment_method: payMethod,
            });
            // 2. Update creditor_debt
            const newRemaining = payDebt.remaining_amount - amt;
            const newStatus = newRemaining <= 0 ? 'paid' : 'partial';
            await (supabase as any).from('creditor_debts').update({ remaining_amount: newRemaining, status: newStatus }).eq('id', payDebt.id);
            // 3. Register expense in central_cash_movements
            await (supabase as any).from('central_cash_movements').insert({
                business_id: businessId,
                type: 'expense',
                amount: amt,
                payment_method: payMethod,
                description: `Abono a acreedor: ${payDebt.creditor_name}`,
            });
            setShowPayModal(false); setPayAmount('');
            fetchDebts();
        } catch (err: any) { alert('Error: ' + (err.message || 'No se pudo registrar el abono')); }
        finally { setPaySaving(false); }
    };

    const openPayModal = (d: CreditorDebt) => {
        if (d.status === 'paid') return;
        setPayDebt(d); setPayAmount(''); setPayMethod('cash'); setShowPayModal(true);
    };

    const openHistory = async (d: CreditorDebt) => {
        setHistoryDebt(d);
        try {
            const { data } = await (supabase as any).from('creditor_payments').select('*').eq('creditor_debt_id', d.id).order('created_at', { ascending: false });
            setHistoryPayments(data || []);
        } catch { setHistoryPayments([]); }
        setShowHistoryModal(true);
    };

    const openNewModal = () => { setNewName(''); setNewAmount(''); setNewInvoiceDate(new Date().toISOString().slice(0, 10)); setShowNewModal(true); };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <button onClick={openNewModal} className="px-4 py-2.5 bg-primary hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors">
                    <span className="material-symbols-outlined !text-[16px]">add</span> Nueva Deuda
                </button>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                    {(['all', 'pending', 'partial', 'paid'] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase transition-all ${statusFilter === s ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {s === 'all' ? 'Todas' : s === 'pending' ? 'Pendientes' : s === 'partial' ? 'Parciales' : 'Pagadas'}
                        </button>
                    ))}
                </div>
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar acreedor..."
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:border-primary flex-1 max-w-[200px]" />
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
                ) : debts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <span className="material-symbols-outlined !text-[48px] opacity-30">construction</span>
                        <p className="text-sm font-semibold mt-2">Sin deudas registradas</p>
                        <button onClick={openNewModal} className="mt-3 text-xs font-bold text-primary hover:underline">+ Registrar primera deuda</button>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr className="text-left">
                                <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase">Fecha Fact.</th>
                                <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase">Acreedor</th>
                                <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase text-right">Valor</th>
                                <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase text-right">Saldo</th>
                                <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase">Estado</th>
                                <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {debts.map(d => (
                                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{formatDate(d.invoice_date)}</td>
                                    <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{d.creditor_name}</td>
                                    <td className="px-4 py-2.5 text-right font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatCurrency(d.amount)}</td>
                                    <td className={`px-4 py-2.5 text-right font-black tabular-nums ${d.remaining_amount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(d.remaining_amount)}</td>
                                    <td className="px-4 py-2.5">{statusBadge(d.status)}</td>
                                    <td className="px-4 py-2.5 text-right flex items-center justify-end gap-1">
                                        {d.status !== 'paid' && (
                                            <button onClick={() => openPayModal(d)} className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-colors">
                                                Abonar
                                            </button>
                                        )}
                                        <button onClick={() => openHistory(d)} className="px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-[10px] text-slate-400 transition-colors">
                                            <span className="material-symbols-outlined !text-[14px]">history</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ─── Modal: Nueva Deuda ─── */}
            {showNewModal && (
                <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="font-black text-slate-800 dark:text-white">Nueva Deuda — Acreedor</h3>
                            <button onClick={() => setShowNewModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><span className="material-symbols-outlined !text-[18px]">close</span></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Fecha de Factura</label>
                                <input type="date" value={newInvoiceDate} onChange={e => setNewInvoiceDate(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-primary text-sm text-slate-800 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nombre del Acreedor</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Coéxito, pago de agua..."
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-primary text-sm text-slate-800 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Valor de la Deuda</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                    <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0"
                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-primary text-sm font-bold text-slate-800 dark:text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                            <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                            <button onClick={handleCreate} disabled={newSaving}
                                className="px-5 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2 transition-colors">
                                {newSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : null}
                                Registrar Deuda
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Modal: Registrar Abono ─── */}
            {showPayModal && payDebt && (
                <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-white">Registrar Abono</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">{payDebt.creditor_name} · Saldo: <span className="font-bold text-rose-600">{formatCurrency(payDebt.remaining_amount)}</span></p>
                            </div>
                            <button onClick={() => setShowPayModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><span className="material-symbols-outlined !text-[18px]">close</span></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Monto del Abono</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                    <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0"
                                        max={payDebt.remaining_amount}
                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-primary text-sm font-bold text-slate-800 dark:text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Método de Pago</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setPayMethod('cash')}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${payMethod === 'cash' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                        💵 Efectivo
                                    </button>
                                    <button onClick={() => setPayMethod('transfer')}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${payMethod === 'transfer' ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                        🏦 Transferencia
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                            <button onClick={() => setShowPayModal(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                            <button onClick={handlePay} disabled={paySaving || !payAmount || parseFloat(payAmount) <= 0}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2 transition-colors">
                                {paySaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : null}
                                Registrar Abono
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Modal: Historial de Abonos ─── */}
            {showHistoryModal && historyDebt && (
                <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg max-h-[70vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-white">Historial de Abonos</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">{historyDebt.creditor_name} · Total: {formatCurrency(historyDebt.amount)} · Saldo: {formatCurrency(historyDebt.remaining_amount)}</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><span className="material-symbols-outlined !text-[18px]">close</span></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-2">
                            {historyPayments.length === 0 ? (
                                <p className="text-center text-slate-400 text-sm py-8">Sin abonos registrados</p>
                            ) : (
                                historyPayments.map(p => (
                                    <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {p.payment_method === 'cash' ? '💵 Efectivo' : '🏦 Transferencia'}
                                            </p>
                                            <p className="text-[10px] text-slate-400">{formatDate(p.created_at)}</p>
                                        </div>
                                        <span className="text-sm font-black text-rose-600 tabular-nums">−{formatCurrency(p.amount)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 flex justify-end">
                            <button onClick={() => setShowHistoryModal(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
