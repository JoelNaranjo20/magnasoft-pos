import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';

export const CashierStatus = () => {
    const cashSession = useSessionStore((state) => state.cashSession);
    const [stats, setStats] = useState({
        totalSales: 0,
        cashSales: 0,
        creditSales: 0,
        transferSales: 0,
        cardSales: 0,
        pendingCredits: 0,
        incomes: 0,
        expenses: 0
    });
    const [sessionItems, setSessionItems] = useState<{
        credits: any[],
        loans: any[]
    }>({ credits: [], loans: [] });
    // const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessionStats = async () => {
            if (!cashSession) {
                // setLoading(false);
                return;
            }

            try {
                // 1. Fetch Sales for this session
                const { data: sales } = await (supabase as any)
                    .from('sales')
                    .select('id, total_amount, payment_method')
                    .eq('session_id', cashSession.id)
                    .eq('status', 'completed');

                const summary = (sales || []).reduce((acc: any, sale: any) => {
                    acc.total += sale.total_amount;
                    if (sale.payment_method === 'cash') acc.cash += sale.total_amount;
                    else if (sale.payment_method === 'credit') acc.credit += sale.total_amount;
                    else if (sale.payment_method === 'card') acc.card += sale.total_amount;
                    else if (sale.payment_method === 'transfer') acc.transfer += sale.total_amount;
                    return acc;
                }, { total: 0, cash: 0, credit: 0, card: 0, transfer: 0 });

                // 2. Fetch Cash Movements
                const { data: movements } = await supabase
                    .from('cash_movements')
                    .select('id, amount, type, description')
                    .eq('session_id', cashSession.id);

                const movs = (movements || []).reduce((acc: any, m: any) => {
                    if (m.type === 'income') acc.incomes += m.amount;
                    else acc.expenses += m.amount;
                    return acc;
                }, { incomes: 0, expenses: 0 });

                // 3. Fetch specific items for this session to list them
                // We fetch debts where sale_id belongs to this session
                const { data: sessionDebts } = await (supabase as any)
                    .from('customer_debts')
                    .select('*, customer:customers(name)')
                    .in('sale_id', sales?.map((s: any) => s.id) || []);

                // Calculate actual pending credits from remaining amounts
                const actualPendingCredits = (sessionDebts || []).reduce((sum: number, debt: any) => {
                    return sum + (debt.remaining_amount || 0);
                }, 0);

                // Fetch loans linked to this session via the movements
                const loanIds = (movements || [])
                    .filter((m: any) => m.description?.includes('Préstamo'))
                    .map((m: any) => m.id);

                const { data: sessionLoans } = await (supabase as any)
                    .from('worker_loans')
                    .select('*, worker:workers(name)')
                    .in('id', loanIds.length > 0 ? loanIds : ['00000000-0000-0000-0000-000000000000']);

                // For simplicity first iteration:
                setStats({
                    totalSales: summary.total,
                    cashSales: summary.cash,
                    creditSales: summary.credit,
                    cardSales: summary.card,
                    transferSales: summary.transfer,
                    pendingCredits: actualPendingCredits, // Now uses actual remaining amounts
                    incomes: movs.incomes,
                    expenses: movs.expenses
                });

                setSessionItems({
                    credits: sessionDebts || [],
                    loans: sessionLoans || []
                });

            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                // setLoading(false);
            }
        };

        fetchSessionStats();
    }, [cashSession]);

    if (!cashSession) {
        return (
            <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <span className="material-symbols-outlined text-4xl text-slate-300">point_of_sale</span>
                <h3 className="mt-2 font-bold text-slate-500">No hay sesión de caja activa</h3>
                <p className="text-sm text-slate-400">Abre una caja desde el POS para ver estadísticas.</p>
            </div>
        );
    }

    const currentCash = (cashSession.start_amount || 0) + stats.cashSales + stats.incomes - stats.expenses;

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="flex h-3 w-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white">Caja Abierta</h2>
                    </div>
                    <p className="text-sm text-slate-500">
                        Iniciada: <span className="font-bold">{new Date(cashSession.opened_at).toLocaleString()}</span>
                    </p>
                    <p className="text-xs font-mono text-slate-400 mt-1">ID: {cashSession.id}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Efectivo en Caja (Teórico)</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-white">
                        ${currentCash.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Base Inicial</p>
                    <p className="text-2xl font-black text-slate-700 dark:text-slate-300">${(cashSession.start_amount || 0).toLocaleString()}</p>
                </div>
                <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Ventas Efectivo</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">+ ${stats.cashSales.toLocaleString()}</p>
                </div>
                <div className="p-5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Tarjetas / Transf.</p>
                    <p className="text-2xl font-black text-blue-700 dark:text-blue-400">+ ${(stats.cardSales + stats.transferSales).toLocaleString()}</p>
                </div>
                <div className="p-5 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-800/30">
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-2">Faltante (Pendientes)</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                        - ${(stats.pendingCredits + (sessionItems.loans.reduce((sum, l) => sum + l.amount, 0))).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Detailed List of Pending Items in Session */}
            {(sessionItems.credits.length > 0 || sessionItems.loans.length > 0) && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined !text-lg">list_alt</span>
                            Detalle de Pendientes (Esta Sesión)
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {sessionItems.credits.map((debt: any) => (
                            <div key={debt.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{debt.customer?.name || 'Cliente'}</p>
                                        <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Crédito de Venta</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-rose-600">-${debt.remaining_amount.toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-slate-400">{debt.status === 'pending' ? 'Pendiente' : 'Abonado'}</p>
                                </div>
                            </div>
                        ))}
                        {sessionItems.loans.map((loan: any) => (
                            <div key={loan.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                                        <span className="material-symbols-outlined">badge</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{loan.worker?.name || 'Trabajador'}</p>
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Préstamo/Adelanto</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-rose-600">-${loan.amount.toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-slate-400">Salida de Caja</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Alert Section for Credits */}
            {stats.pendingCredits > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-600 mt-0.5">info</span>
                    <div>
                        <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Resumen de Cartera</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                            Hay <strong>${stats.pendingCredits.toLocaleString()}</strong> pendientes de cobro en esta sesión.
                            {sessionItems.credits.length > 0 && ` Clientes: ${sessionItems.credits.map((c: any) => c.customer?.name).join(', ')}.`}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
