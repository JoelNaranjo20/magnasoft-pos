'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export type ViewPeriod = 'day' | 'week' | 'month';

export interface RewardDetail {
    id: string;
    sale_id: string;
    name: string;
    original_price: number;
    quantity: number;
    created_at: string;
    customer_name?: string;
}

export interface DashboardData {
    totalIncome: number;
    transactionCount: number;
    avgTicket: number;
    activeServices: number;
    uniqueCustomers: number;
    lostRevenue: number;
    recentTransactions: any[];
    allTransactions: any[];
    salesByHour: any[];
    recentSessions: any[];
    movements: any[];
    rewardDetails: RewardDetail[];
    expenses: number;
    cashSales: number;
    digitalSales: number;
    creditSales: number;
    cashAbonos: number;
    digitalAbonos: number;
    stats: {
        carWashes: number;
        products: number;
        alignments: number;
        balancing: number;
        oilChanges: number;
        mechanics: number;
        totalItems: number;
        expenses: number;
        rewardCosts: number;
    };
}

export function useDashboardData() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('day');

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Get active session for accurate 'day' filtering if exists (like desktop)
            const { data: activeSession } = await supabase
                .from('cash_sessions')
                .select('*')
                .is('closed_at', null)
                .order('opened_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const today = new Date();
            let startDate: Date;
            let endDate = new Date(today);

            if (viewPeriod === 'day') {
                if (activeSession) {
                    startDate = new Date(activeSession.opened_at);
                    // Use now as end date if session is open
                    endDate = new Date();
                    endDate.setSeconds(endDate.getSeconds() + 1);
                } else {
                    startDate = new Date(today.setHours(0, 0, 0, 0));
                    endDate = new Date(today.setHours(23, 59, 59, 999));
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

            // 2. Fetch Sales for period with details (including prices for reward cost calc)
            const { data: salesData, error: salesError } = await supabase
                .from('sales')
                .select(`
                    *,
                    customer:customers (name),
                    vehicle:vehicles (license_plate, type),
                    items:sale_items (
                        *,
                        product:products(price),
                        service:services(price)
                    )
                `)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: false });

            if (salesError) throw salesError;
            const sales = salesData || [];

            // 3. Process Sales, Stats, and Rewards
            let income = 0;
            let carWashes = 0;
            let products = 0;
            let alignments = 0;
            let balancing = 0;
            let oilChanges = 0;
            let mechanics = 0;
            let totalItems = 0;
            let totalLostRevenue = 0;
            const rewardDetails: RewardDetail[] = [];

            const chartMap = new Map();
            if (viewPeriod === 'day') {
                // For day view, we initialize based on the range (could be > 24h if session is old)
                // But usually we just show 24h or the session hours.
                for (let i = 0; i < 24; i++) chartMap.set(i, { name: `${i}:00`, value: 0 });
            } else if (viewPeriod === 'week') {
                const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                for (let i = 0; i < 7; i++) chartMap.set(i, { name: days[i], value: 0 });
            } else {
                const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                for (let i = 1; i <= daysInMonth; i++) chartMap.set(i, { name: `${i}`, value: 0 });
            }

            sales.forEach((sale: any) => {
                income += sale.total_amount || 0;

                const saleDate = new Date(sale.created_at);
                let key;
                if (viewPeriod === 'day') key = saleDate.getHours();
                else if (viewPeriod === 'week') key = saleDate.getDay();
                else key = saleDate.getDate();

                if (chartMap.has(key)) {
                    const entry = chartMap.get(key);
                    entry.value += sale.total_amount || 0;
                }

                sale.items?.forEach((item: any) => {
                    const qty = item.quantity || 1;
                    totalItems += qty;
                    const name = (item.name || '').toLowerCase();
                    const type = item.service_type || '';

                    // Lost Revenue from rewards ($0 items)
                    if (item.unit_price === 0) {
                        const originalPrice = item.service?.price || item.product?.price || 0;
                        const lostValue = (originalPrice * qty);
                        totalLostRevenue += lostValue;

                        rewardDetails.push({
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

            let processedChartData = Array.from(chartMap.values());
            if (viewPeriod === 'week') {
                const sunday = processedChartData.shift();
                if (sunday) processedChartData.push(sunday);
            }

            // 4. Fetch Cash Movements (Expenses + Abonos/Manual Incomes)
            const { data: movementsData } = await supabase
                .from('cash_movements')
                .select('*')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            const movements = movementsData || [];
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

            sales.forEach((sale: any) => {
                const total = sale.total_amount || 0;
                if (sale.payment_method === 'cash') cashSales += total;
                else if (sale.payment_method === 'credit') creditSales += total;
                else digitalSales += total;
            });

            // 5. Fetch Active Services
            const { data: activeServicesData } = await supabase
                .from('service_queue')
                .select('id')
                .eq('status', 'waiting');

            // 6. Fetch recent sessions
            const { data: sessions } = await supabase
                .from('cash_sessions')
                .select('*, worker:workers(name)')
                .order('opened_at', { ascending: false })
                .limit(5);

            setData({
                totalIncome: income,
                transactionCount: sales.length,
                avgTicket: sales.length ? income / sales.length : 0,
                activeServices: activeServicesData?.length || 0,
                uniqueCustomers: new Set(sales.map((s: any) => s.customer_id).filter(Boolean)).size,
                lostRevenue: totalLostRevenue,
                movements: movements,
                rewardDetails: rewardDetails,
                expenses: totalExpenses,
                cashSales,
                digitalSales,
                creditSales,
                cashAbonos,
                digitalAbonos,
                allTransactions: sales.map(sale => ({
                    id: sale.id,
                    created_at: sale.created_at,
                    time: new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    customer: (sale as any).customer?.name || 'Cliente General',
                    vehicle: (sale as any).vehicle,
                    service: (sale as any).items?.[0]?.name || 'Varios',
                    total: sale.total_amount,
                    status: 'Completado',
                    items: sale.items,
                    payment_method: sale.payment_method
                })),
                recentTransactions: sales.slice(0, 5).map(sale => ({
                    id: sale.id,
                    created_at: sale.created_at,
                    time: new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    customer: (sale as any).customer?.name || 'Cliente General',
                    vehicle: (sale as any).vehicle,
                    service: (sale as any).items?.[0]?.name || 'Varios',
                    total: sale.total_amount,
                    status: 'Completado',
                    items: sale.items,
                    payment_method: sale.payment_method
                })) || [],
                salesByHour: processedChartData,
                recentSessions: sessions || [],
                stats: {
                    carWashes,
                    products,
                    alignments,
                    balancing,
                    oilChanges,
                    mechanics,
                    totalItems,
                    expenses: totalExpenses,
                    rewardCosts: totalLostRevenue
                }
            });
        } catch (err: any) {
            console.error('Error fetching dashboard data:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [viewPeriod]);

    return { data, loading, error, viewPeriod, setViewPeriod, refresh: fetchData };
}
