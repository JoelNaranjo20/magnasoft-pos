import { useState, useEffect } from 'react';
import { supabase } from '@shared/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SaleDetailsModal } from '@shared/components/modals/SaleDetailsModal';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { OperationalSummary } from '@shared/components/dashboard/OperationalSummary';
import { useDashboardConfig } from '@shared/hooks/useDashboardConfig';
import { CashMovementsModal } from '@shared/components/modals/CashMovementsModal';
import { RewardDetailsModal } from '@shared/components/modals/RewardDetailsModal';
import { SalesSummaryModal } from '@shared/components/modals/SalesSummaryModal';
import type { RewardDetail } from '../../components/modals/RewardDetailsModal';

type ViewPeriod = 'day' | 'week' | 'month';


interface DashboardStats {
    income: number;
    transactions: number;
    avgTicket: number;
    carWashes: number;
    products: number;
    alignments: number;
    balancing: number;
    oilChanges: number;
    mechanics: number;
    totalItems: number;
    expenses: number;
    rewardCosts: number;
    uniqueCustomers: number;
    cashSales: number;
    digitalSales: number;
    creditSales: number;
    cashAbonos: number;
    digitalAbonos: number;
    serviceBreakdown?: { name: string; count: number }[];
}

interface ChartDataEntry {
    name: string;
    value: number;
}

