import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { Pagination } from '../ui/Pagination';
import { useAuthStore, selectIsAdmin } from '@shared/store/useAuthStore';
import { EditDebtModal } from '../modals/EditDebtModal';

interface CombinedDebt {
    id: string;
    type: 'customer' | 'worker';
    name: string;
    total_amount: number;
    remaining_amount: number;
    status: string;
    date: string;
    id_ref: string;
    description?: string;
    customer_id?: string;
    worker_id?: string;
}

interface CombinedPayment {
    id: string;
    type: 'customer' | 'worker';
    name: string;
    amount: number;
    method: string;
    date: string;
    notes: string;
}

export const CarteraHub = () => {
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'pendientes' | 'historial'>('pendientes');
    const [pendingItems, setPendingItems] = useState<CombinedDebt[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<CombinedPayment[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<CombinedDebt | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
    const [cashTarget, setCashTarget] = useState<'daily' | 'central'>('daily');

    // Edit Debt CRUD State
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEditItem, setSelectedEditItem] = useState<CombinedDebt | null>(null);
    const isAdmin = useAuthStore(selectIsAdmin);

    // Derived: whether the selected item's credit was created today
    const isCreditFromToday = selectedItem
        ? new Date(selectedItem.date).toDateString() === new Date().toDateString()
        : false;

    const [searchTerm, setSearchTerm] = useState('');

    // --- New Manual Debt State ---
    const [debtMode, setDebtMode] = useState<'single' | 'bulk'>('single');
    const [bulkDebts, setBulkDebts] = useState<{
        id: string;
        customerId: string | null;
        customerName: string;
        amount: number;
        notes: string;
    }[]>([]);
    const [showNewDebtModal, setShowNewDebtModal] = useState(false);
    const [newDebtAmount, setNewDebtAmount] = useState('');
    const [newDebtNotes, setNewDebtNotes] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState<{ id: string, name: string }[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Pagination State
    const [pendingPage, setPendingPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const itemsPerPage = 10;

    const [stats, setStats] = useState({
        customerTotal: 0,
        workerTotal: 0,
        receivedToday: 0,
        currentCash: 0,
        cashSales: 0,
        transferCardSales: 0
    });

    const cashSession = useSessionStore((state) => state.cashSession);
    const businessId = useBusinessStore((state: any) => state.id);

    const [openTooltip, setOpenTooltip] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Customer Debts
            const { data: customerDebts } = await (supabase as any)
                .from('customer_debts')
                .select('*, customer:customers(name), sale:sales(sale_items(name))')
                .neq('status', 'paid');

            // 2. Fetch Worker Loans
            const { data: workerLoans } = await (supabase as any)
                .from('worker_loans')
                .select('*, worker:workers(name)')
                .neq('status', 'paid');

            // 3. Combine Pending
            const combinedPendientes: CombinedDebt[] = [
                ...(customerDebts || []).map((d: any) => {
                    let desc = d.notes || 'Crédito';
                    if (d.sale && d.sale.sale_items && d.sale.sale_items.length > 0) {
                        desc = d.sale.sale_items.map((i: any) => i.name).filter(Boolean).join(', ');
                    }
                    return {
                        id: d.id,
                        type: 'customer' as const,
                        name: d.customer?.name || 'Cliente',
                        total_amount: d.amount,
                        remaining_amount: d.remaining_amount,
                        status: d.status,
                        date: d.created_at,
                        id_ref: d.sale_id ? d.sale_id.split('-')[0] : 'MANUAL',
                        description: desc,
                        customer_id: d.customer_id
                    };
                }),
                ...(workerLoans || []).map((l: any) => ({
                    id: l.id,
                    type: 'worker' as const,
                    name: l.worker?.name || 'Trabajador',
                    total_amount: l.amount,
                    remaining_amount: l.amount - (l.total_paid || 0),
                    status: l.status,
                    date: l.created_at,
                    id_ref: 'PRESTAMO',
                    description: l.notes || 'Préstamo / Adelanto',
                    worker_id: l.worker_id
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // 4. Fetch History
            const { data: debtPayments } = await (supabase as any)
                .from('debt_payments')
                .select('*, debt:customer_debts(customer:customers(name))')
                .order('created_at', { ascending: false })
                .limit(100);

            const { data: loanPayments } = await (supabase as any)
                .from('worker_loan_payments')
                .select('*, loan:worker_loans(worker:workers(name))')
                .order('created_at', { ascending: false })
                .limit(100);

            const combinedHistory: CombinedPayment[] = [
                ...(debtPayments || []).map((p: any) => ({
                    id: p.id,
                    type: 'customer' as const,
                    name: p.debt?.customer?.name || 'Cliente',
                    amount: p.amount,
                    method: p.payment_method,
                    date: p.created_at,
                    notes: p.notes || 'Abono a deuda'
                })),
                ...(loanPayments || []).map((p: any) => ({
                    id: p.id,
                    type: 'worker' as const,
                    name: p.loan?.worker?.name || 'Trabajador',
                    amount: p.amount,
                    method: p.type === 'deduction' ? 'Descuento Nómina' : 'Efectivo',
                    date: p.created_at,
                    notes: 'Abono a préstamo'
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // 5. Fetch Session Stats if active
            let cashSales = 0;
            let incomes = 0;
            let expenses = 0;

            if (cashSession) {
                const { data: sales } = await (supabase as any)
                    .from('sales')
                    .select('total_amount, payment_method')
                    .eq('session_id', cashSession.id)
                    .eq('status', 'completed');

                (sales || []).forEach((s: any) => {
                    if (s.payment_method === 'cash') cashSales += s.total_amount;
                });

                const { data: movements } = await supabase
                    .from('cash_movements')
                    .select('amount, type, payment_method')
                    .eq('session_id', cashSession.id);

                (movements || []).forEach((m: any) => {
                    const isCash = !m.payment_method || m.payment_method === 'cash';
                    if (isCash) {
                        if (m.type === 'income') incomes += m.amount;
                        else expenses += m.amount;
                    }
                });
            }

            setPendingItems(combinedPendientes);
            setPaymentHistory(combinedHistory);

            const custTotal = (customerDebts || []).reduce((acc: number, d: any) => acc + d.remaining_amount, 0);
            const workTotal = (workerLoans || []).reduce((acc: number, l: any) => acc + (l.amount - (l.total_paid || 0)), 0);
            const today = new Date().toISOString().split('T')[0];
            const recToday = combinedHistory.filter(p => p.date.startsWith(today)).reduce((acc, p) => acc + p.amount, 0);

            setStats({
                customerTotal: custTotal,
                workerTotal: workTotal,
                receivedToday: recToday,
                currentCash: (cashSession?.start_amount || 0) + cashSales + incomes - expenses,
                cashSales,
                transferCardSales: 0
            });

        } catch (error) {
            console.error('Error fetching Cartera data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [cashSession?.id]);

    useEffect(() => {
        setPendingPage(1);
        setHistoryPage(1);
    }, [searchTerm]);

    useEffect(() => {
        if (!showNewDebtModal) return;
        const searchCustomers = async () => {
            if (customerSearchTerm.trim().length < 2) {
                setCustomerSearchResults([]);
                return;
            }

            const { data } = await supabase
                .from('customers')
                .select('id, name')
                .eq('business_id', businessId)
                .ilike('name', `%${customerSearchTerm.trim()}%`)
                .order('name', { ascending: true })
                .limit(20);

            setCustomerSearchResults(data || []);
        };
        const timeoutId = setTimeout(searchCustomers, 300);
        return () => clearTimeout(timeoutId);
    }, [customerSearchTerm, showNewDebtModal, businessId]);

    const handleCreateManualDebt = async () => {
        const currentBusinessId = useBusinessStore.getState().id || businessId;
        const amount = parseFloat(newDebtAmount);

        if (!customerSearchTerm.trim()) { alert('Ingresa o selecciona un cliente'); return; }
        if (!newDebtAmount || isNaN(amount) || amount <= 0) { alert('Ingresa un monto válido'); return; }
        if (!currentBusinessId) { alert('Error: No se detectó el negocio. Recarga la aplicación.'); return; }

        try {
            let finalCustomerId = selectedCustomerId;

            // If no customer is selected but there's text, create one on the fly
            if (!finalCustomerId) {
                const { data, error: createError } = await supabase
                    .from('customers')
                    .insert({ business_id: currentBusinessId, name: customerSearchTerm.trim() })
                    .select('id')
                    .single();
                if (createError) throw createError;
                finalCustomerId = data.id;
            }

            const { error } = await supabase.from('customer_debts').insert({
                business_id: currentBusinessId,
                customer_id: finalCustomerId,
                sale_id: null,
                amount: amount,
                remaining_amount: amount,
                notes: newDebtNotes || 'Fiado Manual',
                status: 'pending'
            });

            if (error) throw error;

            alert('✅ Crédito registrado correctamente');
            setShowNewDebtModal(false);
            setNewDebtAmount('');
            setNewDebtNotes('');
            setSelectedCustomerId(null);
            setCustomerSearchTerm('');
            fetchData();
        } catch (error: any) {
            console.error('❌ Error creating manual debt:', error);
            alert(`Error al registrar crédito: ${error?.message || JSON.stringify(error)}`);
        }
    };

    const handleAddToBulk = () => {
        const amount = parseFloat(newDebtAmount);
        if (!customerSearchTerm.trim()) { alert('Ingresa o selecciona un cliente'); return; }
        if (!newDebtAmount || isNaN(amount) || amount <= 0) { alert('Ingresa un monto válido'); return; }

        setBulkDebts([
            ...bulkDebts,
            {
                id: Math.random().toString(36).substr(2, 9),
                customerId: selectedCustomerId,
                customerName: customerSearchTerm.trim(),
                amount: amount,
                notes: newDebtNotes || 'Fiado Manual'
            }
        ]);

        // Reset form for next item
        setNewDebtAmount('');
        setNewDebtNotes('');
        setSelectedCustomerId(null);
        setCustomerSearchTerm('');
    };

    const handleRemoveFromBulk = (id: string) => {
        setBulkDebts(bulkDebts.filter(d => d.id !== id));
    };

    const handleSaveBulk = async () => {
        if (bulkDebts.length === 0) return;
        const currentBusinessId = useBusinessStore.getState().id || businessId;
        if (!currentBusinessId) { alert('Error: No se detectó el negocio. Recarga la aplicación.'); return; }

        try {
            // First pass: create missing customers
            const resolvedDebts = [];
            for (const debt of bulkDebts) {
                let cid = debt.customerId;
                if (!cid) {
                    const { data, error: createError } = await supabase
                        .from('customers')
                        .insert({ business_id: currentBusinessId, name: debt.customerName })
                        .select('id')
                        .single();
                    if (createError) throw createError;
                    cid = data.id;
                }
                resolvedDebts.push({
                    business_id: currentBusinessId,
                    customer_id: cid,
                    sale_id: null,
                    amount: debt.amount,
                    remaining_amount: debt.amount,
                    notes: debt.notes,
                    status: 'pending'
                });
            }

            const { error } = await supabase.from('customer_debts').insert(resolvedDebts);
            if (error) throw error;

            alert(`✅ ${bulkDebts.length} créditos registrados correctamente`);
            setShowNewDebtModal(false);
            setBulkDebts([]);
            setDebtMode('single');
            fetchData();
        } catch (error: any) {
            console.error('❌ Error saving bulk debts:', error);
            alert(`Error al guardar créditos masivos: ${error?.message || JSON.stringify(error)}`);
        }
    };

    const handlePayment = async () => {
        if (!selectedItem || !paymentAmount || isNaN(parseFloat(paymentAmount))) return;
        const amount = parseFloat(paymentAmount);

        // Determine destination: daily cash or central cash
        // - Credits from today: user chooses (cashTarget)
        // - Credits from previous days: always central cash
        const goToCentral = selectedItem.type === 'customer' && (!isCreditFromToday || cashTarget === 'central');

        console.log(`📅 CarteraHub | isToday: ${isCreditFromToday} | target: ${cashTarget} | goToCentral: ${goToCentral}`);

        try {
            if (selectedItem.type === 'customer') {
                const { error } = await (supabase as any)
                    .rpc('process_debt_payment', {
                        p_debt_id: selectedItem.id,
                        p_amount: amount,
                        p_payment_method: paymentMethod,
                        p_cash_session_id: goToCentral ? null : cashSession?.id,
                        p_notes: `Abono desde Hub de Cartera`
                    });
                if (error) throw error;

                // Register in Central Cash if needed
                if (goToCentral) {
                    const { data: { user } } = await supabase.auth.getUser();
                    const { error: centralError } = await (supabase as any)
                        .from('central_cash_movements')
                        .insert({
                            type: 'income',
                            amount: amount,
                            description: `Abono crédito - ${selectedItem.name} (${new Date(selectedItem.date).toLocaleDateString()})`,
                            user_id: user?.id,
                            business_id: useBusinessStore.getState().id,
                        });

                    if (centralError) {
                        console.error('⚠️ Error registering in Central Cash:', centralError);
                    } else {
                        console.log('✅ Abono registered in Central Cash');
                    }
                }
            } else {
                // Worker Loan Payment
                // Worker Loan Payment (Always Cash/Payment)
                const paymentPayload = {
                    loan_id: selectedItem.id,
                    amount: amount,
                    type: 'payment',
                    cash_session_id: cashSession?.id,
                    business_id: useBusinessStore.getState().id,
                };

                const { error: pError } = await (supabase as any)
                    .from('worker_loan_payments')
                    .insert(paymentPayload);
                if (pError) throw pError;

                if (cashSession) {
                    await (supabase as any)
                        .from('cash_movements')
                        .insert({
                            session_id: cashSession.id,
                            amount: amount,
                            type: 'income',
                            description: `Pago de préstamo: ${selectedItem.name} (Hub)`,
                            business_id: useBusinessStore.getState().id,
                        });
                }

                alert('Pago de préstamo registrado');
            }

            setShowPaymentModal(false);
            setPaymentAmount('');
            fetchData();
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Error al procesar el pago');
        }
    };

    const InfoTooltip = ({ id, text }: { id: string, text: string }) => (
        <div className="relative inline-block ml-2">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpenTooltip(openTooltip === id ? null : id);
                }}
                className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                title="Más información"
            >
                <span className="material-symbols-outlined !text-[14px]">info</span>
            </button>
            {openTooltip === id && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] font-bold rounded-2xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="relative">
                        {text}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-white/10"></div>
                    </div>
                </div>
            )}
        </div>
    );

    const filteredPending = pendingItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredHistory = paymentHistory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6" onClick={() => setOpenTooltip(null)}>
            {/* Header Info - Session State */}


            {/* Header / Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl shadow-lg text-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-indigo-100 text-xs font-black uppercase tracking-widest">Cartera Clientes</p>
                        <InfoTooltip
                            id="customers"
                            text="Suma total de deudas pendientes de clientes por ventas realizadas a crédito."
                        />
                    </div>
                    <h3 className="text-3xl font-black">${stats.customerTotal.toLocaleString()}</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/10 w-fit px-2 py-1 rounded">
                        <span className="material-symbols-outlined !text-xs">groups</span>
                        PENDIENTE POR COBRAR
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl shadow-lg text-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-amber-100 text-xs font-black uppercase tracking-widest">Préstamos Trabajadores</p>
                        <InfoTooltip
                            id="workers"
                            text="Total de préstamos y adelantos entregados a trabajadores que aún no han sido cancelados."
                        />
                    </div>
                    <h3 className="text-3xl font-black">${stats.workerTotal.toLocaleString()}</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/10 w-fit px-2 py-1 rounded">
                        <span className="material-symbols-outlined !text-xs">engineering</span>
                        TOTAL POR RECUPERAR
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-lg text-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-emerald-100 text-xs font-black uppercase tracking-widest">Recaudado Hoy</p>
                        <InfoTooltip
                            id="today"
                            text="Suma total de abonos de clientes y pagos de préstamos recibidos durante el día de hoy."
                        />
                    </div>
                    <h3 className="text-3xl font-black">${stats.receivedToday.toLocaleString()}</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/10 w-fit px-2 py-1 rounded">
                        <span className="material-symbols-outlined !text-xs">payments</span>
                        ABONOS REGISTRADOS HOY
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex flex-col border-b border-slate-100 dark:border-slate-700">
                    <div className="p-4 border-b border-slate-50 dark:border-slate-900/50">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                            <input
                                type="text"
                                placeholder="Buscar por nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:border-primary transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex p-2 bg-slate-50 dark:bg-slate-900/50">
                        <button
                            onClick={() => setActiveView('pendientes')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${activeView === 'pendientes'
                                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                        >
                            <span className="material-symbols-outlined !text-lg">pending_actions</span>
                            PENDIENTES
                        </button>
                        <button
                            onClick={() => setActiveView('historial')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${activeView === 'historial'
                                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                        >
                            <span className="material-symbols-outlined !text-lg">history</span>
                            HISTORIAL DE PAGOS
                        </button>
                        <button
                            onClick={() => setShowNewDebtModal(true)}
                            className="ml-4 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:scale-95"
                        >
                            <span className="material-symbols-outlined !text-lg">post_add</span>
                            NUEVO CRÉDITO
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    {activeView === 'pendientes' ? (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <tr>
                                            <th className="px-4 py-4 w-[25%]">Responsable</th>
                                            <th className="px-4 py-4 w-[35%]">Concepto</th>
                                            <th className="px-4 py-4">Fecha</th>
                                            <th className="px-4 py-4">Saldo Pendiente</th>
                                            <th className="px-4 py-4 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {loading ? (
                                            <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic font-medium">Cargando datos...</td></tr>
                                        ) : filteredPending.length === 0 ? (
                                            <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic font-medium">No se encontraron deudas</td></tr>
                                        ) : (
                                            filteredPending.slice((pendingPage - 1) * itemsPerPage, pendingPage * itemsPerPage).map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ${item.type === 'customer'
                                                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30'
                                                                : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
                                                                }`}>
                                                                {item.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-mono">REF: {item.id_ref}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={item.description}>
                                                                {item.description || 'N/A'}
                                                            </span>
                                                            <span className={`w-fit mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${item.type === 'customer'
                                                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/10'
                                                                : 'bg-amber-50 text-amber-600 dark:bg-amber-900/10'
                                                                }`}>
                                                                {item.type === 'customer' ? 'CLIENTE' : 'TRABAJADOR'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-xs font-bold text-slate-500">
                                                            {new Date(item.date).toLocaleDateString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                                                                ${item.remaining_amount.toLocaleString()}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-bold">Total: ${item.total_amount.toLocaleString()}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                         <div className="flex items-center justify-end gap-2">
                                                             {isAdmin && (
                                                                 <button
                                                                     onClick={() => {
                                                                         setSelectedEditItem(item);
                                                                         setShowEditModal(true);
                                                                     }}
                                                                     title="Editar registro"
                                                                     className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center"
                                                                 >
                                                                     <span className="material-symbols-outlined !text-[18px]">edit</span>
                                                                 </button>
                                                             )}
                                                             <button
                                                                 onClick={() => {
                                                                     setSelectedItem(item);
                                                                     setShowPaymentModal(true);
                                                                 }}
                                                                 className="px-4 py-1.5 bg-primary text-white text-[11px] font-black rounded-lg hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 uppercase"
                                                             >
                                                                 Abonar
                                                             </button>
                                                         </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {filteredPending.length > itemsPerPage && (
                                <Pagination
                                    currentPage={pendingPage}
                                    totalPages={Math.ceil(filteredPending.length / itemsPerPage)}
                                    onPageChange={setPendingPage}
                                    totalItems={filteredPending.length}
                                    itemsPerPage={itemsPerPage}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <tr>
                                            <th className="px-4 py-4">Pagador</th>
                                            <th className="px-4 py-4">Monto Recibido</th>
                                            <th className="px-4 py-4">Método / Fecha</th>
                                            <th className="px-4 py-4">Concepto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {loading ? (
                                            <tr><td colSpan={4} className="py-20 text-center text-slate-400 italic font-medium">Cargando historial...</td></tr>
                                        ) : filteredHistory.length === 0 ? (
                                            <tr><td colSpan={4} className="py-20 text-center text-slate-400 italic font-medium">No se han registrado pagos</td></tr>
                                        ) : (
                                            filteredHistory.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage).map((p) => (
                                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                                                                <span className="material-symbols-outlined !text-sm">person</span>
                                                            </div>
                                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                            + ${p.amount.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.method}</span>
                                                            <span className="text-xs font-bold text-slate-500">
                                                                {new Date(p.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-xs text-slate-500 font-medium italic">"{p.notes}"</span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {filteredHistory.length > itemsPerPage && (
                                <Pagination
                                    currentPage={historyPage}
                                    totalPages={Math.ceil(filteredHistory.length / itemsPerPage)}
                                    onPageChange={setHistoryPage}
                                    totalItems={filteredHistory.length}
                                    itemsPerPage={itemsPerPage}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedItem && (
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
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Concepto: {selectedItem.name}</p>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Saldo Pendiente</p>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white">${selectedItem.remaining_amount.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Deuda</p>
                                        <p className="text-sm font-bold text-slate-500">${selectedItem.total_amount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Monto a Recibir</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-xl">$</span>
                                    <input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-10 pr-6 py-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl font-black text-2xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            {selectedItem.type === 'customer' ? (
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Medio de Pago</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['cash', 'transfer', 'card'] as const).map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setPaymentMethod(m)}
                                                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${paymentMethod === m
                                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30'
                                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                                                    }`}
                                            >
                                                {m === 'cash' ? 'Efectivo' : m === 'transfer' ? 'Transf.' : 'Tarjeta'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {/* Cash Destination — only for customer credits */}
                            {selectedItem.type === 'customer' && (
                                isCreditFromToday ? (
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Destino del Abono</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setCashTarget('daily')}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                                    cashTarget === 'daily'
                                                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 text-blue-600 dark:text-blue-400'
                                                        : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined !text-[20px]">point_of_sale</span>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">Caja Diaria</p>
                                                    <p className="text-[9px] font-bold opacity-60 mt-0.5">Sesión actual</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setCashTarget('central')}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                                    cashTarget === 'central'
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                                        : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined !text-[20px]">account_balance_wallet</span>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">Caja Central</p>
                                                    <p className="text-[9px] font-bold opacity-60 mt-0.5">Acumulado general</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                                        <span className="material-symbols-outlined text-indigo-500 !text-xl">account_balance_wallet</span>
                                        <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-tight">
                                            Crédito anterior → Irá automáticamente a <span className="underline">Caja Central</span>
                                        </p>
                                    </div>
                                )
                            )}

                            {!cashSession && (
                                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100">
                                    <span className="material-symbols-outlined text-rose-500 !text-sm">warning</span>
                                    <p className="text-[9px] text-rose-600 font-black uppercase tracking-widest">
                                        Error: No hay una sesión de caja abierta para registrar este ingreso.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handlePayment}
                                disabled={!paymentAmount || !cashSession}
                                className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed mt-4 uppercase tracking-widest text-sm"
                            >
                                Confirmar Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* New Manual Debt Modal */}
            {showNewDebtModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">Nuevo Crédito</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Creación manual</p>
                            </div>
                            <button onClick={() => {
                                setShowNewDebtModal(false);
                                setBulkDebts([]);
                                setDebtMode('single');
                            }} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        {/* Mode Switcher */}
                        <div className="flex p-1 mb-4 bg-slate-100 dark:bg-slate-900/50 rounded-xl shrink-0">
                            <button
                                onClick={() => setDebtMode('single')}
                                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                                    debtMode === 'single'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                Individual
                            </button>
                            <button
                                onClick={() => setDebtMode('bulk')}
                                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                                    debtMode === 'bulk'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                Cargue Masivo
                            </button>
                        </div>

                        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                            {/* Customer Search or Create Section */}
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Cliente</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">
                                        {selectedCustomerId ? 'check_circle' : 'search'}
                                    </span>
                                    <input
                                        type="text"
                                        value={customerSearchTerm}
                                        onChange={(e) => {
                                            setCustomerSearchTerm(e.target.value);
                                            setSelectedCustomerId(null); // Clear selection if user types
                                        }}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                        placeholder="Buscar o escribir nuevo cliente..."
                                        className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 rounded-2xl text-sm font-bold outline-none transition-all ${
                                            selectedCustomerId 
                                                ? 'border-emerald-500/50 text-emerald-700 dark:text-emerald-400 focus:border-emerald-500' 
                                                : 'border-slate-100 dark:border-slate-800 focus:border-indigo-500'
                                        }`}
                                    />
                                    {/* Dropdown shows if there are results and user is searching */}
                                    {!selectedCustomerId && isSearchFocused && customerSearchResults.length > 0 && (
                                        <div className="absolute top-14 left-0 w-full max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 custom-scrollbar">
                                            {customerSearchResults.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => {
                                                        setSelectedCustomerId(c.id);
                                                        setCustomerSearchTerm(c.name);
                                                        setCustomerSearchResults([]);
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                                                >
                                                    <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
                                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{c.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {/* Create New Hint if typing and no results */}
                                    {!selectedCustomerId && isSearchFocused && customerSearchTerm.length > 0 && customerSearchResults.length === 0 && (
                                        <div className="absolute top-14 left-0 w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-3 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-indigo-500 !text-sm">person_add</span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium">
                                                Se creará un nuevo cliente llamado <span className="font-black text-indigo-600 dark:text-indigo-400">"{customerSearchTerm}"</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Monto de la Deuda</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-xl">$</span>
                                    <input
                                        type="number"
                                        value={newDebtAmount}
                                        onChange={(e) => setNewDebtAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-10 pr-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-xl outline-none focus:border-indigo-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Concepto / Motivo</label>
                                <textarea
                                    value={newDebtNotes}
                                    onChange={(e) => setNewDebtNotes(e.target.value)}
                                    placeholder="Ej: Saldo anterior, Deuda no registrada..."
                                    rows={2}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                            {debtMode === 'single' ? (
                                <button
                                    onClick={handleCreateManualDebt}
                                    disabled={!customerSearchTerm.trim() || !newDebtAmount}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed uppercase tracking-widest text-sm"
                                >
                                    Guardar Fiado
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <button
                                        onClick={handleAddToBulk}
                                        disabled={!customerSearchTerm.trim() || !newDebtAmount}
                                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-2xl font-black active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined !text-[16px]">add_circle</span>
                                        Agregar a la lista
                                    </button>

                                    {bulkDebts.length > 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="flex justify-between items-center mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
                                                <span>{bulkDebts.length} créditos en lista</span>
                                                <span className="text-indigo-600 dark:text-indigo-400">
                                                    Total: ${bulkDebts.reduce((acc, d) => acc + d.amount, 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2 mb-4">
                                                {bulkDebts.map(debt => (
                                                    <div key={debt.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1">{debt.customerName}</span>
                                                            <span className="text-[10px] text-slate-400">{debt.notes}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-black text-slate-900 dark:text-white">${debt.amount.toLocaleString()}</span>
                                                            <button onClick={() => handleRemoveFromBulk(debt.id)} className="text-rose-400 hover:text-rose-500 transition-colors">
                                                                <span className="material-symbols-outlined !text-[16px]">delete</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={handleSaveBulk}
                                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined !text-[18px]">cloud_upload</span>
                                                Guardar Todos los Fiados
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Debt Modal */}
            <EditDebtModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedEditItem(null);
                }}
                item={selectedEditItem}
                onSaveSuccess={fetchData}
            />
        </div>
    );
};
