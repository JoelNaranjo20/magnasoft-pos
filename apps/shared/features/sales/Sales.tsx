import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@shared/lib/supabase';
import { SaleDetailsModal } from '@shared/components/modals/SaleDetailsModal';
import { Pagination } from '@shared/components/ui/Pagination';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { BusinessEvolution } from '@shared/components/dashboard/BusinessEvolution';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface CashSession {
    id: string;
    opened_at: string;
    closed_at: string | null;
    status: 'open' | 'closed';
    opening_balance: number;
    worker_id?: string;
    workerName?: string;
}

interface Sale {
    id: string;
    created_at: string;
    total_amount: number;
    payment_method: string;
    status: string;
    cash_amount?: number;
    card_amount?: number;
    transfer_amount?: number;
    credit_amount?: number;
    customer?: { name: string };
    vehicle?: { license_plate: string; type: string };
    worker?: { name: string };
    metadata?: any;
    total_discount?: number;
    items?: { name: string; quantity: number; unit_price: number; total_price: number; service_type: string }[];
}

export const SalesPage = () => {
    const [activeTab, setActiveTab] = useState<'history' | 'evolution'>('history');
    const cashSession = useSessionStore((state: any) => state.cashSession);
    const { businessType } = useBusinessStore();
    const [loading, setLoading] = useState(true);

    // ── Turnos ───────────────────────────────────────────────────────────────
    const [allSessions, setAllSessions] = useState<CashSession[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
        cashSession?.id ?? null
    );

    // Sesión actualmente seleccionada (objeto completo)
    const selectedSession = useMemo(
        () => allSessions.find(s => s.id === selectedSessionId) ?? null,
        [allSessions, selectedSessionId]
    );

    const [sales, setSales] = useState<Sale[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [movements, setMovements] = useState<any[]>([]);
    const [debtPayments, setDebtPayments] = useState<any[]>([]);
    const [sessionOpeningBalance, setSessionOpeningBalance] = useState(0);
    const [expandedReconRows, setExpandedReconRows] = useState<Record<string, boolean>>({});
    const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});

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
                        {(sale.vehicle || sale.metadata?.quick_sale_reference) && (
                            <div className="flex items-center gap-2">
                                <div className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-black text-white relative flex items-center gap-1 shadow-sm">
                                    <span className="w-full h-0.5 bg-yellow-400 absolute top-0 left-0 right-0"></span>
                                    {sale.vehicle?.license_plate || sale.metadata?.quick_sale_reference}
                                </div>
                                <span className="material-symbols-outlined !text-[14px] text-slate-400">
                                    {sale.vehicle ? (sale.vehicle.type === 'motorcycle' ? 'two_wheeler' : 'directions_car') : 'local_taxi'}
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

    // ── Cargar lista de turnos ───────────────────────────────────────────────
    const fetchSessions = async () => {
        setSessionsLoading(true);
        try {
            const businessId = useBusinessStore.getState().id;
            if (!businessId) return;

            const { data: sessionsData, error } = await supabase
                .from('cash_sessions')
                .select('id, opened_at, closed_at, status, opening_balance, worker_id')
                .eq('business_id', businessId)
                .order('opened_at', { ascending: false });

            if (error) throw error;

            // Enriquecer con nombres de trabajadores
            const workerIds = [...new Set((sessionsData || []).map((s: any) => s.worker_id).filter(Boolean))];
            let workerMap: Record<string, string> = {};
            if (workerIds.length > 0) {
                const { data: workers } = await supabase
                    .from('workers')
                    .select('id, name')
                    .in('id', workerIds);
                workerMap = (workers || []).reduce((acc: any, w: any) => { acc[w.id] = w.name; return acc; }, {});
            }

            const enriched: CashSession[] = (sessionsData || []).map((s: any) => ({
                ...s,
                workerName: workerMap[s.worker_id] || undefined,
            }));

            setAllSessions(enriched);

            // Preseleccionar turno activo si existe, sino el primero
            if (!selectedSessionId) {
                const active = enriched.find(s => s.status === 'open');
                setSelectedSessionId(active?.id ?? enriched[0]?.id ?? null);
            }
        } catch (err) {
            console.error('Error fetching sessions for filter:', err);
        } finally {
            setSessionsLoading(false);
        }
    };

    useEffect(() => { fetchSessions(); }, []);

    // Dispara la carga de datos cuando cambia el turno seleccionado
    // O cuando allSessions carga por primera vez (length 0 → N)
    useEffect(() => {
        if (selectedSessionId && allSessions.length > 0) {
            fetchSales();
            fetchMovements();
            fetchDebtPayments();
        }
    }, [selectedSessionId, allSessions.length]);

    // Mantiene el opening_balance sincronizado con el turno seleccionado
    useEffect(() => {
        setSessionOpeningBalance(selectedSession?.opening_balance ?? 0);
    }, [selectedSession]);

    const fetchMovements = async () => {
        if (!selectedSessionId) return;
        try {
            const { data, error } = await supabase
                .from('cash_movements')
                .select('*')
                .eq('session_id', selectedSessionId);
            if (error) throw error;
            setMovements(data || []);
        } catch (error) {
            console.error('Error fetching movements:', error);
        }
    };

    const fetchDebtPayments = async () => {
        if (!selectedSessionId) return;
        try {
            const { data, error } = await (supabase as any)
                .from('debt_payments')
                .select('amount, payment_method')
                .eq('cash_session_id', selectedSessionId);
            if (error) throw error;
            setDebtPayments(data || []);
        } catch (error) {
            console.error('Error fetching debt payments:', error);
        }
    };

    const fetchSales = async () => {
        if (!selectedSessionId) return;
        setLoading(true);
        try {
            const businessId = useBusinessStore.getState().id;
            if (!businessId) return;

            const { data, error } = await supabase
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
                .eq('business_id', businessId)
                .eq('session_id', selectedSessionId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSales((data || []) as unknown as Sale[]);
            setCurrentPage(1);
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



    const reconciliation = useMemo(() => {
        const totals = {
            sales_cash: 0,
            sales_digital: 0,
            sales_credit: 0,
            tips_cash: 0,
            tips_digital: 0,
            abonos_cash: 0,
            abonos_digital: 0,
            expenses: 0,
            liquidaciones: 0,
            uso_interno: 0,
            promociones: 0,
            rebajas: 0,
            canjes_net_cash: 0,
            canjes_net_digital: 0,
        };

        filteredSales.forEach(sale => {
            const tot = sale.total_amount || 0;
            totals.rebajas += (sale.total_discount || 0);
            
            // Calculate promotions for this sale (same logic as dashboard)
            let salePromotions = 0;
            sale.items?.forEach((item: any) => {
                // Determine if this item was free (reward) and its original price is non-zero
                if (item.unit_price === 0) {
                     const originalPrice = item.service?.price || item.product?.price || 0;
                     salePromotions += (originalPrice * (item.quantity || 1));
                }
            });
            
            totals.promociones += salePromotions;
            
            // Extract the promotions from the gross total_discount amount, so 'rebajas' 
            // strictly reflects manual price edits/markdowns.
            totals.rebajas -= salePromotions;
            
            // Ensure rebajas doesn't go below 0 due to floating point inaccuracies
            if (totals.rebajas < 0) totals.rebajas = 0;

            const tip = sale.metadata?.tip_amount || 0;

            if (sale.payment_method === 'mixed') {
                // Use precise sub-amounts for mixed payments
                let cashPart = sale.cash_amount || 0;
                let digitalPart = (sale.card_amount || 0) + (sale.transfer_amount || 0);
                let creditPart = sale.credit_amount || 0;
                
                if (tip > 0) {
                    if (cashPart >= tip) {
                        cashPart -= tip;
                        totals.tips_cash += tip;
                    } else if (digitalPart >= tip) {
                        digitalPart -= tip;
                        totals.tips_digital += tip;
                    } else {
                        totals.tips_cash += tip;
                    }
                }
                
                totals.sales_cash += cashPart;
                totals.sales_digital += digitalPart;
                totals.sales_credit += creditPart;
            } else if (sale.payment_method === 'cash') {
                totals.sales_cash += tot;
                totals.tips_cash += tip;
            } else if (sale.payment_method === 'card' || sale.payment_method === 'transfer') {
                totals.sales_digital += tot;
                totals.tips_digital += tip;
            } else if (sale.payment_method === 'credit') {
                totals.sales_credit += tot;
            }
        });

        // Process movements (expenses/canjes only — abonos come from debt_payments)
        movements.forEach(m => {
            const desc = (m.description || '').toLowerCase();
            const isCanje = desc.startsWith('[canje]');
            
            if (m.type === 'expense') {
                if (!isCanje) {
                    if (desc.includes('pago de comisiones')) {
                        totals.liquidaciones += m.amount || 0;
                    } else if (desc.startsWith('[uso interno]')) {
                        totals.uso_interno += m.amount || 0;
                    } else {
                        totals.expenses += m.amount || 0;
                    }
                } else {
                    // Canje Out (Usually Cash)
                    if (m.payment_method === 'cash' || !m.payment_method) {
                        totals.canjes_net_cash -= (m.amount || 0);
                    } else {
                        totals.canjes_net_digital -= (m.amount || 0);
                    }
                }
            } else if (m.type === 'income') {
                if (!isCanje) {
                    // Non-canje income movements (manual incomes, NOT abonos)
                    // Abonos are now sourced from debt_payments table directly
                    const isAbono = desc.includes('abono') || desc.includes('crédito');
                    if (!isAbono) {
                        // Generic manual income
                        if (desc.includes('transferencia') || desc.includes('tarjeta') || m.payment_method === 'transfer' || m.payment_method === 'card') {
                            totals.abonos_digital += m.amount || 0;
                        } else {
                            totals.abonos_cash += m.amount || 0;
                        }
                    }
                } else {
                    // Canje In
                    if (m.payment_method === 'transfer' || m.payment_method === 'card') {
                        totals.canjes_net_digital += (m.amount || 0);
                    } else {
                        totals.canjes_net_cash += (m.amount || 0);
                    }
                }
            }
        });

        // Process debt payments (abonos) from the debt_payments table directly
        // This is the authoritative source — same approach as CashierStatus.tsx
        debtPayments.forEach((dp: any) => {
            if (dp.payment_method === 'cash') {
                totals.abonos_cash += dp.amount || 0;
            } else {
                totals.abonos_digital += dp.amount || 0;
            }
        });

        return totals;
    }, [filteredSales, movements, debtPayments]);

    // ── Desglose detallado para cada fila de conciliación ──────────────
    const reconciliationDetails = useMemo(() => {
        const d: Record<string, Array<{label: string; sub?: string; amount: number; time?: string}>> = {
            sales_cash: [], sales_digital: [], sales_credit: [],
            tips_cash: [], tips_digital: [],
            abonos_cash: [], abonos_digital: [],
            expenses: [], liquidaciones: [], uso_interno: [],
            rebajas: [], promociones: [],
        };

        filteredSales.forEach(sale => {
            const rid = sale.id ? sale.id.slice(-6).toUpperCase() : '—';
            const cname = (sale as any).customer?.name || 'Venta Rápida';
            const t = sale.created_at ? new Date(sale.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
            const tot = sale.total_amount || 0;
            const tip = (sale as any).metadata?.tip_amount || 0;

            // Discount breakdown
            let totalDisc = (sale as any).total_discount || 0;
            let promos = 0;
            (sale as any).items?.forEach((item: any) => {
                if (item.unit_price === 0) {
                    promos += ((item.service?.price || item.product?.price || 0) * (item.quantity || 1));
                }
            });
            const manualDisc = Math.max(0, totalDisc - promos);
            if (manualDisc > 0) d.rebajas.push({ label: `#${rid}`, sub: cname, amount: manualDisc, time: t });
            if (promos > 0) d.promociones.push({ label: `#${rid}`, sub: cname, amount: promos, time: t });

            if (sale.payment_method === 'mixed') {
                let cash = (sale as any).cash_amount || 0;
                let digital = ((sale as any).card_amount || 0) + ((sale as any).transfer_amount || 0);
                const credit = (sale as any).credit_amount || 0;
                if (tip > 0) {
                    if (cash >= tip) { cash -= tip; d.tips_cash.push({ label: `#${rid}`, sub: cname, amount: tip, time: t }); }
                    else if (digital >= tip) { digital -= tip; d.tips_digital.push({ label: `#${rid}`, sub: cname, amount: tip, time: t }); }
                    else { d.tips_cash.push({ label: `#${rid}`, sub: cname, amount: tip, time: t }); }
                }
                if (cash > 0) d.sales_cash.push({ label: `#${rid}`, sub: cname, amount: cash, time: t });
                if (digital > 0) d.sales_digital.push({ label: `#${rid}`, sub: cname, amount: digital, time: t });
                if (credit > 0) d.sales_credit.push({ label: `#${rid}`, sub: cname, amount: credit, time: t });
            } else if (sale.payment_method === 'cash') {
                d.sales_cash.push({ label: `#${rid}`, sub: cname, amount: tot, time: t });
                if (tip > 0) d.tips_cash.push({ label: `#${rid}`, sub: cname, amount: tip, time: t });
            } else if (sale.payment_method === 'card' || sale.payment_method === 'transfer') {
                d.sales_digital.push({ label: `#${rid}`, sub: cname, amount: tot, time: t });
                if (tip > 0) d.tips_digital.push({ label: `#${rid}`, sub: cname, amount: tip, time: t });
            } else if (sale.payment_method === 'credit') {
                d.sales_credit.push({ label: `#${rid}`, sub: cname, amount: tot, time: t });
            }
        });

        movements.forEach(m => {
            const desc = (m.description || '').toLowerCase();
            const isCanje = desc.startsWith('[canje]');
            const t = m.created_at ? new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
            if (m.type === 'expense' && !isCanje) {
                if (desc.includes('pago de comisiones')) {
                    d.liquidaciones.push({ label: m.description || 'Liquidación', amount: m.amount || 0, time: t });
                } else if (desc.startsWith('[uso interno]')) {
                    d.uso_interno.push({ label: (m.description || '').replace(/^\[Uso Interno\]\s*/i, ''), amount: m.amount || 0, time: t });
                } else {
                    d.expenses.push({ label: m.description || 'Salida', amount: m.amount || 0, time: t });
                }
            }
        });

        debtPayments.forEach((dp: any) => {
            const t = dp.created_at ? new Date(dp.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
            const client = dp.sale?.customer?.name || dp.sale?.customer_name || 'Cliente';
            if (dp.payment_method === 'cash') {
                d.abonos_cash.push({ label: client, amount: dp.amount || 0, time: t });
            } else {
                d.abonos_digital.push({ label: client, amount: dp.amount || 0, time: t });
            }
        });

        return d;
    }, [filteredSales, movements, debtPayments]);

    const toggleReconRow = (key: string) => setExpandedReconRows(prev => ({ ...prev, [key]: !prev[key] }));

    const renderReconRow = (rKey: string, label: string, amount: number, dotColor: string, valueColor: string, sign: string, hoverBg: string, items: Array<{label: string; sub?: string; amount: number; time?: string}>) => {
        const isOpen = expandedReconRows[rKey] || false;
        const has = items.length > 0;
        return (
            <div key={rKey}>
                <div onClick={has ? () => toggleReconRow(rKey) : undefined}
                    className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${hoverBg} transition-colors ${has ? 'cursor-pointer group' : ''}`}>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 select-none">
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                        {label}
                        {has && <span className={`material-symbols-outlined !text-[14px] text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>}
                    </span>
                    <span className={`text-xs font-black ${valueColor} tabular-nums`}>{sign}${amount.toLocaleString()}</span>
                </div>
                {isOpen && has && (
                    <div className={`pl-4 pr-2 py-1 space-y-0 rounded-lg border border-dashed max-h-[150px] overflow-y-auto custom-scrollbar my-1 animate-in slide-in-from-top-1 duration-150 ${
                        sign === '+' ? 'bg-emerald-50/20 dark:bg-emerald-900/5 border-emerald-100 dark:border-emerald-900/20' : 'bg-rose-50/20 dark:bg-rose-900/5 border-rose-100 dark:border-rose-900/20'
                    }`}>
                        {items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 py-1 border-b border-slate-100/50 dark:border-slate-800/30 last:border-b-0">
                                <div className="pr-2 truncate flex items-center gap-1.5">
                                    <span className="font-mono text-slate-400">{item.label}</span>
                                    {item.sub && <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{item.sub}</span>}
                                    {item.time && <span className="text-[9px] text-slate-400">({item.time})</span>}
                                </div>
                                <span className={`font-black tabular-nums whitespace-nowrap ${
                                    sign === '+' ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                                }`}>{sign}${item.amount.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ── Desglose por servicio/producto (como el cuaderno) ─────────────
    const salesByService = useMemo(() => {
        const map: Record<string, { total: number; details: any[] }> = {};
        filteredSales.forEach(sale => {
            const dateStr = sale.created_at ? new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const customerName = sale.customer?.name || 'Venta Rápida';
            const receiptId = sale.id ? `#${sale.id.slice(-6).toUpperCase()}` : '';

            sale.items?.forEach((item: any) => {
                const name = (item.name || 'Otro').trim();
                const qty = item.quantity || 1;
                
                // Calculate gross (real/original) amount using original_price
                const originalUnitPrice = Number(item.original_price || item.unit_price || item.price || 0);
                const amount = originalUnitPrice * qty;

                if (!map[name]) {
                    map[name] = { total: 0, details: [] };
                }

                map[name].total += amount;
                map[name].details.push({
                    receiptId,
                    customerName,
                    qty,
                    amount,
                    dateStr,
                    isPromo: item.unit_price === 0
                });
            });
        });

        // Ordenar de mayor a menor por total
        return Object.entries(map)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([name, data]) => ({ name, total: data.total, details: data.details }));
    }, [filteredSales]);



    const cashFlowTotal = useMemo(() => {
        const base = sessionOpeningBalance;
        return base + (reconciliation.sales_cash + reconciliation.tips_cash + reconciliation.abonos_cash + reconciliation.canjes_net_cash) - reconciliation.expenses - reconciliation.liquidaciones;
    }, [reconciliation, sessionOpeningBalance]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const paginatedSales = filteredSales.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Helper: etiqueta de turno
    const sessionLabel = (s: CashSession) => {
        const openDate = new Date(s.opened_at);
        const dateStr = format(openDate, "d 'de' MMMM", { locale: es });
        const timeStr = format(openDate, 'HH:mm');

        let closeLabel: string | null = null;
        if (s.closed_at) {
            const closeDate = new Date(s.closed_at);
            const closeTimeStr = format(closeDate, 'HH:mm');
            // If closed on a different calendar day, include the date
            const sameDay = openDate.toDateString() === closeDate.toDateString();
            closeLabel = sameDay
                ? `→ Cierre ${closeTimeStr}`
                : `→ Cierre ${format(closeDate, "d 'de' MMMM", { locale: es })} ${closeTimeStr}`;
        }

        return { dateStr, timeStr, closeLabel };
    };

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
                    {/* ── Filtro por Turno ─────────────────────────────── */}
                    <div className="w-full">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 flex flex-col gap-3">

                            {/* Buscador */}
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-[18px]">search</span>
                                <input
                                    type="text"
                                    placeholder="Buscar placa, cliente..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 text-xs"
                                />
                            </div>

                            {/* Selector de Turno */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <span className="material-symbols-outlined !text-[12px]">schedule</span>
                                        Filtrar por Turno
                                    </span>
                                    <button
                                        onClick={fetchSessions}
                                        title="Actualizar turnos"
                                        className="text-slate-400 hover:text-primary transition-colors p-0.5"
                                    >
                                        <span className="material-symbols-outlined !text-[14px]">refresh</span>
                                    </button>
                                </div>

                                {sessionsLoading ? (
                                    <div className="flex items-center gap-2 py-2 text-slate-400">
                                        <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                        <span className="text-[10px] font-bold">Cargando turnos...</span>
                                    </div>
                                ) : allSessions.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 italic py-1">No hay turnos registrados.</p>
                                ) : (
                                    <select
                                        value={selectedSessionId || ''}
                                        onChange={(e) => setSelectedSessionId(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold text-slate-900 dark:text-white text-xs appearance-none cursor-pointer"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                                    >
                                        {/* Turno activo primero */}
                                        {allSessions.filter(s => s.status === 'open').length > 0 && (
                                            <optgroup label="⚡ Turno Activo">
                                                {allSessions.filter(s => s.status === 'open').map(s => {
                                                    const { dateStr, timeStr } = sessionLabel(s);
                                                    return (
                                                        <option key={s.id} value={s.id}>
                                                            🟢 {dateStr} — Apertura {timeStr}{s.workerName ? ` — ${s.workerName}` : ''}
                                                        </option>
                                                    );
                                                })}
                                            </optgroup>
                                        )}
                                        {/* Turnos cerrados */}
                                        {allSessions.filter(s => s.status === 'closed').length > 0 && (
                                            <optgroup label="📋 Turnos Anteriores">
                                                {allSessions.filter(s => s.status === 'closed').map(s => {
                                                    const { dateStr, timeStr, closeLabel } = sessionLabel(s);
                                                    return (
                                                        <option key={s.id} value={s.id}>
                                                            🔴 {dateStr} — Apertura {timeStr}{closeLabel ? ` ${closeLabel}` : ''}{s.workerName ? ` — ${s.workerName}` : ''}
                                                        </option>
                                                    );
                                                })}
                                            </optgroup>
                                        )}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Resumen del Turno ────────────── */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 overflow-hidden">

                        {/* Header */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary !text-2xl">receipt_long</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">Resumen del Turno</h3>
                                    <p className="text-[10px] text-slate-400 font-medium capitalize">
                                        {selectedSession
                                            ? format(new Date(selectedSession.opened_at), "EEEE d 'de' MMMM yyyy", { locale: es })
                                            : 'Sin turno seleccionado'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Dos columnas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700">
                            
                            {/* ══ IZQUIERDA: Ventas del Turno (todo lo vendido) ══ */}
                            <div className="p-5 flex flex-col">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-primary !text-[16px]">shopping_basket</span>
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Ventas del Turno</span>
                                    <span className="text-[9px] font-bold text-slate-400 ml-auto">{filteredSales.length} ventas</span>
                                </div>

                                <div className="space-y-0.5 flex-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                    {salesByService.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic py-6 text-center">Sin ventas en este turno</p>
                                    ) : (
                                        salesByService.map((item, i) => {
                                            const isExpanded = !!expandedServices[item.name];
                                            return (
                                                <div key={i} className="border-b border-slate-100 dark:border-slate-800/40 last:border-b-0 py-1">
                                                    <div 
                                                        onClick={() => {
                                                            setExpandedServices(prev => ({
                                                                ...prev,
                                                                [item.name]: !prev[item.name]
                                                            }));
                                                        }}
                                                        className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer select-none"
                                                    >
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 capitalize">
                                                            <span className={`material-symbols-outlined !text-[16px] text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                                keyboard_arrow_down
                                                            </span>
                                                            {item.name}
                                                        </span>
                                                        <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                                                            = ${item.total.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    
                                                    {isExpanded && (
                                                        <div className="pl-6 pr-2 py-1.5 space-y-1 bg-slate-50/50 dark:bg-slate-900/10 rounded-lg border border-dashed border-slate-200 dark:border-slate-800/60 max-h-[180px] overflow-y-auto custom-scrollbar my-1 animate-in slide-in-from-top-1 duration-150">
                                                            {item.details.map((detail, dIdx) => (
                                                                <div key={dIdx} className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 py-1 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                                                    <div className="flex items-center gap-2 truncate mr-4">
                                                                        <span className="font-mono text-slate-400">{detail.receiptId}</span>
                                                                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{detail.customerName}</span>
                                                                        <span className="text-slate-400 text-[9px]">({detail.dateStr})</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 font-black tabular-nums">
                                                                        <span className="text-slate-400">x{detail.qty}</span>
                                                                        <span className={detail.isPromo ? 'text-purple-600 dark:text-purple-400' : 'text-slate-800 dark:text-slate-200'}>
                                                                            ${detail.amount.toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Venta Total */}
                                {salesByService.length > 0 && (
                                    <div className="mt-3 pt-3 border-t-2 border-slate-900 dark:border-white px-2 flex items-center justify-between">
                                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Venta Total</span>
                                        <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                                            ${salesByService.reduce((sum, s) => sum + s.total, 0).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* ══ DERECHA: Conciliación ══ */}
                            <div className="p-5 flex flex-col">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-slate-500 !text-[16px]">calculate</span>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Conciliación</span>
                                </div>

                                <div className="space-y-0.5 flex-1">
                                    {/* ── ENTRADAS (+) ── */}
                                    <div className="px-2 py-1">
                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">+ Entradas</span>
                                    </div>
                                    {renderReconRow('sales_cash', 'Ventas Efectivo', reconciliation.sales_cash, 'bg-emerald-500', 'text-emerald-600 dark:text-emerald-400', '+', 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10', reconciliationDetails.sales_cash)}
                                    {renderReconRow('sales_digital', 'Transferencias / Tarjeta', reconciliation.sales_digital, 'bg-indigo-500', 'text-indigo-600 dark:text-indigo-400', '+', 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10', reconciliationDetails.sales_digital)}
                                    {renderReconRow('abonos_cash', 'Abonos en Efectivo', reconciliation.abonos_cash, 'bg-sky-500', 'text-sky-600 dark:text-sky-400', '+', 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10', reconciliationDetails.abonos_cash)}
                                    {renderReconRow('abonos_digital', 'Abonos en Transferencia', reconciliation.abonos_digital, 'bg-blue-500', 'text-blue-600 dark:text-blue-400', '+', 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10', reconciliationDetails.abonos_digital)}
                                    {reconciliation.tips_cash > 0 && renderReconRow('tips_cash', 'Propinas (Efectivo)', reconciliation.tips_cash, 'bg-amber-500', 'text-emerald-600 dark:text-emerald-400', '+', 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10', reconciliationDetails.tips_cash)}
                                    {reconciliation.tips_digital > 0 && renderReconRow('tips_digital', 'Propinas (Digital)', reconciliation.tips_digital, 'bg-orange-500', 'text-indigo-600 dark:text-indigo-400', '+', 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10', reconciliationDetails.tips_digital)}

                                    {/* Subtotal Entradas (Efectivo) */}
                                    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/10 mt-2 border-t border-emerald-100 dark:border-emerald-900/30 font-bold">
                                        <span className="text-xs text-emerald-700 dark:text-emerald-400">Total Entradas (Efectivo)</span>
                                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                                            +${(reconciliation.sales_cash + reconciliation.tips_cash + reconciliation.abonos_cash + reconciliation.canjes_net_cash).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* ── SALIDAS (−) ── */}
                                    <div className="px-2 py-1 mt-2">
                                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">− Salidas</span>
                                    </div>
                                    {reconciliation.sales_credit > 0 && renderReconRow('sales_credit', 'Venta a Crédito', reconciliation.sales_credit, 'bg-orange-500', 'text-orange-600 dark:text-orange-400', '−', 'hover:bg-rose-50/50 dark:hover:bg-rose-900/10', reconciliationDetails.sales_credit)}
                                    {reconciliation.liquidaciones > 0 && renderReconRow('liquidaciones', 'Pago Comisiones / Propinas', reconciliation.liquidaciones, 'bg-amber-500', 'text-rose-600 dark:text-rose-400', '−', 'hover:bg-rose-50/50 dark:hover:bg-rose-900/10', reconciliationDetails.liquidaciones)}
                                    {reconciliation.expenses > 0 && renderReconRow('expenses', 'Salidas de Caja', reconciliation.expenses, 'bg-rose-500', 'text-rose-600 dark:text-rose-400', '−', 'hover:bg-rose-50/50 dark:hover:bg-rose-900/10', reconciliationDetails.expenses)}
                                    {reconciliation.uso_interno > 0 && renderReconRow('uso_interno', 'Uso Interno', reconciliation.uso_interno, 'bg-orange-500', 'text-orange-600 dark:text-orange-400', '−', 'hover:bg-rose-50/50 dark:hover:bg-rose-900/10', reconciliationDetails.uso_interno)}
                                    {reconciliation.rebajas > 0 && renderReconRow('rebajas', 'Descuentos', reconciliation.rebajas, 'bg-amber-500', 'text-amber-600 dark:text-amber-400', '−', 'hover:bg-rose-50/50 dark:hover:bg-rose-900/10', reconciliationDetails.rebajas)}
                                    {reconciliation.promociones > 0 && renderReconRow('promociones', 'Promociones (Fidelidad)', reconciliation.promociones, 'bg-purple-500', 'text-purple-600 dark:text-purple-400', '−', 'hover:bg-rose-50/50 dark:hover:bg-rose-900/10', reconciliationDetails.promociones)}

                                    {/* Subtotal Salidas (Efectivo) */}
                                    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-rose-50/30 dark:bg-rose-950/10 mt-2 border-t border-rose-100 dark:border-rose-900/30 font-bold">
                                        <span className="text-xs text-rose-700 dark:text-rose-400">Total Salidas (Efectivo)</span>
                                        <span className="text-xs font-black text-rose-700 dark:text-rose-400 tabular-nums">
                                            −${(reconciliation.expenses + reconciliation.liquidaciones).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* ── RESULTADO ── */}
                                <div className="mt-3 pt-3 border-t-2 border-slate-900 dark:border-white">
                                    <div className="px-2 flex items-center justify-between">
                                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="material-symbols-outlined !text-[18px]">account_balance_wallet</span>
                                            Efectivo en Caja
                                        </span>
                                        <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">${cashFlowTotal.toLocaleString()}</span>
                                    </div>
                                    {sessionOpeningBalance > 0 && (
                                        <p className="text-[9px] text-slate-400 font-bold px-2 mt-1">Incluye base de apertura: ${sessionOpeningBalance.toLocaleString()}</p>
                                    )}
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
                                                                {sale.payment_method === 'mixed' ? (
                                                                    <span className="inline-flex flex-col gap-0.5">
                                                                        <span className="text-[8px] font-black text-violet-700 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-violet-200 dark:border-violet-800 flex items-center gap-1">
                                                                            <span className="material-symbols-outlined !text-[9px]">shuffle</span>
                                                                            Mixto
                                                                        </span>
                                                                        {((sale.cash_amount || 0) > 0 || (sale.card_amount || 0) > 0 || (sale.transfer_amount || 0) > 0) && (
                                                                            <span className="text-[8px] text-slate-400 font-bold leading-tight">
                                                                                {(sale.cash_amount || 0) > 0 && <span className="mr-1">💵 ${(sale.cash_amount || 0).toLocaleString()}</span>}
                                                                                {((sale.card_amount || 0) + (sale.transfer_amount || 0)) > 0 && <span>📲 ${((sale.card_amount || 0) + (sale.transfer_amount || 0)).toLocaleString()}</span>}
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[8px] font-black text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                                        {sale.payment_method === 'cash' ? '💵 Efectivo' :
                                                                            sale.payment_method === 'card' ? '💳 Tarjeta' :
                                                                                sale.payment_method === 'transfer' ? '📲 Transf.' :
                                                                                    sale.payment_method === 'credit' ? '📋 Fiado' :
                                                                                        sale.payment_method || '-'}
                                                                    </span>
                                                                )}
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
                                                            ${(sale.total_amount + (sale.total_discount || 0)).toLocaleString()}
                                                        </span>
                                                        {(sale.total_discount || 0) > 0 && (
                                                            <span className="text-xs font-bold text-amber-500 ml-1">
                                                                (-${sale.total_discount?.toLocaleString()})
                                                            </span>
                                                        )}
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
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className={`text-lg leading-none font-black ${sale.total_amount === 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                                            ${(sale.total_amount + (sale.total_discount || 0)).toLocaleString()}
                                                        </span>
                                                        {(sale.total_discount || 0) > 0 && (
                                                            <span className="text-[10px] font-bold text-amber-500">
                                                                (-${sale.total_discount?.toLocaleString()})
                                                            </span>
                                                        )}
                                                    </div>
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