export const FinanceDashboard = () => {
    const cashSession = useSessionStore((state: any) => state.cashSession);
    const { config, loading: configLoading } = useDashboardConfig(); // Use Hook
    const [loading, setLoading] = useState(true);
    const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('day');

    const [stats, setStats] = useState<DashboardStats>({
        income: 0,
        transactions: 0,
        avgTicket: 0,
        carWashes: 0,
        products: 0,
        alignments: 0,
        balancing: 0,
        oilChanges: 0,
        mechanics: 0,
        totalItems: 0,
        expenses: 0,
        rewardCosts: 0,
        uniqueCustomers: 0,
        cashSales: 0,
        digitalSales: 0,
        creditSales: 0,
        cashAbonos: 0,
        digitalAbonos: 0
    });
    const [movements, setMovements] = useState<any[]>([]);
    const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
    const [recentSessions, setRecentSessions] = useState<any[]>([]);
    const [recentSales, setRecentSales] = useState<any[]>([]);
    const [rewardDetails, setRewardDetails] = useState<RewardDetail[]>([]);
    const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);
    const [chartData, setChartData] = useState<ChartDataEntry[]>([]);
    const [selectedSale, setSelectedSale] = useState<any | null>(null);
    const [allSales, setAllSales] = useState<any[]>([]);
    const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, [viewPeriod]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const businessId = useBusinessStore.getState().id;

            // Guard: Don't fetch if businessId is not available
            if (!businessId) {
                console.log('Waiting for business_id...');
                setLoading(false);
                return;
            }
            const today = new Date();
            let startDate: Date;
            let endDate = new Date(today);

            if (viewPeriod === 'day') {
                if (cashSession) {
                    // Use active session range if available
                    startDate = new Date(cashSession.opened_at);
                    endDate = cashSession.closed_at ? new Date(cashSession.closed_at) : new Date(today);
                    endDate.setSeconds(endDate.getSeconds() + 1); // Ensure we include up to the very last second
                } else {
                    startDate = new Date(today.setHours(0, 0, 0, 0));
                    endDate.setHours(23, 59, 59, 999);
                }
            } else if (viewPeriod === 'week') {
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                startDate = new Date(today.setDate(diff));
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            } else {
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                endDate.setHours(23, 59, 59, 999);
            }

            // 1. Fetch sales for period with relations
            const { data: sales, error: salesError } = await supabase
                .from('sales')
                .select(`
                    *,
                    customer:customers(name),
                    items:sale_items(
                        *,
                        product:products(price, name, category:categories(name)),
                        service:services(price, name, category:categories(name))
                    )
                `)
                .eq('business_id', businessId)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: false });

            if (salesError) throw salesError;

            // 2. Process Stats
            let income = 0;
            let carWashes = 0;
            let products = 0;
            let alignments = 0;
            let balancing = 0;
            let oilChanges = 0;
            let mechanics = 0;
            let totalItems = 0;
            let totalLostRevenue = 0;
            const collectedRewards: RewardDetail[] = [];

            // Chart Data Preparation
            const chartMap = new Map<number, ChartDataEntry>();

            // Initialize chart keys based on period
            if (viewPeriod === 'day') {
                for (let i = 0; i < 24; i++) chartMap.set(i, { name: `${i}:00`, value: 0 });
            } else if (viewPeriod === 'week') {
                const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                for (let i = 0; i < 7; i++) chartMap.set(i, { name: days[i], value: 0 });
            } else {
                const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                for (let i = 1; i <= daysInMonth; i++) chartMap.set(i, { name: `${i}`, value: 0 });
            }

            sales?.forEach((sale: any) => {
                income += sale.total_amount || 0;

                // Chart Data Aggregation
                const saleDate = new Date(sale.created_at);
                let key: number;
                if (viewPeriod === 'day') key = saleDate.getHours();
                else if (viewPeriod === 'week') key = saleDate.getDay();
                else key = saleDate.getDate();

                if (chartMap.has(key)) {
                    const entry = chartMap.get(key)!;
                    entry.value += sale.total_amount || 0;
                }

                sale.items?.forEach((item: any) => {
                    const qty = item.quantity || 1;
                    totalItems += qty;
                    const name = (item.name || '').toLowerCase();
                    const type = item.service_type || '';

                    // Lost Revenue
                    if (item.unit_price === 0) {
                        const originalPrice = item.service?.price || item.product?.price || 0;
                        const lostValue = (originalPrice * qty);
                        totalLostRevenue += lostValue;

                        collectedRewards.push({
                            id: item.id,
                            sale_id: sale.id,
                            name: item.name,
                            original_price: originalPrice,
                            quantity: qty,
                            created_at: sale.created_at,
                            customer_name: sale.customer?.name
                        });
                    }

                    if (item.product_id) products += qty;
                    else if (type === 'car_wash' || name.includes('lavado')) carWashes += qty;
                    else if (type === 'alignment' || name.includes('alineaci')) alignments += qty;
                    else if (name.includes('balanceo')) balancing += qty;
                    else if (name.includes('aceite')) oilChanges += qty;
                    else if (type === 'mechanics' || name.includes('mecanic')) mechanics += qty;
                });
            });

            // 3. Fetch Cash Movements for period
            const { data: movementsData } = await supabase
                .from('cash_movements')
                .select('*')
                .eq('business_id', businessId)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            const movements = (movementsData as any[]) || [];
            let totalExpenses = 0;
            let cashAbonos = 0;
            let digitalAbonos = 0;

            movements.forEach(m => {
                if (m.type === 'expense') {
                    totalExpenses += m.amount || 0;
                } else {
                    const desc = (m.description || '').toLowerCase();
                    if (desc.includes('transferencia') || desc.includes('tarjeta')) {
                        digitalAbonos += m.amount || 0;
                    } else {
                        cashAbonos += m.amount || 0;
                    }
                }
            });

            // Calculate Sale Breakdowns
            let cashSales = 0;
            let digitalSales = 0;
            let creditSales = 0;

            sales?.forEach((sale: any) => {
                const total = sale.total_amount || 0;
                if (sale.payment_method === 'cash') cashSales += total;
                else if (sale.payment_method === 'credit') creditSales += total;
                else digitalSales += total;
            });

            setMovements(movements.filter(m => m.type === 'expense'));

            // Convert map to array.
            let processedChartData = Array.from(chartMap.values());
            // Shift sunday to end if week view (0 is sunday in getDay())
            if (viewPeriod === 'week') {
                const sunday = processedChartData.shift();
                if (sunday) processedChartData.push(sunday);
            }

            // Service Breakdown Calculation
            const serviceMap: Record<string, number> = {};

            sales?.forEach((sale: any) => {
                sale.items?.forEach((item: any) => {
                    // Si TIENE service_id o NO TIENE product_id (asumimos servicio si no es producto)
                    if (item.service_id || !item.product_id) {
                        // Intentar obtener nombre del servicio, o de la categoría, o fallback
                        let name = item.service?.name || item.name || 'Servicio General';

                        // Normalizar nombres comunes si es necesario, o mantener exacto
                        // Por ahora mantenemos exacto para "linea por linea"

                        if (!serviceMap[name]) serviceMap[name] = 0;
                        serviceMap[name] += (item.quantity || 1);
                    }
                });
            });

            // Convert to array and sort
            const serviceBreakdown = Object.entries(serviceMap)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count);

            setStats({
                income,
                transactions: sales?.length || 0,
                avgTicket: sales?.length ? income / sales.length : 0,
                carWashes,
                products,
                alignments,
                balancing,
                oilChanges,
                mechanics,
                totalItems,
                expenses: totalExpenses,
                rewardCosts: totalLostRevenue,
                uniqueCustomers: new Set(sales?.map((s: any) => s.customer_id).filter(Boolean)).size,
                cashSales,
                digitalSales,
                creditSales,
                cashAbonos,
                digitalAbonos,
                serviceBreakdown // Add this new field
            });
            setAllSales(sales || []);
            setRecentSales(sales?.slice(0, 5) || []);
            setRewardDetails(collectedRewards);
            setChartData(processedChartData);

            // 4. Fetch recent sessions
            const { data: sessions, error: sessionsError } = await supabase
                .from('cash_sessions')
                .select('*, worker_id')
                .eq('business_id', businessId)
                .order('opened_at', { ascending: false })
                .limit(5);

            if (sessionsError) throw sessionsError;

            setRecentSessions(sessions || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const maxCount = Math.max(stats.totalItems, stats.carWashes, stats.products, stats.alignments, stats.balancing, stats.oilChanges, stats.mechanics, 1);

    if (configLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-600 dark:text-slate-400 animate-pulse font-bold text-sm">Cargando métricas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
                <div className="flex-1">
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-4 lowercase">
                        Resumen <span className="text-primary italic">Financiero</span>
                    </h1>
                    <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
                        Análisis detallado de ingresos, gastos y rendimiento operativo del negocio.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">

                    <div className="flex p-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                        {['day', 'week', 'month'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setViewPeriod(p as ViewPeriod)}
                                className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${viewPeriod === p
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {p === 'day' ? 'Turno Actual' : p === 'week' ? 'Semana' : 'Mes'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-6 md:space-y-8">
                {/* Stats Grid - Controlled by config.show_summary, simplified for now to keep header stats always visible or user can toggle entire block, but user said 'Cards of totals (Top)'. Let's wrap it. */}
                {config.show_summary && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">

                        <div
                            onClick={() => setIsSalesModalOpen(true)}
                            className="bg-gradient-to-br from-emerald-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl md:rounded-3xl p-3 md:p-8 shadow-lg shadow-emerald-100/50 dark:shadow-none border border-emerald-200 dark:border-slate-700 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-700 transition-all group"
                        >
                            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-6">
                                <div className="p-2 md:p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg md:rounded-2xl group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 !text-xl md:!text-3xl">payments</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Ingresos</p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-[8px] md:text-xs text-slate-500 italic">{stats.transactions} ventas</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xl md:text-4xl font-black text-slate-900 dark:text-white">${stats.income.toLocaleString()}</p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl md:rounded-3xl p-3 md:p-8 shadow-lg shadow-blue-100/50 dark:shadow-none border border-blue-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-6">
                                <div className="p-2 md:p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg md:rounded-2xl">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 !text-xl md:!text-3xl">receipt_long</span>
                                </div>
                                <div>
                                    <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Ticket P.</p>
                                    <p className="text-[8px] md:text-xs text-slate-500 tracking-tighter">Promedio</p>
                                </div>
                            </div>
                            <p className="text-xl md:text-4xl font-black text-slate-900 dark:text-white">${Math.round(stats.avgTicket).toLocaleString()}</p>
                        </div>

                        <div className="bg-gradient-to-br from-amber-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl md:rounded-3xl p-3 md:p-8 shadow-lg shadow-amber-100/50 dark:shadow-none border border-amber-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-6">
                                <div className="p-2 md:p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg md:rounded-2xl">
                                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 !text-xl md:!text-3xl">inventory_2</span>
                                </div>
                                <div>
                                    <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Items</p>
                                    <p className="text-[8px] md:text-xs text-slate-500 tracking-tighter">Vendidos</p>
                                </div>
                            </div>
                            <p className="text-xl md:text-4xl font-black text-slate-900 dark:text-white">{stats.totalItems.toLocaleString()}</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl md:rounded-3xl p-3 md:p-8 shadow-lg shadow-purple-100/50 dark:shadow-none border border-purple-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-6">
                                <div className="p-2 md:p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg md:rounded-2xl">
                                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 !text-xl md:!text-3xl">people</span>
                                </div>
                                <div>
                                    <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Clientes</p>
                                    <p className="text-[8px] md:text-xs text-slate-500 tracking-tighter">Únicos</p>
                                </div>
                            </div>
                            <p className="text-xl md:text-4xl font-black text-slate-900 dark:text-white">{stats.uniqueCustomers.toLocaleString()}</p>
                        </div>


                        <div
                            onClick={() => setIsMovementsModalOpen(true)}
                            className="bg-gradient-to-br from-rose-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl md:rounded-3xl p-3 md:p-8 shadow-lg shadow-rose-100/50 dark:shadow-none border border-rose-200 dark:border-slate-700 cursor-pointer hover:border-rose-400 dark:hover:border-rose-700 transition-all group"
                        >
                            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-6">
                                <div className="p-2 md:p-4 bg-rose-100 dark:bg-rose-900/30 rounded-lg md:rounded-2xl group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 !text-xl md:!text-3xl">upload</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Gastos</p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-[8px] md:text-xs text-slate-500 italic">Egresos</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xl md:text-4xl font-black text-rose-600 dark:text-rose-400">${stats.expenses.toLocaleString()}</p>
                        </div>


                        <div
                            onClick={() => setIsRewardsModalOpen(true)}
                            className="bg-gradient-to-br from-fuchsia-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-lg shadow-fuchsia-100/50 dark:shadow-none border border-fuchsia-200 dark:border-slate-700 cursor-pointer hover:border-purple-400 dark:hover:border-purple-700 transition-all group"
                        >
                            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-6">
                                <div className="p-2 md:p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg md:rounded-2xl group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 !text-xl md:!text-3xl">redeem</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Promo</p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-[8px] md:text-xs text-slate-400 italic">Impacto</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xl md:text-4xl font-black text-purple-600 dark:text-purple-400">${stats.rewardCosts.toLocaleString()}</p>
                        </div>
                    </div>
                )}



                {/* POSICIÓN SUPERIOR: Ventas Recientes - Conditional */}
                {config.show_recent_transactions && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-6 md:mb-8 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">history</span>
                            Ventas Recientes
                        </h3>

                        <div className="hidden md:block overflow-x-auto -mx-6 md:-mx-8">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-y border-slate-100 dark:border-slate-800">
                                        <th className="px-6 md:px-8 py-3">Recibo</th>
                                        <th className="px-6 md:px-8 py-3">Cliente / Vehículo</th>
                                        <th className="px-4 py-3">Método</th>
                                        <th className="px-4 py-3">Items</th>
                                        <th className="px-4 py-3">Monto</th>
                                        <th className="px-4 py-3 text-right">Hora</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                                    {recentSales.map((sale: any) => (
                                        <tr
                                            key={sale.id}
                                            onClick={() => setSelectedSale(sale)}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer"
                                        >
                                            <td className="px-6 md:px-8 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined !text-[16px] text-slate-400">receipt</span>
                                                    <span className="font-bold text-slate-900 dark:text-white">#{sale.id.slice(0, 8)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 md:px-8 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined !text-[14px] text-slate-400">person</span>
                                                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{sale.customer?.name || 'Cliente Gral.'}</span>
                                                    </div>
                                                    {sale.vehicle && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-black text-white flex items-center gap-1 relative overflow-hidden">
                                                                <span className="w-full h-0.5 bg-yellow-400 absolute top-0 left-0 right-0"></span>
                                                                {sale.vehicle.license_plate}
                                                            </div>
                                                            <span className="material-symbols-outlined !text-[12px] text-slate-400">
                                                                {sale.vehicle.type === 'motorcycle' ? 'two_wheeler' : 'directions_car'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${sale.payment_method === 'credit'
                                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                    : sale.payment_method === 'cash'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                    }`}>
                                                    {sale.payment_method === 'credit' ? 'CRÉDITO' :
                                                        sale.payment_method === 'cash' ? 'EFECTIVO' :
                                                            sale.payment_method === 'card' ? 'TARJETA' : 'TRANSF.'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-slate-900 dark:text-white font-bold line-clamp-1">
                                                        {sale.items?.map((i: any) => i.name).join(', ')}
                                                    </span>
                                                    {sale.total_amount === 0 && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded uppercase tracking-tighter w-fit animate-pulse">
                                                            <span className="material-symbols-outlined !text-[12px]">redeem</span>
                                                            Premio Canjeado
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`text-sm font-black ${sale.total_amount === 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                                    ${sale.total_amount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-slate-500 font-bold">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="material-symbols-outlined !text-[16px] text-slate-300 group-hover:text-primary transition-colors cursor-pointer">chevron_right</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {recentSales.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-slate-400 font-medium italic text-sm">
                                                No hay ventas registradas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Card list for mobile */}
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                            {recentSales.map((sale: any) => (
                                <div
                                    key={sale.id}
                                    onClick={() => setSelectedSale(sale)}
                                    className="p-4 space-y-3 active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className="size-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                                <span className="material-symbols-outlined !text-[16px]">receipt</span>
                                            </div>
                                            <span className="font-black text-slate-900 dark:text-white text-xs uppercase">#{sale.id.slice(0, 8)}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${sale.payment_method === 'credit'
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                            : sale.payment_method === 'cash'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                            }`}>
                                            {sale.payment_method === 'credit' ? 'CRÉDITO' :
                                                sale.payment_method === 'cash' ? 'EFECTIVO' :
                                                    sale.payment_method === 'card' ? 'TARJETA' : 'TRANSF.'}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-sm">
                                            <span className="material-symbols-outlined !text-[14px]">person</span>
                                            {sale.customer?.name || 'Venta Rápida'}
                                        </div>
                                        {sale.vehicle && (
                                            <div className="flex items-center gap-2">
                                                <div className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-black text-white flex items-center gap-1 relative overflow-hidden">
                                                    <span className="w-full h-0.5 bg-yellow-400 absolute top-0 left-0 right-0"></span>
                                                    {sale.vehicle.license_plate}
                                                </div>
                                                <span className="material-symbols-outlined !text-[14px] text-slate-400">
                                                    {sale.vehicle.type === 'motorcycle' ? 'two_wheeler' : 'directions_car'}
                                                </span>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 italic uppercase tracking-tighter">
                                            {sale.items?.map((i: any) => i.name).join(', ')}
                                        </p>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-700/50">
                                        <span className="text-xs font-bold text-slate-400">
                                            {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-base font-black ${sale.total_amount === 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                                ${sale.total_amount.toLocaleString()}
                                            </span>
                                            <span className="material-symbols-outlined !text-[18px] text-slate-300">chevron_right</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {recentSales.length === 0 && (
                                <div className="p-8 text-center text-slate-400 text-sm font-bold uppercase tracking-widest opacity-50">
                                    Sin ventas
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Operations Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                    {/* Operations Report - DYNAMIC */}
                    {/* Reuse OperationalSummary since user asked for it. This was the "clean list" of services. */}
                    {/* Wait, user asked to keep CategorySalesSummary separate for 'Ranking de Servicios' */}
                    {/* So OperationalSummary here will just be the one we refactored to show services list? */}
                    {/* "Debes asegurarte de que show_services_ranking controle la visibilidad del componente CategorySalesSummary (la lista limpia que acabamos de hacer)." */}
                    {/* "No lo mezcles dentro del OperationalSummary." */}
                    {/* So I should probably REVERT OperationalSummary to its 'Totals' state? */}
                    {/* Or simpler: Use OperationalSummary as the 'Resumen Operativo' (config.show_summary) and uses CategorySalesSummary for 'Ranking'. */}
                    {/* BUT, previously I replaced OperationalSummary content with the Services List. */}
                    {/* If I use CategorySalesSummary for services list, what should OperationalSummary show? */}
                    {/* The user confusingly asked: "quiero las barras de servisioa realizados en resumen opreativo en una tarjeta". I did that. */}
                    {/* NOW user says: "Confirmación: Exacto. Debes asegurarte de que show_services_ranking controle la visibilidad del componente CategorySalesSummary... No lo mezcles dentro del OperationalSummary." */}
                    {/* Implication: Restore CategorySalesSummary as the 'Service Bars' component. */}
                    {/* And OperationalSummary should probably be the standard financial/operational summary (totals). */}
                    {/* Problem: I overwrote OperationalSummary with the services list code. */}
                    {/* However, the prompt is about 'Configuration'. I shouldn't rewrite OperationalSummary logic *again* if not explicitly asked, but I must follow the layout request. */}
                    {/* "Resumen Operativo" -> show_summary. "Ranking de Servicios" -> show_services_ranking (CategorySalesSummary). */}
                    {/* "Evolución de Ingresos" -> show_sales_chart. */}
                    {/* I will assume OperationalSummary is good as is (Service Breakdown) OR I should treat 'CategorySalesSummary' as the one to show whenever 'show_services_ranking' is true. */}
                    {/* Let's stick to the latest instruction: "CategorySalesSummary (la lista limpia que acabamos de hacer)". */}
                    {/* I will re-introduce <CategorySalesSummary /> in the grid, controlled by show_services_ranking. */}
                    {/* And hiding OperationalSummary with show_summary. */}

                    {/* But wait, if OperationalSummary NOW contains the list, and I also add CategorySalesSummary which ALSO contains the list... valid point. */}
                    {/* I will use the CURRENT OperationalSummary as the recipient of 'show_summary'. */}
                    {/* AND I will add CategorySalesSummary back for 'show_services_ranking'. */}
                    {/* This might duplicate UI if they look identical. But I will follow the config instructions first. */}
                    {/* Actually, user said: "No lo mezcles dentro del OperationalSummary." */}
                    {/* This strongly implies OperationalSummary should NOT contain the list anymore, or I should ignore that component effectively? */}
                    {/* No, "Resumen Operativo" is a toggle. */}
                    {/* I'll wrap OperationalSummary in show_summary. */}
                    {/* I'll add CategorySalesSummary in show_services_ranking. */}

                    {config.show_summary && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-6 md:mb-8 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">analytics</span>
                                Resumen Operativo
                            </h3>

                            <OperationalSummary
                                stats={{
                                    totalSales: stats.income,
                                    serviceBreakdown: stats.serviceBreakdown || []
                                }}
                                loading={loading}
                            />
                        </div>
                    )}




                    {config.show_sales_chart && (
                        <div className={`bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 ${!config.show_summary ? 'md:col-span-3' : 'md:col-span-1 lg:col-span-2'}`}>
                            <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">monitoring</span>
                                Evolución de Ingresos
                            </h3>
                            <div className="h-[400px] w-full transition-all duration-300" style={{ minHeight: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {chartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill="#3b82f6" className="dark:fill-blue-500" />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}


                </div>

                {/* Turn history - Conditional */}
                {config.show_recent_transactions && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="px-6 py-4 md:px-8 md:py-6 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Historial de Turnos</h3>
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-4">Usuario</th>
                                        <th className="px-8 py-4">Apertura</th>
                                        <th className="px-8 py-4">Cierre</th>
                                        <th className="px-8 py-4">Monto Final</th>
                                        <th className="px-8 py-4 text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                    {recentSessions.map((session: any) => (
                                        <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-8 py-5 font-bold text-slate-900 dark:text-white">{session.worker?.name || 'Admin'}</td>
                                            <td className="px-8 py-5 text-slate-500">{new Date(session.opened_at).toLocaleDateString()} {new Date(session.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="px-8 py-5 text-slate-500">{session.closed_at ? new Date(session.closed_at).toLocaleDateString() + ' ' + new Date(session.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                            <td className="px-8 py-5 font-bold text-slate-900 dark:text-white">${session.end_amount?.toLocaleString() || '0'}</td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400`}>
                                                    {session.status.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                            {recentSessions.map((session: any) => (
                                <div key={session.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined !text-[18px] text-slate-400">person</span>
                                            {session.worker?.name || 'Admin'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400`}>
                                            {session.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-slate-400">Apertura</span>
                                            {new Date(session.opened_at).toLocaleDateString()} {new Date(session.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-slate-400">Cierre</span>
                                            {session.closed_at ? new Date(session.closed_at).toLocaleDateString() : '-'}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-slate-50 dark:border-slate-700/50">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Monto Final</span>
                                        <span className="text-base font-black text-slate-900 dark:text-white">${session.end_amount?.toLocaleString() || '0'}</span>
                                    </div>
                                </div>
                            ))}
                            {recentSessions.length === 0 && (
                                <div className="p-8 text-center text-slate-400 text-sm">No hay registros recientes.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Modals */}
                <SaleDetailsModal
                    isOpen={!!selectedSale}
                    onClose={() => setSelectedSale(null)}
                    sale={selectedSale}
                />


                <SalesSummaryModal
                    isOpen={isSalesModalOpen}
                    onClose={() => setIsSalesModalOpen(false)}
                    sales={allSales}
                    title="Resumen de Ventas"
                    subtitle={`Todas las ventas realizadas en el periodo: ${viewPeriod === 'day' ? 'Turno Actual' : viewPeriod === 'week' ? 'Esta Semana' : 'Este Mes'}`}
                    onSelectSale={(sale) => {
                        setIsSalesModalOpen(false);
                        setTimeout(() => setSelectedSale(sale), 300);
                    }}
                />

                <CashMovementsModal
                    isOpen={isMovementsModalOpen}
                    onClose={() => setIsMovementsModalOpen(false)}
                    movements={movements}
                    title="Gastos del Periodo"
                    subtitle={`Detalle de egresos registrados en el periodo: ${viewPeriod === 'day' ? 'Turno Actual' : viewPeriod === 'week' ? 'Esta Semana' : 'Este Mes'}`}
                />

                <RewardDetailsModal
                    isOpen={isRewardsModalOpen}
                    onClose={() => setIsRewardsModalOpen(false)}
                    rewards={rewardDetails}
                    title="Detalle de Promociones"
                    subtitle={`Redenciones realizadas en el periodo: ${viewPeriod === 'day' ? 'Turno Actual' : viewPeriod === 'week' ? 'Esta Semana' : 'Este Mes'}`}
                />
            </div>
        </div>
    );
};
