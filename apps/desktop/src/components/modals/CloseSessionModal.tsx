// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';

const DENOMINATIONS = [
    { value: 100000, label: '$100.000' },
    { value: 50000, label: '$50.000' },
    { value: 20000, label: '$20.000' },
    { value: 10000, label: '$10.000' },
    { value: 5000, label: '$5.000' },
    { value: 2000, label: '$2.000' },
    { value: 1000, label: '$1.000' },
];

export const CloseSessionModal = () => {
    const navigate = useNavigate();
    const user = useSessionStore((state) => state.user);
    const cashSession = useSessionStore((state) => state.cashSession);
    const setCashSession = useSessionStore((state) => state.setCashSession);
    const setClosing = useSessionStore((state) => state.setClosing);

    const [counts, setCounts] = useState<{ [key: number]: number }>({});
    const [coinsTotal, setCoinsTotal] = useState<number>(0);
    const [manualDigitalAmount, setManualDigitalAmount] = useState<number>(0);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [expectedTotal, setExpectedTotal] = useState(0);
    const [expectedDigitalTotal, setExpectedDigitalTotal] = useState(0);
    const [digitalCount, setDigitalCount] = useState(0);
    const [commissionsPaid, setCommissionsPaid] = useState(0);
    const [commissionsPending, setCommissionsPending] = useState(0);

    // Fetch expected total and commissions
    useEffect(() => {
        const fetchTotals = async () => {
            if (!cashSession) return;
            const businessId = useBusinessStore.getState().id;

            // 1. Get cash sales for this session
            const { data: cashSales } = await (supabase as any)
                .from('sales')
                .select('total_amount')
                .eq('session_id', cashSession.id)
                .eq('business_id', businessId)
                .eq('status', 'completed')
                .eq('payment_method', 'cash');

            const cashSalesTotal = cashSales?.reduce((acc: number, sale: any) => acc + Number(sale.total_amount), 0) || 0;

            // 2. Get cash movements (assuming all movements are cash for now)
            const { data: movements } = await supabase
                .from('cash_movements')
                .select('amount, type')
                .eq('session_id', cashSession.id)
                .eq('business_id', businessId);

            const movementBalance = movements?.reduce((acc, mov) => {
                return mov.type === 'income' ? acc + Number(mov.amount) : acc - Number(mov.amount);
            }, 0) || 0;

            // Expected Cash: Base + Cash Sales + Movements
            setExpectedTotal((cashSession.start_amount || 0) + cashSalesTotal + movementBalance);

            // 3. Get digital sales (card + transfer)
            const { data: digitalSales } = await (supabase as any)
                .from('sales')
                .select('total_amount')
                .eq('session_id', cashSession.id)
                .eq('business_id', businessId)
                .eq('status', 'completed')
                .in('payment_method', ['card', 'transfer']);

            const digitalSalesTotal = digitalSales?.reduce((acc: number, sale: any) => acc + Number(sale.total_amount), 0) || 0;

            // 4. Get debt payments made by digital methods
            const { data: digitalAbonos } = await (supabase as any)
                .from('debt_payments')
                .select('amount')
                .eq('cash_session_id', cashSession.id)
                .eq('business_id', businessId)
                .in('payment_method', ['card', 'transfer']);

            const abonosTotal = digitalAbonos?.reduce((acc: number, abono: any) => acc + Number(abono.amount), 0) || 0;

            // DIGITAL SISTEMA = ONLY Digital Sales + Digital Abonos
            const totalDigitalSistema = digitalSalesTotal + abonosTotal;
            setExpectedDigitalTotal(totalDigitalSistema);
            setDigitalCount((digitalSales?.length || 0) + (digitalAbonos?.length || 0));
            setManualDigitalAmount(totalDigitalSistema); // Default to expected

            // 5. Get commission data for this session
            const { data: commissions } = await supabase
                .from('worker_commissions')
                .select('*, sale:sales!inner(session_id)')
                .eq('sale.session_id', cashSession.id)
                .eq('business_id', businessId);

            const paid = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commission_amount, 0) || 0;
            const pending = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0) || 0;

            setCommissionsPaid(paid);
            setCommissionsPending(pending);
        };

        fetchTotals();
    }, [cashSession]);

    const handleCountChange = (value: number, quantity: string) => {
        const qty = parseInt(quantity) || 0;
        setCounts(prev => ({ ...prev, [value]: qty }));
    };

    const totalCounted = useMemo(() => {
        const bills = Object.entries(counts).reduce((acc, [val, qty]) => acc + (Number(val) * qty), 0);
        return bills + coinsTotal;
    }, [counts, coinsTotal]);

    const difference = totalCounted - expectedTotal;
    const digitalDifference = manualDigitalAmount - expectedDigitalTotal;

    const [showFinalConfirm, setShowFinalConfirm] = useState(false);

    const handleConfirmClose = async () => {
        if (!cashSession) return;

        const businessId = useBusinessStore.getState().id;
        if (!businessId) {
            alert('❌ ERROR: No se detectó ID de negocio. Por favor reinicia la sesión.');
            return;
        }

        if (totalCounted === 0 && expectedTotal > 0) {
            alert('⚠️ Por favor ingrese el conteo de dinero físico antes de cerrar.');
            return;
        }

        if (!showFinalConfirm) {
            setShowFinalConfirm(true);
            return;
        }

        setLoading(true);
        try {
            // 1. Prepare breakdown as JSONB
            const countData = Object.entries(counts)
                .filter(([_, qty]) => qty > 0)
                .map(([denom, qty]) => ({
                    denomination: Number(denom),
                    quantity: qty,
                    total: Number(denom) * qty
                }));

            if (coinsTotal > 0) {
                countData.push({
                    denomination: 1,
                    quantity: coinsTotal,
                    total: coinsTotal
                });
            }

            // 2. Close session with ALL data in one update
            const notesText = `[CERRADO POR: ${user?.name || user?.email || 'Admin'}] [TRANSF: ${formatCurrency(manualDigitalAmount)} | DIFF: ${formatCurrency(digitalDifference)}] ${notes}`;

            const { error: sessionError } = await (supabase as any)
                .from('cash_sessions')
                .update({
                    closed_at: new Date().toISOString(),
                    end_amount: expectedTotal || 0,
                    manual_end_amount: totalCounted || 0,
                    difference: difference || 0,
                    status: 'closed',
                    notes: notesText,
                    cash_counts: countData // <--- NOW SAVED DIRECTLY HERE
                })
                .eq('id', cashSession.id)
                .eq('business_id', businessId);

            if (sessionError) {
                console.error('Error in cash_sessions:', sessionError);
                throw new Error(`Error en sesión: ${sessionError.message} (${sessionError.code})`);
            }

            // 3. Automatically record the transfer in Central Cash
            const netToTransfer = totalCounted;
            if (netToTransfer > 0) {
                const { error: centralError } = await (supabase as any)
                    .from('central_cash_movements')
                    .insert({
                        type: 'income',
                        amount: netToTransfer,
                        business_id: businessId,
                        description: `Cierre de Sesión #${cashSession.id.slice(0, 8)} - Transferencia de efectivo`,
                        user_id: user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) ? user.id : null
                    });
                if (centralError) console.error('Error recording central cash entry:', centralError);
            }

            setCashSession(null); // Clear session from store
            setClosing(false); // Close this modal
            navigate('/'); // Redirect to finance dashboard

        } catch (err: any) {
            console.error('Error closing session:', err);
            alert(`❌ Error al cerrar caja:\n${err.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-screen p-4">
            {/* Modal Backdrop */}
            <div className="fixed inset-0 z-40 transition-opacity bg-black/60 backdrop-blur-sm" onClick={() => setClosing(false)}></div>

            {/* Modal Container */}
            <div className="relative z-50 flex flex-col w-full max-w-[1300px] max-h-[90vh] bg-background-light dark:bg-background-dark rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/10">

                {/* Confirmation Overlay */}
                {showFinalConfirm && (
                    <div className="absolute inset-0 z-[60] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-[#1a2632] w-full max-w-md rounded-3xl p-8 shadow-2xl border border-white/5 animate-in zoom-in-95 duration-300">
                            <div className="size-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <span className="material-symbols-outlined !text-4xl text-amber-500">warning</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-3">¿Confirmas el Cierre?</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-center font-medium leading-relaxed mb-8 text-sm">
                                Una vez cerrada la caja, no podrás registrar más ventas en esta sesión ni modificar los conteos. ¿Estás seguro de continuar?
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowFinalConfirm(false)}
                                    className="h-14 font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase text-xs tracking-widest"
                                >
                                    No, Revisar
                                </button>
                                <button
                                    onClick={handleConfirmClose}
                                    disabled={loading}
                                    className="h-14 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined !text-[18px]">verified</span>
                                            Sí, Cerrar Caja
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15202b]">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-[#0d141c] dark:text-white text-xl font-bold leading-tight tracking-tight flex items-center gap-2">
                            <span className="text-primary material-symbols-outlined">point_of_sale</span>
                            Cierre de Caja
                        </h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()} • <span className="font-semibold text-primary">ID Sesión: {cashSession?.id.slice(0, 8)}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => setClosing(false)}
                        className="p-2 transition-colors rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Modal Body Layout */}
                <div className="flex flex-col flex-1 h-full overflow-hidden lg:flex-row">

                    {/* COLUMN 1: Cash/Transfer Counting Table */}
                    <div className="relative flex flex-col w-full lg:w-[480px] overflow-y-auto bg-white dark:bg-[#15202b] border-r border-slate-200 dark:border-slate-700">
                        <div className="sticky top-0 z-10 bg-white dark:bg-[#15202b] px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 shadow-sm">
                            <h3 className="text-sm font-semibold tracking-wider uppercase text-slate-800 dark:text-slate-100">1. Conteo de Fondos</h3>
                        </div>
                        <div className="p-6">
                            <div className="w-full overflow-hidden border rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15202b]">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Detalle</th>
                                            <th className="w-24 px-4 py-3 font-semibold text-center text-slate-700 dark:text-slate-300">Cant.</th>
                                            <th className="w-32 px-4 py-3 font-semibold text-right text-slate-700 dark:text-slate-300">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {DENOMINATIONS.map((denom) => (
                                            <tr key={denom.value} className="transition-colors group hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-8 h-5 border rounded bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800">
                                                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400">$</span>
                                                    </div>
                                                    {denom.label}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        className="w-full h-8 text-sm font-bold text-center border-slate-300 rounded shadow-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-primary dark:focus:border-primary dark:border-slate-600"
                                                        placeholder="0"
                                                        type="number"
                                                        value={counts[denom.value] || ''}
                                                        onChange={(e) => handleCountChange(denom.value, e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-medium text-right text-slate-600 dark:text-slate-400 tabular-nums">
                                                    {formatCurrency((counts[denom.value] || 0) * denom.value)}
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Coins Row */}
                                        <tr className="transition-colors group bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-800/20 dark:hover:bg-slate-800/30">
                                            <td className="flex items-center gap-3 px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                <div className="flex items-center justify-center w-8 h-5 border rounded bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800">
                                                    <div className="w-2.5 h-2.5 border rounded-full bg-amber-400 border-amber-500"></div>
                                                </div>
                                                Monedas (Total)
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    className="w-full h-8 text-sm font-bold text-center border-slate-300 rounded shadow-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-primary dark:focus:border-primary dark:border-slate-600"
                                                    placeholder="0"
                                                    type="number"
                                                    value={coinsTotal || ''}
                                                    onChange={(e) => setCoinsTotal(parseInt(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium text-right text-slate-600 dark:text-slate-400 tabular-nums">
                                                {formatCurrency(coinsTotal)}
                                            </td>
                                        </tr>

                                        {/* Digital Transfers Row */}
                                        <tr className="transition-colors group bg-purple-50/50 hover:bg-purple-50 dark:bg-purple-900/10 dark:hover:bg-purple-900/20">
                                            <td className="px-4 py-3 font-medium text-purple-900 dark:text-purple-300">
                                                <div className="flex flex-col">
                                                    <span className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[18px]">account_balance</span>
                                                        Transferencias
                                                    </span>
                                                    <span className="text-[10px] font-black text-purple-400 dark:text-purple-500 uppercase mt-0.5 ml-6">
                                                        SISTEMA: {formatCurrency(expectedDigitalTotal)}
                                                        {digitalCount > 0 && <span className="ml-1 opacity-70">({digitalCount} trans.)</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={manualDigitalAmount || ''}
                                                    onChange={(e) => setManualDigitalAmount(Number(e.target.value))}
                                                    className="w-full h-8 text-sm font-bold text-center border-purple-200 dark:border-purple-800 rounded shadow-sm bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 focus:border-purple-500 focus:ring-purple-500 outline-none"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium text-right tabular-nums">
                                                <div className={`inline-flex flex-col items-end ${digitalDifference < 0 ? 'text-red-600' : digitalDifference > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                    <span className="text-[11px] font-black">{formatCurrency(manualDigitalAmount)}</span>
                                                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">Dif: {formatCurrency(digitalDifference)}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 2: Details (Commissions & Notes) */}
                    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/50 dark:bg-[#101922] border-r border-slate-200 dark:border-slate-700">
                        <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[#101922] px-6 py-4 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-sm font-semibold tracking-wider uppercase text-slate-800 dark:text-slate-100">2. Detalles y Ajustes</h3>
                        </div>
                        <div className="p-6 space-y-8">

                            {/* SECTION A: Cash Balance (Profit) */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Balance del Turno</h4>
                                <div className="p-4 rounded-xl border-2 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/10">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Ganancia en Efectivo</span>
                                        <span className="material-symbols-outlined text-emerald-500 text-sm">trending_up</span>
                                    </div>
                                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-300">{formatCurrency(totalCounted - (cashSession?.start_amount || 0))}</span>
                                    <p className="mt-1 text-[10px] text-emerald-600/70 dark:text-emerald-500/50 leading-tight">
                                        Efectivo Final ({formatCurrency(totalCounted)}) - Base Inicial ({formatCurrency(cashSession?.start_amount || 0)})
                                    </p>
                                </div>
                            </div>

                            {/* SECTION B: Commission Summary (Conditional) */}
                            {(commissionsPaid > 0 || commissionsPending > 0) && (
                                <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Liquidaciones de Personal</h4>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col p-4 rounded-xl border bg-white dark:bg-[#1a2632] shadow-sm border-blue-200 dark:border-blue-900/30">
                                            <span className="text-[10px] font-black text-blue-500 uppercase mb-1">Pagadas</span>
                                            <span className="text-lg font-black tabular-nums text-blue-600 dark:text-blue-400">{formatCurrency(commissionsPaid)}</span>
                                        </div>

                                        {commissionsPending > 0 && (
                                            <div className="flex flex-col p-4 rounded-xl border bg-white dark:bg-[#1a2632] shadow-sm border-amber-200 dark:border-amber-900/30">
                                                <span className="text-[10px] font-black text-amber-500 uppercase mb-1">Pendientes</span>
                                                <span className="text-lg font-black tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(commissionsPending)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SECTION C: Observations */}
                            <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Observaciones de la Sesión</h4>
                                <div className="relative group">
                                    <textarea
                                        className="form-textarea w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1a2632] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-primary dark:focus:border-primary min-h-[160px] text-sm leading-relaxed p-4 resize-none shadow-sm transition-all group-hover:border-slate-400"
                                        placeholder="Escriba aquí cualquier novedad, descuadre o nota importante..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    ></textarea>
                                    <div className="absolute bottom-3 right-3 opacity-30 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xl material-symbols-outlined text-slate-400">edit_note</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 3: Main Summary & Final Actions */}
                    <div className="w-full lg:w-[420px] flex flex-col bg-white dark:bg-[#101922]">
                        <div className="sticky top-0 z-10 bg-white dark:bg-[#101922] px-6 py-4 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-sm font-semibold tracking-wider uppercase text-slate-800 dark:text-slate-100">3. Conciliación Final</h3>
                        </div>
                        <div className="flex flex-col flex-1 p-6 overflow-y-auto space-y-4">
                            {/* Card: Base Initial */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 border rounded-xl border-slate-200 dark:border-slate-700">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Base Inicial</span>
                                    <span className="text-xl font-black text-slate-700 dark:text-slate-200 tabular-nums">{formatCurrency(cashSession?.start_amount || 0)}</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-300">account_balance_wallet</span>
                            </div>

                            {/* Card: Expected */}
                            <div className="flex items-center justify-between p-4 bg-cyan-50/50 dark:bg-cyan-900/10 border rounded-xl border-cyan-100 dark:border-cyan-900/30">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-cyan-600 uppercase tracking-wider">Efectivo Esperado (Base + Ventas)</span>
                                    <span className="text-xl font-black text-cyan-700 dark:text-cyan-300 tabular-nums">{formatCurrency(expectedTotal)}</span>
                                </div>
                                <span className="material-symbols-outlined text-cyan-300">receipt_long</span>
                            </div>

                            {/* Card: Counted */}
                            <div className="flex items-center justify-between p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 border-l-4 border-l-primary rounded-xl shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-wider">Total Efectivo Físico</span>
                                    <span className="text-2xl font-black text-primary tabular-nums">{formatCurrency(totalCounted)}</span>
                                </div>
                                <span className="material-symbols-outlined text-primary/40 text-3xl">payments</span>
                            </div>

                            {/* Card: Resulting Transfer to Central */}
                            <div className="flex items-center justify-between p-4 bg-emerald-500 text-white rounded-xl shadow-xl shadow-emerald-500/20 animate-in zoom-in-95 duration-300">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-wider opacity-80 leading-none mb-1">Entregar a Admin</span>
                                    <span className="text-2xl font-black tabular-nums">{formatCurrency(totalCounted)}</span>
                                </div>
                                <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined !text-2xl">account_balance</span>
                                </div>
                            </div>

                            {/* Card: Difference */}
                            <div className={`p-5 rounded-xl border-2 transition-all ${difference < 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : difference > 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${difference < 0 ? 'text-red-500' : difference > 0 ? 'text-blue-500' : 'text-emerald-500'}`}>Diferencia (Efectivo)</span>
                                    {difference === 0 ? (
                                        <span className="flex items-center gap-1 text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase">Exacto</span>
                                    ) : (
                                        <span className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${difference < 0 ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                                            {difference < 0 ? 'Faltante' : 'Sobrante'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-3xl font-black tabular-nums ${difference < 0 ? 'text-red-600 dark:text-red-400' : difference > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                        {formatCurrency(difference)}
                                    </span>
                                </div>
                            </div>

                            {/* Spacer */}
                            <div className="flex-1"></div>

                            {/* Footer Actions Integrated */}
                            <div className="space-y-3 pt-4 mt-auto border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={handleConfirmClose}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-3 h-14 px-6 font-black text-white transition-all rounded-xl shadow-xl bg-primary hover:bg-primary/90 shadow-primary/25 disabled:opacity-50 active:scale-[0.98]"
                                >
                                    <span className="material-symbols-outlined">check_circle</span>
                                    {loading ? 'Cerrando...' : 'Confirmar Cierre'}
                                </button>
                                <button
                                    onClick={() => setClosing(false)}
                                    className="w-full flex items-center justify-center gap-2 h-12 px-6 font-bold transition-colors bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                    Cancelar
                                </button>
                                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest opacity-60">
                                    ESTE PROCESO ES IRREVERSIBLE
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
