import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { CustomerHistoryModal } from '../modals/CustomerHistoryModal';

interface DebtRecord {
    id: string;
    customer_id: string;
    sale_id: string;
    amount: number;
    remaining_amount: number;
    status: 'pending' | 'partial' | 'paid';
    created_at: string;
    customer?: {
        id: string;
        name: string;
        phone: string;
        email?: string;
        loyalty_points?: number;
    };
    sale?: {
        total_amount: number;
        session_id: string;
        sale_items: any[];
    };
}

export const CreditManagement = () => {
    const [debts, setDebts] = useState<DebtRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<any>(null);

    const cashSession = useSessionStore((state) => state.cashSession);

    const [debugInfo, setDebugInfo] = useState<{ totalCount: number, pendingCount: number, auth: boolean, error?: string } | null>(null);

    const fetchDebts = async () => {
        setLoading(true);
        console.log('🔄 Starting fetchDebts in CreditManagement...');
        try {
            // 1. Check Auth & Session
            const { data: { session } } = await supabase.auth.getSession();
            const { data: { user } } = await supabase.auth.getUser();
            console.log('🔑 Auth State:', { session: !!session, user: user?.email });

            // 2. Try to fetch EVERYTHING from local customer_debts first
            const { data: rawDebts, error: rawError, count: totalCount } = await (supabase as any)
                .from('customer_debts')
                .select('*', { count: 'exact' });

            console.log('📦 Raw data from customer_debts:', rawDebts);

            if (rawError) {
                console.error('❌ Supabase error fetching raw debts:', rawError);
                setDebugInfo({
                    totalCount: 0,
                    pendingCount: 0,
                    auth: !!session,
                    error: rawError.message + (rawError.code === 'PGRST205' ? ' (Check if table exists in SQL Editor)' : '')
                });
                setDebts([]);
                return;
            }

            const pendingData = (rawDebts || []).filter((d: any) => d.status !== 'paid');
            setDebugInfo({ totalCount: totalCount || 0, pendingCount: pendingData.length, auth: !!session });

            if (!rawDebts || rawDebts.length === 0) {
                console.warn('⚠️ No unpaid debts found in customer_debts table.');
                setDebts([]);
                return;
            }

            // 3. Try the full join query
            const { data, error } = await (supabase as any)
                .from('customer_debts')
                .select(`
                    *,
                    customer:customers(id, name, phone, email, loyalty_points),
                    sale:sales(total_amount, session_id, sale_items(*))
                `)
                .neq('status', 'paid')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Full join query failed (possibly missing sale_items or customer columns):', error);
                // Fallback: use rawDebts but we lack customer names
                setDebts([]);
                throw error;
            }

            console.log('✅ Full joined debts:', data);
            setDebts(data || []);
        } catch (err) {
            console.error('💥 Final catch in fetchDebts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebts();
    }, []);

    const handlePayment = async () => {
        console.log('💰 Attempting handlePayment:', { selectedDebt: !!selectedDebt, paymentAmount, cashSession: !!cashSession });

        if (!selectedDebt || !paymentAmount || !cashSession) {
            console.warn('⚠️ handlePayment returned early: Missing required data');
            alert('Faltan datos requeridos para procesar el pago');
            return;
        }

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            console.warn('⚠️ Invalid payment amount:', paymentAmount);
            alert('El monto del pago debe ser mayor a cero');
            return;
        }

        if (amount > selectedDebt.remaining_amount) {
            alert(`El monto del pago ($${amount.toLocaleString()}) no puede ser mayor al saldo pendiente ($${selectedDebt.remaining_amount.toLocaleString()})`);
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            console.log('👤 Current user for payment:', user?.id);

            // Call the database function to process the payment atomically
            const { data, error } = await (supabase as any)
                .rpc('process_debt_payment', {
                    p_debt_id: selectedDebt.id,
                    p_amount: amount,
                    p_payment_method: paymentMethod,
                    p_cash_session_id: cashSession.id,
                    p_notes: `Abono a deuda de ${selectedDebt.customer?.name || 'Cliente'}`
                });

            if (error) {
                console.error('❌ Error calling process_debt_payment:', error);
                throw error;
            }

            // The function returns an array with one result
            const result = data?.[0];

            if (!result?.success) {
                console.error('❌ Payment processing failed:', result?.message);
                alert(`Error: ${result?.message || 'No se pudo procesar el pago'}`);
                return;
            }

            console.log('✅ Payment processed successfully:', result);

            // Close modal and reset form
            setShowPaymentModal(false);
            setSelectedDebt(null);
            setPaymentAmount('');

            // Refresh debts list immediately
            await fetchDebts();

            // Show success message with updated balance
            const statusText = result.new_status === 'paid' ? 'completamente pagada' : 'actualizada';
            alert(`Abono registrado con éxito!\n\nSaldo restante: $${result.new_remaining_amount.toLocaleString()}\nEstado: ${statusText}`);
        } catch (err: any) {
            console.error('💥 Error registering payment:', err);
            alert(`Error al registrar el pago: ${err.message || JSON.stringify(err)}`);
        }
    };

    const handleViewHistory = (debt: DebtRecord) => {
        if (!debt.customer) return;
        setSelectedCustomerForHistory({
            id: debt.customer_id,
            name: debt.customer.name,
            phone: debt.customer.phone,
            loyalty_points: debt.customer.loyalty_points || 0
        });
        setIsHistoryModalOpen(true);
    };

    const filteredDebts = debts.filter(d =>
        (d.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.customer?.phone || '').includes(searchTerm)
    );

    const totalOutstanding = debts.reduce((sum, d) => sum + d.remaining_amount, 0);

    return (
        <div className="space-y-6">
            {/* Debug Info Overlay (Temporary) */}
            {debugInfo && (debugInfo.error || debugInfo.totalCount === 0) && (
                <div className="mx-6 mb-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-bold flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined !text-sm">diagnostics</span>
                        Diagnóstico de Base de Datos
                    </p>
                    {debugInfo.error ? (
                        <p className="text-rose-600 dark:text-rose-400 font-bold mb-2">Error: {debugInfo.error}</p>
                    ) : (
                        <p>La tabla `customer_debts` está vacía (0 registros totales). Asegúrate de realizar ventas con el método "Fiado".</p>
                    )}
                    <div className="mt-2 flex gap-4 font-mono opacity-80 text-[10px]">
                        <span>Total: {debugInfo.totalCount}</span>
                        <span>Pendientes: {debugInfo.pendingCount}</span>
                        <span>Auth: {debugInfo.auth ? 'OK' : 'FAIL'}</span>
                    </div>
                </div>
            )}

            {/* Stats Header */}
            <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-lg text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Cartera Total Pendiente</p>
                        <h2 className="text-4xl font-black">${totalOutstanding.toLocaleString()}</h2>
                    </div>
                    <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined !text-3xl">account_balance_wallet</span>
                    </div>
                </div>
            </div>

            {/* List and Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="Buscar cliente por nombre o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Cliente / Detalle</th>
                                <th className="px-6 py-4">Fecha / Caja</th>
                                <th className="px-6 py-4">Deuda</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Cargando historial de deudas...</td>
                                </tr>
                            ) : filteredDebts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No hay créditos pendientes registrados</td>
                                </tr>
                            ) : filteredDebts.map((debt) => (
                                <tr key={debt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold">
                                                {debt.customer?.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white">{debt.customer?.name}</span>
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    {debt.sale?.sale_items?.slice(0, 2).map((it: any) => (
                                                        <span key={it.id} className="text-[9px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase truncate max-w-[80px]">
                                                            {it.name}
                                                        </span>
                                                    ))}
                                                    {(debt.sale?.sale_items?.length || 0) > 2 && (
                                                        <span className="text-[9px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-400 font-bold">...</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                                                {new Date(debt.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                Caja: {debt.sale?.session_id.slice(0, 8)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                                                ${debt.remaining_amount.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold">
                                                Total: ${debt.amount.toLocaleString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${debt.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700 animate-pulse'
                                            }`}>
                                            {debt.status === 'partial' ? 'Abonado' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <button
                                                onClick={() => handleViewHistory(debt)}
                                                className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                                                title="Ver Todo el Historial"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">history</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedDebt(debt);
                                                    setShowPaymentModal(true);
                                                }}
                                                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95"
                                            >
                                                Abonar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedDebt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-6 border border-white/10 overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">Registrar Abono</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="material-symbols-outlined text-slate-400">close</button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Pendiente</p>
                                <p className="text-2xl font-black text-rose-600">${selectedDebt.remaining_amount.toLocaleString()}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Monto del Abono</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-lg outline-none focus:border-primary transition-all shadow-inner"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Método de Pago</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['cash', 'transfer', 'card'] as const).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setPaymentMethod(m)}
                                            className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${paymentMethod === m
                                                ? 'bg-primary/5 border-primary text-primary'
                                                : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                                                }`}
                                        >
                                            {m === 'cash' ? 'Efectivo' : m === 'transfer' ? 'Transf.' : 'Tarjeta'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!cashSession && (
                                <p className="text-[10px] text-rose-500 font-bold text-center italic">
                                    * Necesitas una caja abierta para registrar abonos.
                                </p>
                            )}

                            <button
                                onClick={handlePayment}
                                disabled={!paymentAmount || !cashSession}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale mt-4"
                            >
                                CONFIRMAR ABONO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CustomerHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                customer={selectedCustomerForHistory}
                vehicle={null}
            />
        </div>
    );
};

