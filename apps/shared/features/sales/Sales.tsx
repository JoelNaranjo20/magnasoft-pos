import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@shared/lib/supabase';
import { SaleDetailsModal } from '@shared/components/modals/SaleDetailsModal';
import { Pagination } from '@shared/components/ui/Pagination';
import { format, subDays, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import { BusinessEvolution } from '@shared/components/dashboard/BusinessEvolution';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface Sale {
    id: string;
    created_at: string;
    total_amount: number;
    payment_method: string;
    status: string;
    customer?: { name: string };
    vehicle?: { license_plate: string; type: string };
    worker?: { name: string };
    metadata?: any;
    items?: { name: string; quantity: number; unit_price: number; total_price: number; service_type: string }[];
}

export const SalesPage = () => {
    const [activeTab, setActiveTab] = useState<'history' | 'evolution'>('history');
    const cashSession = useSessionStore((state: any) => state.cashSession);
    const { businessType } = useBusinessStore();
    const [filterMode, setFilterMode] = useState<'dates' | 'session'>(cashSession ? 'session' : 'dates');
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState<Sale[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [movements, setMovements] = useState<any[]>([]);

    // Column Configuration based on Business Type
    const columnConfig = useMemo(() => {
        const configs = {
            automotive: {
                header: 'Cliente / Vehículo',
                render: (sale: Sale) => (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 font-black text-slate-700 dark:text-slate-300">
                            {sale.customer?.name || 'Venta Rápida'}
                        </div>
                        {sale.vehicle && (
                            <div className="flex items-center gap-2">
                                <div className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-black text-white relative flex items-center gap-1 shadow-sm">
                                    <span className="w-full h-0.5 bg-yellow-400 absolute top-0 left-0 right-0"></span>
                                    {sale.vehicle.license_plate}
                                </div>
                                <span className="material-symbols-outlined !text-[14px] text-slate-400">
                                    {sale.vehicle.type === 'motorcycle' ? 'two_wheeler' : 'directions_car'}
                                </span>
                            </div>
                        )}
                    </div>
                )
            },
            barbershop: {
                header: 'Cliente / Barbero',
                render: (sale: Sale) => (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 font-black text-slate-700 dark:text-slate-300">
                            {sale.customer?.name || 'Cliente General'}
                        </div>
                        {sale.worker && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                                <span className="material-symbols-outlined !text-[14px]">content_cut</span>
                                <span className="text-[10px] font-bold uppercase">{sale.worker.name}</span>
                            </div>
                        )}
                    </div>
                )
            },
            restaurant: {
                header: 'Cliente / Mesa',
                render: (sale: Sale) => (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 font-black text-slate-700 dark:text-slate-300">
                            {sale.customer?.name || 'Comensal'}
                        </div>
                        {sale.metadata?.table_number && (
                            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                <span className="material-symbols-outlined !text-[14px]">table_restaurant</span>
                                <span className="text-[10px] font-black uppercase">Mesa {sale.metadata.table_number}</span>
                            </div>
                        )}
                    </div>
                )
            },
            beauty_salon: {
                header: 'Cliente / Estilista',
                render: (sale: Sale) => (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 font-black text-slate-700 dark:text-slate-300">
                            {sale.customer?.name || 'Cliente'}
                        </div>
                        {sale.worker && (
                            <div className="flex items-center gap-1.5 text-pink-500">
                                <span className="material-symbols-outlined !text-[14px]">brush</span>
                                <span className="text-[10px] font-bold uppercase">{sale.worker.name}</span>
                            </div>
                        )}
                    </div>
                )
            },
            hotel: {
                header: 'Huésped / Habitación',
                render: (sale: Sale) => (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 font-black text-slate-700 dark:text-slate-300">
                            {sale.customer?.name || 'Huésped'}
                        </div>
                        {sale.items?.some(i => i.service_type === 'room') && (
                            <div className="flex items-center gap-1.5 text-indigo-500">
                                <span className="material-symbols-outlined !text-[14px]">meeting_room</span>
                                <span className="text-[10px] font-bold uppercase">Habitación</span>
                            </div>
                        )}
                    </div>
                )
            },
            general: {
                header: 'Cliente',
                render: (sale: Sale) => (
                    <div className="font-black text-slate-700 dark:text-slate-300">
                        {sale.customer?.name || 'Cliente General'}
                    </div>
                )
            }
        };

        return configs[businessType as keyof typeof configs] || configs.general;
    }, [businessType]);

    useEffect(() => {
        fetchSales();
        fetchMovements();
    }, [dateRange, filterMode]);

    const fetchMovements = async () => {
        try {
            const businessId = useBusinessStore.getState().id;
            if (!businessId) return;

            let query = supabase
                .from('cash_movements')
                .select('*')
                .eq('business_id', businessId);

            if (filterMode === 'session' && cashSession) {
                query = query.eq('session_id', cashSession.id);
            } else {
                query = query
                    .gte('created_at', startOfDay(new Date(dateRange.start + 'T00:00:00')).toISOString())
                    .lte('created_at', endOfDay(new Date(dateRange.end + 'T00:00:00')).toISOString());
            }

            const { data, error } = await query;

            if (error) throw error;
            setMovements(data || []);
        } catch (error) {
            console.error('Error fetching movements:', error);
        }
    };

    const fetchSales = async () => {
        setLoading(true);
        try {
            const businessId = useBusinessStore.getState().id;
            if (!businessId) return;

            let query = supabase
                .from('sales')
                .select(`
                    *,
                    items:sale_items(
                        *,
                        product:products(price),
                        service:services(price),
                        worker:workers(name)
                    ),
                    customer:customers(name),
                    vehicle:vehicles(license_plate, type),
                    worker:workers(name)
                `)
                .eq('business_id', businessId);

            if (filterMode === 'session' && cashSession) {
                query = query.eq('session_id', cashSession.id);
            } else {
                query = query
                    .gte('created_at', startOfDay(new Date(dateRange.start + 'T00:00:00')).toISOString())
                    .lte('created_at', endOfDay(new Date(dateRange.end + 'T00:00:00')).toISOString());
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            setSales((data || []) as unknown as Sale[]);
            setCurrentPage(1); // Reset to first page on new fetch
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            const search = searchTerm.toLowerCase().trim();

            // 1. Check Search Match
            let matchesSearch = true;
            if (search) {
                const customerName = (sale.customer?.name || '').toLowerCase();
                const licensePlate = (sale.vehicle?.license_plate || '').toLowerCase();
                const workerName = (sale.worker?.name || '').toLowerCase(); // Added worker search
                const receiptId = (sale.id || '').toLowerCase();
                const searchForReceipt = search.startsWith('#') ? search.slice(1) : search;

                matchesSearch = customerName.includes(search) ||
                    licensePlate.includes(search) ||
                    workerName.includes(search) ||
                    receiptId.includes(searchForReceipt);
            }

            return matchesSearch;
        });
    }, [sales, searchTerm]);

    const totalRevenue = useMemo(() => {
        return filteredSales.reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
    }, [filteredSales]);

    const reconciliation = useMemo(() => {
        const totals = {
            cash: 0,
            digital: 0,
            credit: 0,
            abonos: 0,
            expenses: 0
        };

        filteredSales.forEach(sale => {
            if (sale.payment_method === 'cash') totals.cash += sale.total_amount || 0;
            else if (sale.payment_method === 'card' || sale.payment_method === 'transfer') totals.digital += sale.total_amount || 0;
            else if (sale.payment_method === 'credit') totals.credit += sale.total_amount || 0;
        });

        // Process movements (debt payments/abonos/expenses)
        movements.forEach(m => {
            if (m.type === 'expense') {
                totals.expenses += m.amount || 0;
            } else if (m.type === 'income') {
                // Detect payment method from description (added by RPC)
                const desc = (m.description || '').toLowerCase();
                if (desc.includes('transferencia') || desc.includes('tarjeta')) {
                    totals.digital += m.amount || 0;
                } else {
                    totals.abonos += m.amount || 0;
                }
            }
        });

        return totals;
    }, [filteredSales, movements]);

    const cashFlowTotal = useMemo(() => {
        return (reconciliation.cash + reconciliation.abonos) - reconciliation.expenses;
    }, [reconciliation]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const paginatedSales = filteredSales.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const quickDateFilters = [
        { label: 'Turno Actual', get: () => ({ start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
        { label: 'Ayer', get: () => ({ start: format(subDays(new Date(), 1), 'yyyy-MM-dd'), end: format(subDays(new Date(), 1), 'yyyy-MM-dd') }) },
        { label: '7 Días', get: () => ({ start: format(subDays(new Date(), 6), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
        { label: 'Este Mes', get: () => ({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Ventas y Evolución</h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium">Gestiona transacciones y analiza el crecimiento estratégico.</p>
                </div>

                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-black transition-all ${activeTab === 'history'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        Historial
                    </button>
                    <button
                        onClick={() => setActiveTab('evolution')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-black transition-all ${activeTab === 'evolution'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        Evolución
                    </button>
                </div>
            </div>

            {activeTab === 'history' ? (
                <>
                    {/* Filters & Stats Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
                        {/* Search & Dates */}
                        <div className="lg:col-span-3 space-y-4">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 md:p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 space-y-4 md:space-y-6">
                                {/* Search and Reward Filter */}
                                <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                                    <div className="relative flex-1">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                        <input
                                            type="text"
                                            placeholder="Buscar placa, cliente..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 md:py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 text-sm md:text-base"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                                    <div className="flex gap-2">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Desde</label>
                                            <input
                                                type="date"
                                                value={dateRange.start}
                                                onChange={(e) => {
                                                    setDateRange(prev => ({ ...prev, start: e.target.value }));
                                                    setFilterMode('dates');
                                                }}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-slate-900 dark:text-white text-[11px]"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hasta</label>
                                            <input
                                                type="date"
                                                value={dateRange.end}
                                                onChange={(e) => {
                                                    setDateRange(prev => ({ ...prev, end: e.target.value }));
                                                    setFilterMode('dates');
                                                }}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-slate-900 dark:text-white text-[11px]"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 items-end">
                                        {quickDateFilters.map((f) => (
                                            <button
                                                key={f.label}
                                                onClick={() => {
                                                    if (f.label === 'Turno Actual' && cashSession) {
                                                        setFilterMode('session');
                                                    } else {
                                                        setDateRange(f.get());
                                                        setFilterMode('dates');
                                                    }
                                                }}
                                                className={`flex-1 md:flex-none px-3 py-2.5 md:px-4 md:py-3 rounded-xl text-[10px] md:text-xs font-black transition-all ${((f.label === 'Turno Actual' && filterMode === 'session') ||
                                                    (f.label !== 'Turno Actual' && filterMode === 'dates' && dateRange.start === f.get().start && dateRange.end === f.get().end))
                                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'
                                                    }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Cash Flow Card - Premium Dark Theme */}
                        <div className="bg-slate-900 dark:bg-slate-900/50 rounded-3xl p-7 shadow-2xl shadow-slate-900/20 text-white relative overflow-hidden group border border-white/5">
                            <div className="absolute -right-4 -top-4 size-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-700"></div>

                            <div className="relative z-10 flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-emerald-400 !text-xl">account_balance_wallet</span>
                                        Caja de Efectivo
                                    </h3>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total en Caja</p>
                                        <p className="text-3xl font-black text-emerald-400 tabular-nums leading-none tracking-tight">
                                            ${cashFlowTotal.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-5 border-y border-white/10">
                                    <div className="col-span-1">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined !text-xs text-emerald-500/50">payments</span>
                                            Ventas
                                        </p>
                                        <p className="text-sm font-black text-white">
                                            +${reconciliation.cash.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="col-span-1">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined !text-xs text-blue-500/50">point_of_sale</span>
                                            Abonos
                                        </p>
                                        <p className="text-sm font-black text-white">
                                            +${reconciliation.abonos.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="col-span-2 md:col-span-1 pt-3 md:pt-0 border-t border-white/5 md:border-none">
                                        <p className="text-[9px] font-black text-rose-400/80 uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined !text-xs text-rose-500/50">upload</span>
                                            Gastos
                                        </p>
                                        <p className="text-sm font-black text-rose-400">
                                            -${reconciliation.expenses.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                                    <div className="flex flex-wrap gap-4 md:gap-6">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Digital</p>
                                            <p className="text-xs font-black text-indigo-400 tracking-tight">${reconciliation.digital.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Crédito</p>
                                            <p className="text-xs font-black text-slate-400 tracking-tight">${reconciliation.credit.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="sm:text-right w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-none border-white/5">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Ventas Totales</p>
                                        <p className="text-xs font-black text-white/60 tracking-tight">${totalRevenue.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sales Table Wrapper */}
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                            <th className="px-8 py-5">Recibo</th>
                                            {/* Dynamic Header */}
                                            <th className="px-8 py-5 min-w-[200px]">{columnConfig.header}</th>
                                            <th className="px-4 py-5">Detalle de Venta</th>
                                            <th className="px-8 py-5">Importe</th>
                                            <th className="px-8 py-5 text-right">Fecha / Registro</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-24">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="w-12 h-12 border-[5px] border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                                        <p className="text-slate-400 font-black animate-pulse uppercase tracking-widest text-[10px]">Cargando transacciones...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : paginatedSales.length > 0 ? (
                                            paginatedSales.map((sale) => (
                                                <tr
                                                    key={sale.id}
                                                    onClick={() => setSelectedSale(sale)}
                                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all group cursor-pointer"
                                                >
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">
                                                                <span className="material-symbols-outlined !text-[18px]">receipt</span>
                                                            </div>
                                                            <span className="font-black text-slate-900 dark:text-white uppercase">#{sale.id.slice(0, 8)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        {/* Dynamic Render */}
                                                        {columnConfig.render(sale)}
                                                    </td>
                                                    <td className="px-4 py-5">
                                                        <div className="space-y-1">
                                                            <span className="text-slate-900 dark:text-white font-black line-clamp-1 max-w-[250px] uppercase text-[10px]">
                                                                {sale.items?.map(i => i.name).join(', ')}
                                                            </span>
                                                            <div className="flex gap-2">
                                                                {sale.total_amount === 0 && (
                                                                    <span className="inline-flex items-center gap-1 text-[8px] font-black text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded uppercase tracking-tighter w-fit border border-purple-100 dark:border-purple-800">
                                                                        <span className="material-symbols-outlined !text-[10px]">redeem</span>
                                                                        Programa Lealtad
                                                                    </span>
                                                                )}
                                                                <span className="text-[8px] font-black text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                                    {sale.payment_method === 'cash' ? 'Efectivo' :
                                                                        sale.payment_method === 'card' ? 'Tarjeta' :
                                                                            sale.payment_method === 'transfer' ? 'Transferencia' :
                                                                                sale.payment_method === 'credit' ? 'Fiado' :
                                                                                    sale.payment_method || '-'}
                                                                </span>
                                                                {/* Status Badge */}
                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border ${sale.status === 'completed' ? 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800' :
                                                                    sale.status === 'cancelled' ? 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800' :
                                                                        'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800'
                                                                    }`}>
                                                                    {sale.status === 'completed' ? 'Completado' :
                                                                        sale.status === 'cancelled' ? 'Cancelado' :
                                                                            'Pendiente'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className={`text-lg font-black ${sale.total_amount === 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                                            ${sale.total_amount?.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <span className="text-slate-900 dark:text-white font-black uppercase text-[10px] tracking-tight">{format(new Date(sale.created_at), 'dd MMM yyyy')}</span>
                                                            <span className="text-slate-400 text-[10px] font-bold">{format(new Date(sale.created_at), 'hh:mm a')}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="text-center py-32">
                                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                                        <span className="material-symbols-outlined !text-[48px] opacity-20">search_off</span>
                                                        <p className="italic text-sm font-bold">No se encontraron ventas con los criterios actuales.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card List View */}
                            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <div className="p-12 flex flex-col items-center gap-4">
                                        <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Cargando...</p>
                                    </div>
                                ) : paginatedSales.length > 0 ? (
                                    paginatedSales.map((sale: Sale) => (
                                        <div
                                            key={sale.id}
                                            onClick={() => setSelectedSale(sale)}
                                            className="p-5 space-y-4 active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                                        <span className="material-symbols-outlined !text-[18px]">receipt</span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-black text-slate-900 dark:text-white text-xs uppercase">#{sale.id.slice(0, 8)}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{format(new Date(sale.created_at), 'hh:mm a')}</span>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${sale.status === 'completed' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                                                    {sale.status === 'completed' ? 'PAGADO' : 'PENDIENTE'}
                                                </span>
                                            </div>

                                            <div className="pl-11 space-y-3">
                                                <div className="flex flex-col gap-1.5">
                                                    {/* Reuse dynamic render but potentially simplified or just use it if it's already compact enough */}
                                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {sale.customer?.name || 'Venta Rápida'}
                                                    </div>
                                                    {sale.vehicle && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-black text-white flex items-center gap-1 relative overflow-hidden">
                                                                <span className="w-full h-0.5 bg-yellow-400 absolute top-0 left-0 right-0"></span>
                                                                {sale.vehicle.license_plate}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-1.5">
                                                    <p className="text-[11px] font-medium text-slate-500 line-clamp-2 uppercase leading-relaxed">
                                                        {sale.items?.map((i: any) => i.name).join(', ')}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="text-[8px] font-black text-slate-400 bg-slate-100 dark:bg-slate-700' px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                            {sale.payment_method === 'cash' ? 'Efectivo' : sale.payment_method === 'card' ? 'Tarjeta' : sale.payment_method}
                                                        </span>
                                                        {sale.total_amount === 0 && (
                                                            <span className="text-[8px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">RECOMPENSA</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pl-11 pt-2 flex justify-between items-center border-t border-slate-50 dark:border-slate-800/50">
                                                <span className="text-[11px] font-bold text-slate-400">{format(new Date(sale.created_at), 'dd/MM/yyyy')}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-lg font-black ${sale.total_amount === 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                                        ${sale.total_amount?.toLocaleString()}
                                                    </span>
                                                    <span className="material-symbols-outlined !text-[20px] text-slate-300">chevron_right</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-16 text-center text-slate-400 italic text-sm font-bold uppercase tracking-widest opacity-30">Sin transacciones</div>
                                )}
                            </div>
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={filteredSales.length}
                            itemsPerPage={itemsPerPage}
                        />
                    </div>
                </>
            ) : (
                <BusinessEvolution />
            )}

            {/* Modals */}
            <SaleDetailsModal
                isOpen={!!selectedSale}
                onClose={() => setSelectedSale(null)}
                sale={selectedSale}
            />
        </div>
    );
};
