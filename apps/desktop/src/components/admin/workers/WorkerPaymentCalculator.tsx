// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { ConfirmationModal } from '../../modals/ConfirmationModal';

interface PaymentRecord {
    id: string;
    created_at: string;
    amount: number;
    description: string;
}

interface Worker {
    id: string;
    name: string;
}

interface Commission {
    id: number;
    created_at: string;
    sale_id: string;
    service_type: string;
    base_amount: number;
    commission_percentage: number;
    commission_amount: number;
    status: 'pending' | 'paid';
    sale: {
        created_at: string;
    };
    sale_item: {
        name: string;
    };
}

export const WorkerPaymentCalculator = () => {
    const cashSession = useSessionStore((state) => state.cashSession);
    const user = useSessionStore((state) => state.user);

    const [workers, setWorkers] = useState<Worker[]>([]);
    const [selectedWorker, setSelectedWorker] = useState<string>('');
    const [startDate, setStartDate] = useState<string>(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );

    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [processingFixed, setProcessingFixed] = useState(false);
    const [fixedPaymentAmount, setFixedPaymentAmount] = useState('');

    // Pagination State
    const [commissionsPage, setCommissionsPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '' as React.ReactNode,
        onConfirm: async () => { },
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isProcessing: false
    });

    // Loan State
    const [activeLoans, setActiveLoans] = useState<any[]>([]);
    const [loanDeduction, setLoanDeduction] = useState('');
    const [fixedLoanDeduction, setFixedLoanDeduction] = useState('');

    useEffect(() => {
        fetchWorkers();
    }, []);

    useEffect(() => {
        if (selectedWorker) {
            setCommissionsPage(1);
            setHistoryPage(1);
            fetchCommissions();
            fetchPaymentHistory();
            fetchActiveLoans();
        } else {
            setCommissions([]);
            setPaymentHistory([]);
            setActiveLoans([]);
            setLoanDeduction('');
        }
    }, [selectedWorker, startDate, endDate]);

    const fetchWorkers = async () => {
        const { data } = await supabase
            .from('workers')
            .select('id, name')
            .eq('active', true)
            .order('name');
        setWorkers(data || []);
    };

    const fetchCommissions = async () => {
        setLoading(true);
        try {
            const [sy, sm, sd] = startDate.split('-').map(Number);
            const localStart = new Date(sy, sm - 1, sd, 0, 0, 0);
            const [ey, em, ed] = endDate.split('-').map(Number);
            const localEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);

            const { data, error } = await supabase
                .from('worker_commissions')
                .select(`
                    *,
                    sale:sales(created_at),
                    sale_item:sale_items(name)
                `)
                .eq('worker_id', selectedWorker)
                .gte('created_at', localStart.toISOString())
                .lte('created_at', localEnd.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCommissions(data || []);
        } catch (error) {
            console.error('Error fetching commissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentHistory = async () => {
        setLoadingHistory(true);
        try {
            const workerName = workers.find(w => w.id === selectedWorker)?.name;
            if (!workerName) return;

            const [sy, sm, sd] = startDate.split('-').map(Number);
            const localStart = new Date(sy, sm - 1, sd, 0, 0, 0);
            const [ey, em, ed] = endDate.split('-').map(Number);
            const localEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);

            const { data, error } = await (supabase as any)
                .from('central_cash_movements')
                .select('*')
                .or(`description.ilike.%${workerName}%,description.ilike.%Nómina%,description.ilike.%comisiones%`)
                .eq('type', 'expense')
                .gte('created_at', localStart.toISOString())
                .lte('created_at', localEnd.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPaymentHistory(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchActiveLoans = async () => {
        if (!selectedWorker) return;
        const { data } = await supabase
            .from('worker_loans')
            .select('*')
            .eq('worker_id', selectedWorker)
            .neq('status', 'paid');
        setActiveLoans(data || []);
    };

    const distributeLoanDeduction = async (amount: number, businessId: string) => {
        if (amount <= 0) return;
        let remaining = amount;

        // Pass 1: Authorized amounts
        const loansWithAuth = activeLoans.filter(l => (l.pending_deduction_amount || 0) > 0);
        for (const loan of loansWithAuth) {
            if (remaining <= 0) break;
            const balance = loan.amount - (loan.total_paid || 0);
            const authorized = loan.pending_deduction_amount || 0;
            const toPay = Math.min(remaining, balance, authorized);

            if (toPay > 0) {
                await (supabase as any).from('worker_loan_payments').insert({
                    loan_id: loan.id,
                    amount: toPay,
                    type: 'deduction',
                    business_id: businessId,
                    notes: `Deducción automática (Autorizada)`
                });
                await supabase.from('worker_loans')
                    .update({ pending_deduction_amount: Math.max(0, authorized - toPay) })
                    .eq('id', loan.id);
                remaining -= toPay;
            }
        }

        // Pass 2: Remaining balance
        if (remaining > 0) {
            for (const loan of activeLoans) {
                if (remaining <= 0) break;
                const balance = loan.amount - (loan.total_paid || 0);
                if (balance <= 0) continue;

                const toPay = Math.min(remaining, balance);
                if (toPay > 0) {
                    await (supabase as any).from('worker_loan_payments').insert({
                        loan_id: loan.id,
                        amount: toPay,
                        type: 'deduction',
                        business_id: businessId,
                        notes: `Deducción automática (Excedente)`
                    });
                    remaining -= toPay;
                }
            }
        }
    };

    const totalLoanDebt = activeLoans.reduce((sum, loan) => sum + (loan.amount - (loan.total_paid || 0)), 0);
    const totalCommission = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
    const pendingCommission = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0);

    const handleMarkAsPaid = async () => {
        const pendingCommissions = commissions.filter(c => c.status === 'pending');
        if (pendingCommissions.length === 0) return;

        const totalToPay = pendingCommission;
        const deduction = parseFloat(loanDeduction) || 0;

        if (deduction > totalToPay) {
            alert('El descuento no puede ser mayor al total a pagar.');
            return;
        }

        if (deduction > totalLoanDebt) {
            alert('El descuento no puede ser mayor a la deuda total.');
            return;
        }

        const netPay = totalToPay - deduction;
        const workerName = workers.find(w => w.id === selectedWorker)?.name || 'Trabajador';
        const businessId = useBusinessStore.getState().id;

        setConfirmModal({
            isOpen: true,
            title: 'Confirmar Liquidación',
            message: (
                <div className="space-y-3 text-left bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Total Comisiones:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">${totalToPay.toLocaleString()}</span>
                    </div>
                    {deduction > 0 && (
                        <div className="flex justify-between text-rose-500 font-bold border-l-4 border-rose-500 pl-2">
                            <span>Descuento Préstamo:</span>
                            <span>-${deduction.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-xl">
                        <span className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">NETO A PAGAR:</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">${netPay.toLocaleString()}</span>
                    </div>
                </div>
            ),
            type: 'warning',
            isProcessing: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isProcessing: true }));
                try {
                    // 1. Register Cash Movement
                    const { error: movementError } = await (supabase as any)
                        .from('central_cash_movements')
                        .insert({
                            type: 'expense',
                            amount: netPay,
                            description: `Pago comisiones a ${workerName} (Neto: ${netPay}, Dscto: ${deduction}) [CAJA CENTRAL]`,
                            user_id: (user?.id && user.id !== 'terminal-local') ? user.id : null,
                            business_id: businessId,
                        });

                    if (movementError) throw movementError;

                    // 2. Register Loan Deduction
                    if (deduction > 0) {
                        await distributeLoanDeduction(deduction, businessId);
                    }

                    // 3. Mark commissions as Paid
                    const ids = pendingCommissions.map(c => c.id);
                    const { error } = await supabase
                        .from('worker_commissions')
                        .update({ status: 'paid', paid_at: new Date().toISOString() })
                        .in('id', ids);

                    if (error) throw error;

                    await fetchCommissions();
                    await fetchPaymentHistory();
                    await fetchActiveLoans();
                    setLoanDeduction('');
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    console.error('Error marking as paid:', error);
                    alert('Error al liquidar comisiones.');
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } finally {
                    setConfirmModal(prev => ({ ...prev, isProcessing: false }));
                }
            }
        });
    };

    const handleFixedPayment = async () => {
        const amount = parseFloat(fixedPaymentAmount);
        const deduction = parseFloat(fixedLoanDeduction) || 0;

        if (!amount || amount <= 0) {
            alert('Ingresa un monto válido para el salario.');
            return;
        }

        if (deduction > amount) {
            alert('el descuento no puede ser mayor al salario.');
            return;
        }

        if (deduction > totalLoanDebt) {
            alert('El descuento no puede ser mayor a la deuda total.');
            return;
        }

        const netPay = amount - deduction;
        const workerName = workers.find(w => w.id === selectedWorker)?.name || 'Trabajador';
        const businessId = useBusinessStore.getState().id;

        setConfirmModal({
            isOpen: true,
            title: 'Confirmar Pago Salario',
            message: (
                <div className="space-y-3 text-left bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Salario Base:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">${amount.toLocaleString()}</span>
                    </div>
                    {deduction > 0 && (
                        <div className="flex justify-between text-rose-500 font-bold border-l-4 border-rose-500 pl-2">
                            <span>Descuento Préstamo:</span>
                            <span>-${deduction.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-xl">
                        <span className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">NETO A PAGAR:</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">${netPay.toLocaleString()}</span>
                    </div>
                </div>
            ),
            type: 'warning',
            isProcessing: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isProcessing: true }));
                try {
                    // 1. Register Movement (Central Cash)
                    const { error: movementError } = await (supabase as any)
                        .from('central_cash_movements')
                        .insert({
                            type: 'expense',
                            amount: netPay,
                            description: `Pago de Nómina (Fija) a ${workerName} (Neto: ${netPay}, Dscto: ${deduction}) [CAJA CENTRAL]`,
                            user_id: (user?.id && user.id !== 'terminal-local') ? user.id : null,
                            business_id: businessId,
                        });

                    if (movementError) throw movementError;

                    // 2. Register Loan Deduction if applicable
                    if (deduction > 0) {
                        await distributeLoanDeduction(deduction, businessId);
                    }

                    setFixedPaymentAmount('');
                    setFixedLoanDeduction('');
                    fetchPaymentHistory();
                    fetchActiveLoans();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    console.error('Error fixed payment:', error);
                    alert(`Error al registrar pago: ${error.message}`);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } finally {
                    setConfirmModal(prev => ({ ...prev, isProcessing: false }));
                }
            }
        });
    };

    const setPeriod = (type: 'today' | 'week' | 'month') => {
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);

        if (type === 'today') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (type === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            end.setDate(diff + 6);
        } else {
            start.setDate(1);
            end.setMonth(now.getMonth() + 1);
            end.setDate(0);
        }

        const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    };

    return (
        <div className="space-y-8">
            {/* Filters */}
            <div className="flex flex-col gap-6 pb-8 border-b border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-end">
                    <div className="lg:col-span-1">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Trabajador</label>
                        <select
                            value={selectedWorker}
                            onChange={(e) => setSelectedWorker(e.target.value)}
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-200"
                        >
                            <option value="">Seleccionar trabajador...</option>
                            {workers.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Desde</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-200"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Hasta</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 flex-1">
                        <button onClick={() => setPeriod('today')} className="flex-1 py-3.5 px-4 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-black text-xs uppercase rounded-2xl transition-all">Hoy</button>
                        <button onClick={() => setPeriod('week')} className="flex-1 py-3.5 px-4 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-black text-xs uppercase rounded-2xl transition-all">Semana</button>
                        <button onClick={() => setPeriod('month')} className="flex-1 py-3.5 px-4 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-black text-xs uppercase rounded-2xl transition-all">Mes</button>
                    </div>
                </div>
            </div>

            {selectedWorker && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Summary Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                            <h3 className="text-lg font-bold opacity-90 mb-1">Total Pendiente</h3>
                            <div className="text-4xl font-black mb-4">${pendingCommission.toLocaleString()}</div>

                            {totalLoanDebt > 0 && (
                                <div className="mt-4 p-3 bg-white/10 rounded-xl border border-white/20">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold uppercase opacity-80">Deuda Préstamos</span>
                                        <span className="font-black text-amber-300">${totalLoanDebt.toLocaleString()}</span>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 font-bold">$</span>
                                        <input
                                            type="number"
                                            value={loanDeduction}
                                            onChange={(e) => setLoanDeduction(e.target.value)}
                                            placeholder="Descontar..."
                                            className="w-full pl-6 pr-12 py-2 bg-black/20 border border-white/10 rounded-lg text-white font-bold text-sm outline-none focus:bg-black/30 transition-all"
                                        />
                                        <button
                                            onClick={() => setLoanDeduction(Math.min(pendingCommission, totalLoanDebt).toString())}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[10px] font-black bg-white/20 hover:bg-white/40 rounded uppercase transition-colors"
                                        >
                                            Max
                                        </button>
                                    </div>
                                    {loanDeduction && !isNaN(parseFloat(loanDeduction)) && (
                                        <div className="flex justify-between items-center mt-2 text-xs font-bold bg-black/20 p-2 rounded-lg">
                                            <span className="opacity-70">Total a Recibir:</span>
                                            <span className="text-emerald-300 text-sm">${(pendingCommission - parseFloat(loanDeduction)).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleMarkAsPaid}
                                disabled={pendingCommission === 0 || processingPayment}
                                className="w-full mt-6 py-3 bg-white text-primary font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {processingPayment ? 'Procesando...' : 'Marcar como Pagado'}
                            </button>
                        </div>

                        <div className="p-6 border border-slate-200 dark:border-slate-700 rounded-2xl">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4">Estadísticas</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Servicios Realizados</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{commissions.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Deuda Restante</span>
                                    <span className="font-bold text-amber-600">${totalLoanDebt.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">payments</span>
                                Pago Salario Fijo
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto Salario</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            value={fixedPaymentAmount}
                                            onChange={(e) => setFixedPaymentAmount(e.target.value)}
                                            placeholder="0"
                                            className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descuento Préstamo</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            value={fixedLoanDeduction}
                                            onChange={(e) => setFixedLoanDeduction(e.target.value)}
                                            placeholder="0"
                                            className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold"
                                        />
                                        {totalLoanDebt > 0 && (
                                            <button
                                                onClick={() => setFixedLoanDeduction(Math.min(parseFloat(fixedPaymentAmount) || 0, totalLoanDebt).toString())}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[8px] font-black bg-indigo-100 text-indigo-600 rounded uppercase"
                                            >
                                                Max
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleFixedPayment}
                                disabled={!fixedPaymentAmount || processingFixed}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                {processingFixed ? 'Procesando...' : 'Registrar Pago Fijo'}
                            </button>
                        </div>
                    </div>

                    {/* Commissions Table */}
                    <div className="lg:col-span-2">
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 dark:text-white">Detalle de Comisiones</h3>
                                <span className="text-xs text-slate-500">{commissions.length} registros</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-500 uppercase font-black">
                                        <tr>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3">Servicio</th>
                                            <th className="px-4 py-3">Monto</th>
                                            <th className="px-4 py-3">Comisión</th>
                                            <th className="px-4 py-3 text-right">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {loading ? (
                                            <tr><td colSpan={5} className="py-10 text-center text-slate-400">Cargando...</td></tr>
                                        ) : commissions.length === 0 ? (
                                            <tr><td colSpan={5} className="py-10 text-center text-slate-400">Sin registros</td></tr>
                                        ) : (
                                            commissions.slice((commissionsPage - 1) * ITEMS_PER_PAGE, commissionsPage * ITEMS_PER_PAGE).map(comm => (
                                                <tr key={comm.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 text-slate-500">{new Date(comm.created_at).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 font-medium">{comm.sale_item?.name || 'Varios'}</td>
                                                    <td className="px-4 py-3 opacity-60">${comm.base_amount.toLocaleString()}</td>
                                                    <td className="px-4 py-3 font-bold text-emerald-600">${comm.commission_amount.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${comm.status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {comm.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* History Table */}
            {selectedWorker && paymentHistory.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Historial de Egresos</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-500 uppercase font-black">
                                <tr>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Concepto</th>
                                    <th className="px-4 py-3 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {paymentHistory.map(payment => (
                                    <tr key={payment.id}>
                                        <td className="px-4 py-3 text-slate-500">{new Date(payment.created_at).toLocaleString()}</td>
                                        <td className="px-4 py-3 font-medium text-slate-600">{payment.description}</td>
                                        <td className="px-4 py-3 text-right font-black text-rose-600">${payment.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isProcessing={confirmModal.isProcessing}
            />
        </div>
    );
};
