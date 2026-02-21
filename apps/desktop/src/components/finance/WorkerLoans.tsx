import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { Pagination } from '../ui/Pagination';

interface Loan {
    id: string;
    worker_id: string;
    amount: number;
    status: 'pending' | 'partial' | 'paid';
    notes: string;
    request_date: string;
    created_at: string;
    worker?: {
        name: string;
    };
    total_paid?: number;
}

export const WorkerLoans = () => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [workers, setWorkers] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLoanModal, setShowLoanModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

    // Form states
    const [newLoan, setNewLoan] = useState({ worker_id: '', amount: '', notes: '' });
    const [payment, setPayment] = useState({ amount: '', type: 'payment' as 'payment' | 'deduction' });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const cashSession = useSessionStore((state) => state.cashSession);
    const user = useSessionStore((state) => state.user);

    const fetchData = async () => {
        setLoading(true);
        try {
            const businessId = useBusinessStore.getState().id;

            // Fetch Loans
            const { data: loansData, error: loansError } = await (supabase as any)
                .from('worker_loans')
                .select(`
                    *,
                    worker:workers(name)
                `)
                .eq('business_id', businessId)
                .order('created_at', { ascending: false });

            if (loansError) throw loansError;

            // Fetch Workers for the new loan form
            const { data: workersData, error: workersError } = await (supabase as any)
                .from('workers')
                .select('id, name')
                .eq('business_id', businessId)
                .order('name');

            if (workersError) {
                console.error('Error fetching workers:', workersError);
            }

            setLoans(loansData || []);
            setWorkers(workersData || []);
        } catch (err: any) {
            console.error('Error fetching loans data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateLoan = async () => {
        if (!newLoan.worker_id || !newLoan.amount) return;

        try {
            const { error: loanError } = await (supabase as any)
                .from('worker_loans')
                .insert({
                    worker_id: newLoan.worker_id,
                    amount: parseFloat(newLoan.amount),
                    notes: newLoan.notes,
                    business_id: useBusinessStore.getState().id,
                });

            if (loanError) throw loanError;

            // If cash session active, record an expense (salida de dinero)
            if (cashSession && !isNaN(parseFloat(newLoan.amount))) {
                const workerName = workers.find(w => w.id === newLoan.worker_id)?.name;
                const concept = `Préstamo a trabajador: ${workerName}`;

                // Track user id correctly (avoiding 'terminal-local' uuid errors)

                // "Smart" logic: Try with user ID, if it's a zombie session (FK error), retry as anonymous
                const movementPayload = {
                    amount: parseFloat(newLoan.amount),
                    type: 'expense',
                    description: concept,
                    user_id: user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) ? user.id : null,
                    business_id: useBusinessStore.getState().id,
                };

                let { error: moveError } = await (supabase as any)
                    .from('cash_movements')
                    .insert(movementPayload);

                // Retry with null user_id if FK violation (Zombie Session)
                if (moveError && moveError.code === '23503') {
                    console.warn('User ID mismatch (Zombie Session), retrying anonymously...');
                    const { error: retryError } = await (supabase as any)
                        .from('cash_movements')
                        .insert({ ...movementPayload, user_id: null });
                    moveError = retryError;
                }

                if (moveError) {
                    console.error('Error recording movement:', moveError);
                    alert(`Préstamo creado pero falló el registro en caja: ${moveError.message}`);
                }
            }

            setShowLoanModal(false);
            setNewLoan({ worker_id: '', amount: '', notes: '' });
            fetchData();
        } catch (err: any) {
            console.error('Error creating loan:', err);
            alert(`Error al crear préstamo: ${err.message || 'Error desconocido'}`);
        }
    };

    const handleRegisterPayment = async () => {
        if (!selectedLoan || !payment.amount) return;

        try {
            const amount = parseFloat(payment.amount);
            const { error: payError } = await (supabase as any)
                .from('worker_loan_payments')
                .insert({
                    loan_id: selectedLoan.id,
                    amount: amount,
                    type: 'payment',
                    cash_session_id: cashSession?.id,
                    business_id: useBusinessStore.getState().id,
                });

            if (payError) throw payError;

            // If it's a direct payment (cash) and session active, record income
            if (cashSession) {
                const concept = `Pago de préstamo: ${selectedLoan.worker?.name}`;

                // "Smart" logic: Try with user ID, if it's a zombie session (FK error), retry as anonymous
                const movementPayload = {
                    amount: amount,
                    type: 'income',
                    description: concept,
                    user_id: user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) ? user.id : null,
                    business_id: useBusinessStore.getState().id,
                };

                let { error: moveError } = await (supabase as any)
                    .from('cash_movements')
                    .insert(movementPayload);

                // Retry with null user_id if FK violation (Zombie Session)
                if (moveError && moveError.code === '23503') {
                    console.warn('User ID mismatch (Zombie Session), retrying anonymously...');
                    const { error: retryError } = await (supabase as any)
                        .from('cash_movements')
                        .insert({ ...movementPayload, user_id: null });
                    moveError = retryError;
                }

                if (moveError) {
                    console.error('Error recording movement:', moveError);
                    alert(`Pago registrado pero falló el ingreso en caja: ${moveError.message}`);
                }
            }

            setShowPaymentModal(false);
            setPayment({ amount: '', type: 'payment' });
            setSelectedLoan(null);
            fetchData();
        } catch (err: any) {
            console.error('Error registering payment:', err);
            alert(`Error al registrar pago: ${err.message || 'Error desconocido'}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Préstamos y Adelantos</h2>
                <button
                    onClick={() => setShowLoanModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <span className="material-symbols-outlined !text-[20px]">add</span>
                    Nuevo Préstamo
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Trabajador</th>
                                <th className="px-6 py-4">Monto Original</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Fecha Solicitud</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Cargando...</td></tr>
                            ) : loans.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No hay préstamos registrados</td></tr>
                            ) : loans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(loan => (
                                <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{loan.worker?.name}</td>
                                    <td className="px-6 py-4 font-black">${loan.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${loan.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                            loan.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                                                'bg-rose-100 text-rose-700'
                                            }`}>
                                            {loan.status === 'paid' ? 'Pagado' : loan.status === 'partial' ? 'Parcial' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                        {new Date(loan.request_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {loan.status !== 'paid' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedLoan(loan);
                                                    setShowPaymentModal(true);
                                                }}
                                                className="px-4 py-1.5 bg-primary text-white text-[11px] font-black rounded-lg hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 uppercase"
                                            >
                                                Abonar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {loans.length > itemsPerPage && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(loans.length / itemsPerPage)}
                            onPageChange={setCurrentPage}
                            totalItems={loans.length}
                            itemsPerPage={itemsPerPage}
                        />
                    </div>
                )}
            </div>

            {/* New Loan Modal */}
            {showLoanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Nuevo Préstamo</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Trabajador</label>
                                <select
                                    value={newLoan.worker_id}
                                    onChange={(e) => setNewLoan({ ...newLoan, worker_id: e.target.value })}
                                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary font-bold transition-all"
                                >
                                    <option value="">Seleccionar...</option>
                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Monto</label>
                                <input
                                    type="number"
                                    value={newLoan.amount}
                                    onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })}
                                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary font-bold transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Notas</label>
                                <textarea
                                    value={newLoan.notes}
                                    onChange={(e) => setNewLoan({ ...newLoan, notes: e.target.value })}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary font-medium text-sm transition-all resize-none h-24"
                                />
                            </div>
                            <button
                                onClick={handleCreateLoan}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/25 hover:scale-[1.02] transition-all"
                            >
                                REGISTRAR PRÉSTAMO
                            </button>
                            <button onClick={() => setShowLoanModal(false)} className="w-full py-2 text-slate-400 font-bold text-sm">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedLoan && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">Registrar Abono</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Sesión de Caja Requerida</p>
                            </div>
                            <button onClick={() => setShowPaymentModal(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Concepto: {selectedLoan.worker?.name}</p>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Saldo Pendiente</p>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white">${(selectedLoan.amount - (selectedLoan.total_paid || 0)).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Deuda</p>
                                        <p className="text-sm font-bold text-slate-500">${selectedLoan.amount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Monto a Recibir</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-xl">$</span>
                                    <input
                                        type="number"
                                        value={payment.amount}
                                        onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full pl-10 pr-6 py-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl font-black text-2xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            {!cashSession && (
                                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100">
                                    <span className="material-symbols-outlined text-rose-500 !text-sm">warning</span>
                                    <p className="text-[9px] text-rose-600 font-black uppercase tracking-widest">
                                        Error: No hay una sesión de caja abierta para registrar este ingreso.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleRegisterPayment}
                                disabled={!payment.amount || !cashSession}
                                className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed mt-4 uppercase tracking-widest text-sm"
                            >
                                Confirmar Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
