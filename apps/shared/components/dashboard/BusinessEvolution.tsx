// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@shared/lib/supabase';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Line
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { StrategyModal } from '@shared/components/modals/StrategyModal';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface Strategy {
    id: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    color: string;
}

interface EvolutionData {
    date: string;
    income: number;
    rewards: number;
    salesCount: number;
    avgTicket: number;
}

export const BusinessEvolution = () => {
    const cashSession = useSessionStore((state) => state.cashSession);
    const [loading, setLoading] = useState(true);
    const [viewRange, setViewRange] = useState<'1day' | '7days' | '30days' | '90days' | 'year'>('1day');
    const [evolutionData, setEvolutionData] = useState<EvolutionData[]>([]);
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
    const [newCustomersCount, setNewCustomersCount] = useState(0);
    const [openTooltip, setOpenTooltip] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [viewRange]);

    const handleDeleteStrategy = async (strategyId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta estrategia?')) return;

        try {
            const businessId = useBusinessStore.getState().id;
            const { error } = await supabase
                .from('business_strategies')
                .delete()
                .eq('id', strategyId)
                .eq('business_id', businessId);

            if (error) throw error;

            // Refresh data
            fetchData();
        } catch (error) {
            console.error('Error deleting strategy:', error);
            alert('Error al eliminar la estrategia');
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const businessId = useBusinessStore.getState().id;
            const now = new Date();
            let startDate: Date;
            if (viewRange === '1day') {
                startDate = cashSession ? new Date(cashSession.opened_at) : startOfDay(now);
            }
            else if (viewRange === '7days') startDate = subDays(now, 7);
            else if (viewRange === '30days') startDate = subDays(now, 30);
            else if (viewRange === '90days') startDate = subDays(now, 90);
            else startDate = subMonths(now, 12);

            // Fetch Strategies
            const { data: strategiesData } = await supabase
                .from('business_strategies')
                .select('*')
                .eq('business_id', businessId)
                .gte('end_date', startDate.toISOString())
                .order('start_date', { ascending: true });

            setStrategies(strategiesData || []);

            // Fetch New Customers
            const { data: customersData } = await supabase
                .from('customers')
                .select('id')
                .eq('business_id', businessId)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endOfDay(now).toISOString());

            setNewCustomersCount(customersData?.length || 0);

            // Fetch Sales
            const { data: salesData } = await supabase
                .from('sales')
                .select('*, items:sale_items(unit_price, quantity, product:products(price), service:services(price))')
                .eq('business_id', businessId)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endOfDay(now).toISOString());

            // Process Data by Day, Week, or Month
            const processedData: EvolutionData[] = [];

            if (viewRange === 'year') {
                // Monthly aggregation for year view
                const interval = eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(now) });
                interval.forEach(month => {
                    const monthStart = startOfMonth(month);
                    const monthEnd = endOfMonth(month);
                    const monthSales = (salesData || []).filter(s => {
                        const date = new Date(s.created_at);
                        return date >= monthStart && date <= monthEnd;
                    });

                    let income = 0;
                    let rewards = 0;
                    monthSales.forEach(s => {
                        income += s.total_amount || 0;
                        s.items?.forEach((item: any) => {
                            if (item.unit_price === 0) {
                                rewards += (item.service?.price || item.product?.price || 0) * (item.quantity || 1);
                            }
                        });
                    });

                    processedData.push({
                        date: format(month, 'MMM yyyy'),
                        income,
                        rewards,
                        salesCount: monthSales.length,
                        avgTicket: monthSales.length ? income / monthSales.length : 0
                    });
                });
            } else if (viewRange === '1day') {
                // Hourly aggregation for current shift/today view
                // We show hours from the start of the shift or start of day
                const startHour = startDate.getHours();
                const currentHour = now.getHours();

                for (let i = startHour; i <= currentHour; i++) {
                    const hourDate = new Date(startDate);
                    hourDate.setHours(i, 0, 0, 0);

                    const hourEnd = new Date(startDate);
                    hourEnd.setHours(i, 59, 59, 999);

                    const hourSales = (salesData || []).filter(s => {
                        const date = new Date(s.created_at);
                        return date >= hourStart && date <= hourEnd;
                    });

                    let income = 0;
                    let rewards = 0;
                    hourSales.forEach(s => {
                        income += s.total_amount || 0;
                        s.items?.forEach((item: any) => {
                            if (item.unit_price === 0) {
                                rewards += (item.service?.price || item.product?.price || 0) * (item.quantity || 1);
                            }
                        });
                    });

                    processedData.push({
                        date: `${i}:00`,
                        income,
                        rewards,
                        salesCount: hourSales.length,
                        avgTicket: hourSales.length ? income / hourSales.length : 0
                    });
                }
            } else if (viewRange === '7days') {
                // Daily aggregation for 7-day view
                const interval = eachDayOfInterval({ start: startOfDay(startDate), end: endOfDay(now) });
                interval.forEach(day => {
                    const dayStart = startOfDay(day);
                    const dayEnd = endOfDay(day);
                    const daySales = (salesData || []).filter(s => {
                        const date = new Date(s.created_at);
                        return date >= dayStart && date <= dayEnd;
                    });

                    let income = 0;
                    let rewards = 0;
                    daySales.forEach(s => {
                        income += s.total_amount || 0;
                        s.items?.forEach((item: any) => {
                            if (item.unit_price === 0) {
                                rewards += (item.service?.price || item.product?.price || 0) * (item.quantity || 1);
                            }
                        });
                    });

                    processedData.push({
                        date: format(day, 'dd MMM'),
                        income,
                        rewards,
                        salesCount: daySales.length,
                        avgTicket: daySales.length ? income / daySales.length : 0
                    });
                });
            } else {
                // Daily aggregation for 30-day and 90-day views
                const interval = eachDayOfInterval({ start: startOfDay(startDate), end: endOfDay(now) });
                interval.forEach(day => {
                    const dayStart = startOfDay(day);
                    const dayEnd = endOfDay(day);
                    const daySales = (salesData || []).filter(s => {
                        const date = new Date(s.created_at);
                        return date >= dayStart && date <= dayEnd;
                    });

                    let income = 0;
                    let rewards = 0;
                    daySales.forEach(s => {
                        income += s.total_amount || 0;
                        s.items?.forEach((item: any) => {
                            if (item.unit_price === 0) {
                                rewards += (item.service?.price || item.product?.price || 0) * (item.quantity || 1);
                            }
                        });
                    });

                    processedData.push({
                        date: format(day, 'dd MMM'),
                        income,
                        rewards,
                        salesCount: daySales.length,
                        avgTicket: daySales.length ? income / daySales.length : 0
                    });
                });
            }

            setEvolutionData(processedData);
        } catch (error) {
            console.error('Error fetching evolution data:', error);
        } finally {
            setLoading(false);
        }
    };

    const analysis = useMemo(() => {
        if (evolutionData.length < 2) return null;

        // Calculate growth based on the selected period
        let periodLength = 1;
        if (viewRange === '1day') periodLength = 1;
        else if (viewRange === '7days') periodLength = 7;
        else if (viewRange === '30days') periodLength = Math.min(30, evolutionData.length);
        else if (viewRange === '90days') periodLength = Math.min(90, evolutionData.length);
        else periodLength = Math.min(12, evolutionData.length);

        const compareLength = Math.min(periodLength, Math.floor(evolutionData.length / 2));

        // Ensure we have enough data to compare
        if (compareLength < 1 || evolutionData.length < compareLength * 2) {
            // Not enough data for comparison, just show current stats
            const last = evolutionData[evolutionData.length - 1];
            const rewardRatio = last.income > 0 ? (last.rewards / last.income) * 100 : 0;

            return {
                incomeUplift: 0,
                rewardRatio,
                currentIncome: last.income,
                currentRewards: last.rewards,
                currentCount: last.salesCount
            };
        }

        // Current period (last N items)
        const currentPeriod = evolutionData.slice(-compareLength);
        // Previous period (N items before current)
        const previousPeriod = evolutionData.slice(-compareLength * 2, -compareLength);

        const currentIncome = currentPeriod.reduce((sum, d) => sum + d.income, 0);
        const previousIncome = previousPeriod.reduce((sum, d) => sum + d.income, 0);

        // Calculate growth percentage
        let incomeUplift = 0;
        if (previousIncome > 0) {
            incomeUplift = ((currentIncome - previousIncome) / previousIncome) * 100;
        }
        // If previousIncome is 0, keep uplift at 0 (can't calculate meaningful growth from nothing)
        // If both are 0, uplift remains 0

        const last = evolutionData[evolutionData.length - 1];
        const rewardRatio = last.income > 0 ? (last.rewards / last.income) * 100 : 0;

        return {
            incomeUplift,
            rewardRatio,
            currentIncome: last.income,
            currentRewards: last.rewards,
            currentCount: last.salesCount
        };
    }, [evolutionData, viewRange]);

    // Info Tooltip Component
    const InfoTooltip = ({ id, title, content }: { id: string; title: string; content: string }) => (
        <div className="relative">
            <button
                onClick={() => setOpenTooltip(openTooltip === id ? null : id)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Más información"
            >
                <span className="material-symbols-outlined !text-[14px] text-slate-400">info</span>
            </button>
            {openTooltip === id && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenTooltip(null)}
                    />
                    <div className="absolute top-8 right-0 z-50 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-start gap-2 mb-2">
                            <span className="material-symbols-outlined !text-[18px] text-primary">info</span>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">{title}</h4>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{content}</p>
                    </div>
                </>
            )}
        </div>
    );

    // Format tooltips
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between gap-8">
                            <span className="text-xs font-bold text-slate-500">Ingresos:</span>
                            <span className="text-xs font-black text-emerald-500">${payload[0].value.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-8 border-t border-slate-100 dark:border-slate-700 pt-1 mt-1">
                            <span className="text-xs font-bold text-slate-500">Valor Regalos:</span>
                            <span className="text-xs font-black text-purple-500">${payload[1].value.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-8">
                            <span className="text-xs font-bold text-slate-500">Ticket Promedio:</span>
                            <span className="text-xs font-black text-blue-500">${payload[2]?.value.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Strategy Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setViewRange('1day')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewRange === '1day' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        TURNO ACTUAL
                    </button>
                    <button
                        onClick={() => setViewRange('7days')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewRange === '7days' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        7 DÍAS
                    </button>
                    <button
                        onClick={() => setViewRange('30days')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewRange === '30days' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        30 DÍAS
                    </button>
                    <button
                        onClick={() => setViewRange('90days')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewRange === '90days' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        90 DÍAS
                    </button>
                    <button
                        onClick={() => setViewRange('year')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewRange === 'year' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        AÑO
                    </button>
                </div>

                <button
                    onClick={() => setIsStrategyModalOpen(true)}
                    className="px-6 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-slate-900/10"
                >
                    <span className="material-symbols-outlined !text-[20px]">add_circle</span>
                    MARCAR ESTRATEGIA
                </button>
            </div>

            {/* Main Evolution Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700">
                <div className="mb-8">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Evolución de Ingresos vs. Recompensas</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Impacto de las estrategias en el crecimiento</p>
                </div>

                <div className="h-[400px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={evolutionData}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorRewards" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                tickFormatter={(val) => `$${(val / 1000)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                            />

                            <Area
                                name="Ingresos de Caja"
                                type="monotone"
                                dataKey="income"
                                stroke="#10b981"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorIncome)"
                            />
                            <Area
                                name="Valor Recompensas (Cortesías)"
                                type="monotone"
                                dataKey="rewards"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRewards)"
                            />
                            <Line
                                name="Ticket Promedio"
                                type="monotone"
                                dataKey="avgTicket"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                                strokeDasharray="5 5"
                            />

                            {/* Reference highlights for strategies */}
                            {strategies.map((strategy) => (
                                <ReferenceLine
                                    key={strategy.id}
                                    x={format(new Date(strategy.start_date), viewRange === 'year' ? 'MMM yyyy' : 'dd MMM')}
                                    stroke={strategy.color || '#6366f1'}
                                    strokeWidth={2}
                                    label={{
                                        value: strategy.name,
                                        position: 'insideTopLeft',
                                        fill: strategy.color || '#6366f1',
                                        fontSize: 9,
                                        fontWeight: 'black',
                                        angle: -90,
                                        dy: 60,
                                        dx: 15
                                    }}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crecimiento (Último Periodo)</p>
                        <InfoTooltip
                            id="growth"
                            title="Crecimiento del Negocio"
                            content="Compara los ingresos de la segunda mitad del periodo seleccionado vs. la primera mitad. Ejemplo: si seleccionas 7 días, compara los últimos 3-4 días contra los primeros 3-4 días. Un número positivo indica que el negocio está creciendo."
                        />
                    </div>
                    <div className="flex items-end gap-3">
                        <h4 className="text-3xl font-black text-slate-900 dark:text-white">
                            {analysis?.incomeUplift && analysis.incomeUplift > 0 ? '+' : ''}
                            {analysis?.incomeUplift.toFixed(1)}%
                        </h4>
                        <span className={`material-symbols-outlined !text-4xl ${analysis?.incomeUplift > 0
                            ? 'text-emerald-500'
                            : analysis?.incomeUplift < 0
                                ? 'text-rose-500'
                                : 'text-slate-400'
                            }`}>
                            {analysis?.incomeUplift > 0
                                ? 'trending_up'
                                : analysis?.incomeUplift < 0
                                    ? 'trending_down'
                                    : 'trending_flat'}
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ratio de Fidelización (Cost/Rev)</p>
                        <InfoTooltip
                            id="loyalty"
                            title="Ratio de Fidelización"
                            content="Muestra qué porcentaje de tus ingresos estás invirtiendo en recompensas y cortesías. Fórmula: (Valor de Recompensas ÷ Ingresos) × 100. Un ratio entre 5-15% es saludable. Si es muy alto (>20%), podrías estar regalando demasiado."
                        />
                    </div>
                    <div className="flex items-end gap-3">
                        <h4 className="text-3xl font-black text-purple-600">
                            {analysis?.rewardRatio.toFixed(1)}%
                        </h4>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                            <span className="material-symbols-outlined text-purple-500 !text-2xl">loyalty</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Promedio</p>
                        <InfoTooltip
                            id="avgticket"
                            title="Ticket Promedio"
                            content="Es el valor promedio de cada venta. Se calcula dividiendo los ingresos totales entre el número de ventas. Te ayuda a entender cuánto gasta en promedio cada cliente por visita. Un ticket promedio alto indica mayor valor por transacción."
                        />
                    </div>
                    <div className="flex items-end gap-3">
                        <h4 className="text-3xl font-black text-blue-600">
                            ${Math.round(evolutionData[evolutionData.length - 1]?.avgTicket || 0).toLocaleString()}
                        </h4>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <span className="material-symbols-outlined text-blue-500 !text-2xl">receipt_long</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clientes Nuevos</p>
                        <InfoTooltip
                            id="newcustomers"
                            title="Clientes Nuevos"
                            content="Cuenta cuántos clientes nuevos se registraron en el periodo seleccionado. Te ayuda a medir la efectividad de tus campañas de adquisición. Si este número sube cuando lanzas una promoción, significa que la estrategia está funcionando."
                        />
                    </div>
                    <div className="flex items-end gap-3">
                        <h4 className="text-3xl font-black text-orange-600">
                            {newCustomersCount}
                        </h4>
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                            <span className="material-symbols-outlined text-orange-500 !text-2xl">person_add</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Strategies Timeline */}
            <div className="bg-slate-900 dark:bg-slate-900 rounded-3xl p-8 text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black uppercase tracking-tight">Timeline de Estrategias</h3>
                            <InfoTooltip
                                id="timeline"
                                title="Timeline de Estrategias"
                                content="Aquí puedes marcar eventos importantes como campañas, promociones, alianzas o cambios en el negocio. Cada estrategia aparece como una línea vertical en la gráfica, permitiéndote ver fácilmente si tus acciones generaron cambios en los ingresos. Útil para evaluar qué estrategias funcionan."
                            />
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Historial de campañas y colaboraciones</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {strategies.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl">
                            <span className="material-symbols-outlined !text-5xl mb-3 opacity-20">inventory_2</span>
                            <p className="uppercase font-black text-[10px] tracking-widest">No hay estrategias registradas para este periodo</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {strategies.map((strategy) => (
                                <div
                                    key={strategy.id}
                                    className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                                >
                                    <div className="flex gap-4 items-start mb-4">
                                        <div className="size-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: strategy.color }} />
                                        <div className="flex-1">
                                            <h5 className="font-black text-sm uppercase">{strategy.name}</h5>
                                            <p className="text-[10px] text-slate-400 font-bold mt-1">
                                                {format(new Date(strategy.start_date), 'dd MMM')} - {format(new Date(strategy.end_date), 'dd MMM yyyy')}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteStrategy(strategy.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/20 rounded-lg"
                                            title="Eliminar estrategia"
                                        >
                                            <span className="material-symbols-outlined !text-[16px] text-red-400">delete</span>
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-slate-300 line-clamp-2 italic mb-4">
                                        "{strategy.description || 'Sin descripción'}"
                                    </p>
                                    <div className="flex justify-between items-center text-[10px] pt-4 border-t border-white/5">
                                        <span className="font-black text-slate-500 uppercase tracking-tighter">Impacto</span>
                                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-lg font-black uppercase">En curso</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <StrategyModal
                isOpen={isStrategyModalOpen}
                onClose={() => setIsStrategyModalOpen(false)}
                onSuccess={fetchData}
            />
        </div>
    );
};
