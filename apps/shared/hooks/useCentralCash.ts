// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@shared/lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';

export interface CentralCashMetadata {
    cash_sales: number;
    transfer_sales: number;
    card_sales: number;
    cash_abonos: number;
    transfer_abonos: number;
    card_abonos: number;
    cash_loan_payments: number;
    transfer_loan_payments: number;
    cash_other: number;
    transfer_other: number;
    commissions_paid: number;
}

export interface CentralMovement {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    payment_method: 'cash' | 'transfer' | 'card' | 'mixed' | null;
    session_id: string | null;
    metadata: CentralCashMetadata | null;
    created_at: string;
    user_id: string;
}

interface BackfillResult {
    success: boolean;
    processed: number;
    skipped: number;
    message: string;
}

/** Datos de analytics: ventas agrupadas por categoría y servicio para un mes */
export interface CategorySalesData {
    categoryId: string;
    categoryName: string;
    categoryIcon: string | null;
    totalAmount: number;
    salesCount: number;
    percentage: number;
    services: ServiceSalesItem[];
}

interface ServiceSalesItem {
    serviceId: string;
    serviceName: string;
    quantity: number;
    totalAmount: number;
    avgPrice: number;
}

/** Item genérico para modales de detalle (Egresos, Liquidaciones) */
export interface DetailItem {
    label: string;
    amount: number;
    date?: string;
    description?: string;
}

/** Trabajador asalariado para modal de Nómina */
export interface TrabajadorAsalariado {
    id: string;
    name: string;
    salary: number;
}

/** Comisionista diario (sin salario fijo) para modal de Nómina */
export interface ComisionistaDiario {
    id: string;
    name: string;
    totalComisiones: number;
    cantidadComisiones: number;
}

/** Semana del mes para desglose de nómina */
export interface SemanaNomina {
    numero: number;
    label: string;
    subtotal: number;
}

/** Item para modales de Cartera */
export interface CarteraItem {
    cliente: string;
    monto: number;
    fecha?: string;
}

export function useCentralCash() {
    const [movements, setMovements] = useState<CentralMovement[]>([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);
    const [isBackfilling, setIsBackfilling] = useState(false);
    const [categorySales, setCategorySales] = useState<CategorySalesData[]>([]);
    const [categorySalesLoading, setCategorySalesLoading] = useState(false);

    // ─── Nuevos estados para dashboard ───
    const [carteraTotal, setCarteraTotal] = useState(0);
    const [carteraTotalLoading, setCarteraTotalLoading] = useState(false);
    const [recuperacionEfectivo, setRecuperacionEfectivo] = useState(0);
    const [recuperacionTransferencia, setRecuperacionTransferencia] = useState(0);
    const [liquidacionesDelMes, setLiquidacionesDelMes] = useState(0);
    const [liquidacionesLoading, setLiquidacionesLoading] = useState(false);
    const [liquidacionesDetail, setLiquidacionesDetail] = useState<DetailItem[]>([]);
    const [nominaTotal, setNominaTotal] = useState(0);
    const [nominaTotalLoading, setNominaTotalLoading] = useState(false);
    const [totalServicios, setTotalServicios] = useState(0);
    const [totalServiciosLoading, setTotalServiciosLoading] = useState(false);
    const [egresosDelMes, setEgresosDelMes] = useState(0);
    const [egresosDetail, setEgresosDetail] = useState<DetailItem[]>([]);

    // ─── Nuevos estados para drill-down ───
    const [nominaAsalariados, setNominaAsalariados] = useState<TrabajadorAsalariado[]>([]);
    const [nominaSemanas, setNominaSemanas] = useState<SemanaNomina[]>([]);
    const [liquidacionesComisionistas, setLiquidacionesComisionistas] = useState<ComisionistaDiario[]>([]);
    const [carteraClientes, setCarteraClientes] = useState<CarteraItem[]>([]);
    const [carteraClientesLoading, setCarteraClientesLoading] = useState(false);
    const [recuperacionEfectivoDetalle, setRecuperacionEfectivoDetalle] = useState<CarteraItem[]>([]);
    const [recuperacionTransferenciaDetalle, setRecuperacionTransferenciaDetalle] = useState<CarteraItem[]>([]);
    const [recuperacionDetalleLoading, setRecuperacionDetalleLoading] = useState(false);
    const [bonosTotal, setBonosTotal] = useState(0);
    const [bonosLoading, setBonosLoading] = useState(false);
    const [bonosDetalle, setBonosDetalle] = useState<DetailItem[]>([]);
    const [ventasServiciosTotal, setVentasServiciosTotal] = useState(0);
    const [ventasServiciosLoading, setVentasServiciosLoading] = useState(false);
    const [ventasServiciosDetalle, setVentasServiciosDetalle] = useState<DetailItem[]>([]);

    const user = useSessionStore((state) => state.user);
    const businessId = useBusinessStore((state) => state.id);

    // ─── Helpers de fecha ───
    function currentMonthRange() {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        return {
            start: new Date(y, m, 1).toISOString(),
            end: new Date(y, m + 1, 1).toISOString(),
            key: `${y}-${String(m + 1).padStart(2, '0')}`,
        };
    }

    const fetchMovements = async () => {
        if (!businessId) {
            console.warn('⚠️ No business_id available, cannot fetch movements');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            console.log('📥 Fetching central cash movements for business:', businessId);

            const { data, error } = await (supabase
                .from('central_cash_movements' as any)
                .select('*')
                .order('created_at', { ascending: false }) as any);

            if (error) {
                console.error('❌ Error fetching movements:', error);
                throw error;
            }

            const movs = (data as CentralMovement[]) || [];
            console.log('✅ Fetched movements:', movs.length);
            setMovements(movs);

            const total = movs.reduce((acc, m) => {
                return m.type === 'income' ? acc + m.amount : acc - m.amount;
            }, 0);

            setBalance(total);
        } catch (error) {
            console.error('Error fetching central cash movements:', error);
        } finally {
            setLoading(false);
        }
    };

    // ─── Helper: Calcular balances por método de pago ───

    /** Balance de efectivo disponible */
    const cashBalance = useMemo(() => {
        return movements.reduce((acc, m) => {
            const isCash = m.payment_method === 'cash' || m.payment_method === null;
            const isMixed = m.payment_method === 'mixed';

            if (m.type === 'income') {
                if (isCash) return acc + m.amount;
                if (isMixed && m.metadata) {
                    const cashPart = (m.metadata.cash_sales || 0) + (m.metadata.cash_abonos || 0) + (m.metadata.cash_loan_payments || 0) + (m.metadata.cash_other || 0);
                    return acc + cashPart;
                }
            } else {
                if (isCash) return acc - m.amount;
            }
            return acc;
        }, 0);
    }, [movements]);

    /** Balance de transferencia disponible */
    const transferBalance = useMemo(() => {
        return movements.reduce((acc, m) => {
            const isTransfer = m.payment_method === 'transfer' || m.payment_method === 'card';
            const isMixed = m.payment_method === 'mixed';

            if (m.type === 'income') {
                if (isTransfer) return acc + m.amount;
                if (isMixed && m.metadata) {
                    const transferPart = (m.metadata.transfer_sales || 0) + (m.metadata.transfer_abonos || 0) + (m.metadata.transfer_loan_payments || 0) + (m.metadata.transfer_other || 0)
                                       + (m.metadata.card_sales || 0) + (m.metadata.card_abonos || 0);
                    return acc + transferPart;
                }
            } else {
                if (isTransfer) return acc - m.amount;
            }
            return acc;
        }, 0);
    }, [movements]);

    /** Balance total (efectivo + transferencia) */
    const totalBalance = useMemo(() => cashBalance + transferBalance, [cashBalance, transferBalance]);

    /** Resumen mensual: agrupa movimientos por mes con entradas/gastos/neto */
    const monthlySummary = useMemo(() => {
        const monthsMap = new Map<string, {
            month: string;
            label: string;
            incomes: number;
            expenses: number;
            net: number;
            sessionIds: Set<string>;
            sessionCount: number;
            manualIncomeCount: number;
            abonos: number;
            commissionsPaid: number;
            salaryExpenses: number;
            nextDayBaseExpenses: number;
            otherExpenses: number;
        }>();

        movements.forEach(m => {
            const date = new Date(m.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                              'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

            if (!monthsMap.has(key)) {
                monthsMap.set(key, {
                    month: key, label, incomes: 0, expenses: 0, net: 0,
                    sessionIds: new Set(), sessionCount: 0,
                    manualIncomeCount: 0, abonos: 0, commissionsPaid: 0,
                    salaryExpenses: 0, nextDayBaseExpenses: 0, otherExpenses: 0,
                });
            }
            const entry = monthsMap.get(key)!;

            const isAbono = (m.description || '').toLowerCase().includes('abono crédito');
            const isBaseProximoDia = (m.description || '').toLowerCase().includes('base próximo día');

            if (m.type === 'income') {
                if (isAbono) {
                    entry.abonos += m.amount;
                } else {
                    entry.incomes += m.amount;
                    if (m.session_id) {
                        entry.sessionIds.add(m.session_id);
                    } else {
                        entry.manualIncomeCount++;
                    }
                }
            } else {
                entry.expenses += m.amount;
                const desc = (m.description || '').toLowerCase();
                if (isBaseProximoDia) {
                    entry.nextDayBaseExpenses += m.amount;
                } else if (desc.includes('comisión') || desc.includes('comision')) {
                    entry.commissionsPaid += m.amount;
                } else if (desc.includes('préstamo') || desc.includes('prestamo') || desc.includes('salario') || desc.includes('adelanto')) {
                    entry.salaryExpenses += m.amount;
                } else {
                    entry.otherExpenses += m.amount;
                }
            }

            if (m.metadata?.commissions_paid) {
                entry.commissionsPaid += m.metadata.commissions_paid;
            }
        });

        return Array.from(monthsMap.values())
            .map(m => ({ ...m, sessionCount: m.sessionIds.size, net: m.incomes - m.expenses }))
            .sort((a, b) => b.month.localeCompare(a.month));
    }, [movements]);

    /** Monthly breakdown para acordeones del modal de historial */
    const monthlyBreakdown = useMemo(() => {
        const mbMap = new Map<string, {
            month: string;
            label: string;
            cashIngresos: DetailItem[];
            transferIngresos: DetailItem[];
            egresos: DetailItem[];
            totalCash: number;
            totalTransfer: number;
            totalEgresos: number;
            neto: number;
        }>();

        movements.forEach(m => {
            const date = new Date(m.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                              'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

            if (!mbMap.has(key)) {
                mbMap.set(key, { month: key, label, cashIngresos: [], transferIngresos: [], egresos: [], totalCash: 0, totalTransfer: 0, totalEgresos: 0, neto: 0 });
            }
            const entry = mbMap.get(key)!;
            const item: DetailItem = { label: m.description || 'Movimiento', amount: m.amount, date: m.created_at, description: m.description };

            if (m.type === 'income') {
                if (m.payment_method === 'transfer' || m.payment_method === 'card') {
                    entry.transferIngresos.push(item);
                    entry.totalTransfer += m.amount;
                } else if (m.payment_method === 'mixed' && m.metadata) {
                    // Split mixed by metadata (same logic as cashBalance/transferBalance)
                    const cashPart = (m.metadata.cash_sales || 0) + (m.metadata.cash_abonos || 0) + (m.metadata.cash_loan_payments || 0) + (m.metadata.cash_other || 0);
                    const transferPart = (m.metadata.transfer_sales || 0) + (m.metadata.transfer_abonos || 0) + (m.metadata.card_sales || 0) + (m.metadata.card_abonos || 0) + (m.metadata.transfer_loan_payments || 0) + (m.metadata.transfer_other || 0);
                    if (cashPart > 0) {
                        entry.cashIngresos.push({ ...item, amount: cashPart, label: `${item.label} (parte efectivo)` });
                        entry.totalCash += cashPart;
                    }
                    if (transferPart > 0) {
                        entry.transferIngresos.push({ ...item, amount: transferPart, label: `${item.label} (parte transf.)` });
                        entry.totalTransfer += transferPart;
                    }
                } else {
                    entry.cashIngresos.push(item);
                    entry.totalCash += m.amount;
                }
            } else {
                entry.egresos.push(item);
                entry.totalEgresos += m.amount;
            }
        });

        return Array.from(mbMap.values())
            .map(m => ({
                ...m,
                neto: m.totalCash + m.totalTransfer - m.totalEgresos,
                cashIngresos: m.cashIngresos.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
                transferIngresos: m.transferIngresos.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
                egresos: m.egresos.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
            }))
            .sort((a, b) => b.month.localeCompare(a.month));
    }, [movements]);

    /** Egresos del mes en curso + detalle */
    const computeEgresosDelMes = useMemo(() => {
        const { start, end } = currentMonthRange();
        const expensesList: DetailItem[] = [];
        let total = 0;
        movements.forEach(m => {
            if (m.type === 'expense' && m.created_at >= start && m.created_at < end) {
                total += m.amount;
                expensesList.push({
                    label: m.description || 'Egreso',
                    amount: m.amount,
                    date: m.created_at,
                    description: m.description,
                });
            }
        });
        return { total, items: expensesList };
    }, [movements]);

    // ─── T003-T004: Movimientos del mes por método de pago ───

    /** Movimientos en efectivo del mes en curso */
    const cashMovementsDelMes = useMemo(() => {
        const { start, end } = currentMonthRange();
        const ingresos: DetailItem[] = [];
        const egresos: DetailItem[] = [];
        let neto = 0;
        movements.forEach(m => {
            if (m.payment_method !== 'cash' && m.payment_method !== null) return;
            if (m.created_at < start || m.created_at >= end) return;
            const item: DetailItem = {
                label: m.description || 'Movimiento',
                amount: m.amount,
                date: m.created_at,
                description: m.description,
            };
            if (m.type === 'income') {
                ingresos.push(item);
                neto += m.amount;
            } else {
                egresos.push(item);
                neto -= m.amount;
            }
        });
        return { ingresos: ingresos.sort((a, b) => (b.date || '').localeCompare(a.date || '')), egresos: egresos.sort((a, b) => (b.date || '').localeCompare(a.date || '')), neto };
    }, [movements]);

    /** Movimientos en transferencia del mes en curso */
    const transferMovementsDelMes = useMemo(() => {
        const { start, end } = currentMonthRange();
        const ingresos: DetailItem[] = [];
        const egresos: DetailItem[] = [];
        let neto = 0;
        movements.forEach(m => {
            if (m.payment_method !== 'transfer' && m.payment_method !== 'card') return;
            if (m.created_at < start || m.created_at >= end) return;
            const item: DetailItem = {
                label: m.description || 'Movimiento',
                amount: m.amount,
                date: m.created_at,
                description: m.description,
            };
            if (m.type === 'income') {
                ingresos.push(item);
                neto += m.amount;
            } else {
                egresos.push(item);
                neto -= m.amount;
            }
        });
        return { ingresos: ingresos.sort((a, b) => (b.date || '').localeCompare(a.date || '')), egresos: egresos.sort((a, b) => (b.date || '').localeCompare(a.date || '')), neto };
    }, [movements]);

    /** T013: Servicios vendidos — cantidad de veces por servicio (no monto) */
    const serviceSalesCount = useMemo(() => {
        if (!categorySales || categorySales.length === 0) return [];
        const nameMap = new Map<string, number>();
        categorySales.forEach(cat => {
            cat.services.forEach(svc => {
                const prev = nameMap.get(svc.serviceName) || 0;
                nameMap.set(svc.serviceName, prev + svc.quantity);
            });
        });
        return [...nameMap.entries()]
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity);
    }, [categorySales]);

    // ─── Queries nuevas para dashboard ───

    /** T004: Cartera Total + Recuperación Efectivo/Transferencia */
    const fetchCarteraData = async () => {
        if (!businessId) return;
        setCarteraTotalLoading(true);
        try {
            const { start, end } = currentMonthRange();

            // Cartera Total: global (toda deuda pendiente)
            const { data: debts } = await (supabase as any)
                .from('customer_debts')
                .select('remaining_amount')
                .eq('business_id', businessId)
                .gt('remaining_amount', 0);

            const totalCartera = (debts || []).reduce((s: number, d: any) => s + Number(d.remaining_amount), 0);
            setCarteraTotal(totalCartera);

            // Recuperación del mes: debt_payments agrupados por payment_method
            const { data: payments } = await (supabase as any)
                .from('debt_payments')
                .select('amount, payment_method')
                .eq('business_id', businessId)
                .gte('created_at', start)
                .lt('created_at', end);

            let cashRec = 0;
            let transferRec = 0;
            (payments || []).forEach((p: any) => {
                const amt = Number(p.amount);
                if (p.payment_method === 'cash') cashRec += amt;
                else transferRec += amt;
            });
            setRecuperacionEfectivo(cashRec);
            setRecuperacionTransferencia(transferRec);
        } catch (err) {
            console.error('[useCentralCash] Error fetching cartera data:', err);
        } finally {
            setCarteraTotalLoading(false);
        }
    };

    /** T005-T006: Nómina — asalariados + semanas + comisionistas */
    const fetchNominaData = async () => {
        if (!businessId) return;
        setNominaTotalLoading(true);
        try {
            // 1. Workers activos con nombre y salario
            const { data: workers } = await (supabase as any)
                .from('workers')
                .select('id, name, salary')
                .eq('business_id', businessId)
                .eq('status', 'active');

            const asalariados: TrabajadorAsalariado[] = [];
            const comisionistaIds: string[] = [];
            let nominaSemanalTotal = 0;

            (workers || []).forEach((w: any) => {
                const sal = Number(w.salary || 0);
                if (sal > 0) {
                    asalariados.push({ id: w.id, name: w.name || 'Sin nombre', salary: sal });
                    nominaSemanalTotal += sal;
                } else {
                    comisionistaIds.push(w.id);
                }
            });

            // 2. Semanas del mes
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const numSemanas = Math.ceil(daysInMonth / 7);
            const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                              'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const monthLabel = monthNames[now.getMonth()];
            const semanas: SemanaNomina[] = [];
            for (let i = 0; i < numSemanas; i++) {
                const startDay = i * 7 + 1;
                const endDay = Math.min((i + 1) * 7, daysInMonth);
                semanas.push({
                    numero: i + 1,
                    label: `Semana ${i + 1} (${startDay}-${endDay} ${monthLabel})`,
                    subtotal: asalariados.length > 0 ? Math.round(nominaSemanalTotal / numSemanas) : 0,
                });
            }

            setNominaAsalariados(asalariados);
            setNominaSemanas(semanas);
            setNominaTotal(nominaSemanalTotal); // base — se suma con comisionistas en el modal

            // 3. Comisionistas diarios (sin salario) que recibieron comisiones este mes
            if (comisionistaIds.length > 0) {
                const { start, end } = currentMonthRange();
                const { data: comms } = await (supabase as any)
                    .from('worker_commissions')
                    .select('worker_id, commission_amount, worker:workers(name)')
                    .eq('business_id', businessId)
                    .eq('status', 'paid')
                    .gte('paid_at', start)
                    .lt('paid_at', end)
                    .in('worker_id', comisionistaIds);

                const comisionistasMap = new Map<string, ComisionistaDiario>();
                (comms || []).forEach((c: any) => {
                    const wid = c.worker_id;
                    if (!comisionistasMap.has(wid)) {
                        comisionistasMap.set(wid, {
                            id: wid,
                            name: c.worker?.name || 'Trabajador',
                            totalComisiones: 0,
                            cantidadComisiones: 0,
                        });
                    }
                    const entry = comisionistasMap.get(wid)!;
                    entry.totalComisiones += Number(c.commission_amount || 0);
                    entry.cantidadComisiones += 1;
                });
                setLiquidacionesComisionistas([...comisionistasMap.values()].sort((a, b) => b.totalComisiones - a.totalComisiones));
            } else {
                setLiquidacionesComisionistas([]);
            }
        } catch (err) {
            console.error('[useCentralCash] Error fetching nomina data:', err);
        } finally {
            setNominaTotalLoading(false);
        }
    };

    /** T006: Liquidaciones — comisiones pagadas en el mes + detalle */
    const fetchLiquidacionesData = async () => {
        if (!businessId) return;
        setLiquidacionesLoading(true);
        try {
            const { start, end } = currentMonthRange();

            const { data } = await (supabase as any)
                .from('worker_commissions')
                .select('id, commission_amount, worker:workers(name), paid_at, sale:sales(description)')
                .eq('business_id', businessId)
                .eq('status', 'paid')
                .gte('paid_at', start)
                .lt('paid_at', end);

            let total = 0;
            const items: DetailItem[] = [];
            (data || []).forEach((c: any) => {
                const amt = Number(c.commission_amount);
                total += amt;
                const workerName = c.worker?.name || 'Trabajador';
                items.push({
                    label: `Comisión — ${workerName}`,
                    amount: amt,
                    date: c.paid_at,
                    description: `Comisión pagada a ${workerName}`,
                });
            });
            setLiquidacionesDelMes(total);
            setLiquidacionesDetail(items.sort((a, b) => b.amount - a.amount));
        } catch (err) {
            console.error('[useCentralCash] Error fetching liquidaciones:', err);
        } finally {
            setLiquidacionesLoading(false);
        }
    };

    /** T007: Total Servicios — reutiliza fetchCategorySales + actualiza totalServicios */
    const fetchCategorySales = async (monthKey: string): Promise<CategorySalesData[]> => {
        if (!businessId) return [];
        setCategorySalesLoading(true);
        setTotalServiciosLoading(true);
        try {
            const [year, monthNum] = monthKey.split('-').map(Number);
            const startDate = new Date(year, monthNum - 1, 1).toISOString();
            const endDate = new Date(year, monthNum, 1).toISOString();

            console.log('[fetchCategorySales] Fetching analytics for:', monthKey, { startDate, endDate, businessId });

            // 1. Get all completed sales in this month directly (avoid !inner join issues)
            const { data: completedSales, error: salesErr } = await (supabase as any)
                .from('sales')
                .select('id')
                .eq('business_id', businessId)
                .eq('status', 'completed')
                .gte('created_at', startDate)
                .lt('created_at', endDate);

            if (salesErr) {
                console.error('[fetchCategorySales] Error fetching sales:', salesErr);
                setCategorySalesLoading(false);
                setTotalServiciosLoading(false);
                return [];
            }

            const saleIds = (completedSales || []).map((s: any) => s.id);
            console.log('[fetchCategorySales] Completed sales found:', saleIds.length);

            if (saleIds.length === 0) {
                setCategorySales([]);
                setTotalServicios(0);
                setCategorySalesLoading(false);
                setTotalServiciosLoading(false);
                return [];
            }

            // 2. Get sale items for these sales (batch if needed for very large sets)
            let allItems: any[] = [];
            const BATCH_SIZE = 500;
            for (let i = 0; i < saleIds.length; i += BATCH_SIZE) {
                const batch = saleIds.slice(i, i + BATCH_SIZE);
                const { data: batchItems, error: itemsErr } = await (supabase as any)
                    .from('sale_items')
                    .select('id, service_id, product_id, quantity, unit_price, business_id')
                    .in('sale_id', batch)
                    .eq('business_id', businessId);

                if (itemsErr) {
                    console.error('[fetchCategorySales] Error fetching sale items batch:', itemsErr);
                    continue;
                }
                if (batchItems) allItems.push(...batchItems);
            }

            console.log('[fetchCategorySales] Sale items found:', allItems.length);

            if (allItems.length === 0) {
                setCategorySales([]);
                setTotalServicios(0);
                setCategorySalesLoading(false);
                setTotalServiciosLoading(false);
                return [];
            }

            // 3. Get services, products, categories
            const serviceIds = [...new Set(allItems.filter((i: any) => i.service_id).map((i: any) => i.service_id))].filter(Boolean) as string[];
            const productIds = [...new Set(allItems.filter((i: any) => i.product_id).map((i: any) => i.product_id))].filter(Boolean) as string[];

            console.log('[fetchCategorySales] Unique services:', serviceIds.length, 'products:', productIds.length);

            const [svcRes, prodRes, catRes] = await Promise.all([
                serviceIds.length > 0 ? (supabase as any).from('services').select('id,name,category_id').in('id', serviceIds) : Promise.resolve({ data: [] }),
                productIds.length > 0 ? (supabase as any).from('products').select('id,name,category_id').in('id', productIds) : Promise.resolve({ data: [] }),
                (supabase as any).from('categories').select('id,name,icon').eq('business_id', businessId)
            ]);

            const servicesMap = new Map<string, { name: string; categoryId: string | null }>();
            (svcRes.data || []).forEach((s: any) => servicesMap.set(s.id, { name: s.name, categoryId: s.category_id }));
            (prodRes.data || []).forEach((p: any) => servicesMap.set(p.id, { name: p.name, categoryId: p.category_id }));

            const categoriesMap = new Map<string, { name: string; icon: string | null }>();
            catRes.data?.forEach((c: any) => categoriesMap.set(c.id, { name: c.name, icon: c.icon }));

            console.log('[fetchCategorySales] Services map size:', servicesMap.size, 'Categories map size:', categoriesMap.size);

            // 4. Agrupar por categoría → servicio
            const catAgg = new Map<string, {
                categoryName: string;
                categoryIcon: string | null;
                totalAmount: number;
                salesCount: number;
                services: Map<string, { name: string; quantity: number; totalAmount: number }>;
            }>();

            (allItems as any[]).forEach(item => {
                const svcId = item.service_id || item.product_id;
                const svcInfo = servicesMap.get(svcId) || { name: 'Eliminado', categoryId: null };
                const catId = svcInfo.categoryId || '__uncategorized__';
                const catInfo = categoriesMap.get(svcInfo.categoryId || '');
                const catName = catInfo?.name || 'Sin categoría';
                const catIcon = catInfo?.icon || null;

                const qty = Number(item.quantity || 1);
                const unitPrice = Number(item.unit_price || 0);
                const itemTotal = unitPrice * qty;

                if (!catAgg.has(catId)) {
                    catAgg.set(catId, { categoryName: catName, categoryIcon: catIcon, totalAmount: 0, salesCount: 0, services: new Map() });
                }
                const cat = catAgg.get(catId)!;
                cat.totalAmount += itemTotal;
                cat.salesCount += qty;

                if (!cat.services.has(svcId)) {
                    cat.services.set(svcId, { name: svcInfo.name, quantity: 0, totalAmount: 0 });
                }
                const svc = cat.services.get(svcId)!;
                svc.quantity += qty;
                svc.totalAmount += itemTotal;
            });

            const grandTotal = [...catAgg.values()].reduce((s, c) => s + c.totalAmount, 0);

            const result: CategorySalesData[] = [...catAgg.entries()]
                .map(([catId, c]) => ({
                    categoryId: catId,
                    categoryName: c.categoryName,
                    categoryIcon: c.categoryIcon,
                    totalAmount: c.totalAmount,
                    salesCount: c.salesCount,
                    percentage: grandTotal > 0 ? Math.round((c.totalAmount / grandTotal) * 1000) / 10 : 0,
                    services: [...c.services.entries()]
                        .map(([svcId, s]) => ({
                            serviceId: svcId,
                            serviceName: s.name,
                            quantity: s.quantity,
                            totalAmount: s.totalAmount,
                            avgPrice: s.quantity > 0 ? Math.round(s.totalAmount / s.quantity) : 0,
                        }))
                        .sort((a, b) => b.totalAmount - a.totalAmount),
                }))
                .sort((a, b) => b.totalAmount - a.totalAmount);

            console.log('[fetchCategorySales] Result:', result.length, 'categories, grand total:', grandTotal);
            setCategorySales(result);
            setTotalServicios(grandTotal);
            return result;
        } catch (error) {
            console.error('[fetchCategorySales] Error:', error);
            setCategorySales([]);
            setTotalServicios(0);
            return [];
        } finally {
            setCategorySalesLoading(false);
            setTotalServiciosLoading(false);
        }
    };

    /** T007: Cartera detalle — clientes con deuda pendiente */
    const fetchCarteraDetalle = async () => {
        if (!businessId) return;
        setCarteraClientesLoading(true);
        try {
            const { data } = await (supabase as any)
                .from('customer_debts')
                .select('remaining_amount, customer:customers!inner(name)')
                .eq('business_id', businessId)
                .gt('remaining_amount', 0);

            const items: CarteraItem[] = (data || []).map((d: any) => ({
                cliente: d.customer?.name || 'Sin nombre',
                monto: Number(d.remaining_amount),
            }));
            setCarteraClientes(items.sort((a, b) => b.monto - a.monto));
        } catch (err) {
            console.error('[useCentralCash] Error fetching cartera detalle:', err);
        } finally {
            setCarteraClientesLoading(false);
        }
    };

    /** T008-T009: Recuperación detalle — abonos del mes por método */
    const fetchRecuperacionDetalle = async () => {
        if (!businessId) return;
        setRecuperacionDetalleLoading(true);
        try {
            const { start, end } = currentMonthRange();
            const { data } = await (supabase as any)
                .from('debt_payments')
                .select('amount, payment_method, created_at, customer:customers!inner(name)')
                .eq('business_id', businessId)
                .gte('created_at', start)
                .lt('created_at', end);

            const efectivo: CarteraItem[] = [];
            const transferencia: CarteraItem[] = [];
            (data || []).forEach((p: any) => {
                const item: CarteraItem = {
                    cliente: p.customer?.name || 'Sin nombre',
                    monto: Number(p.amount),
                    fecha: p.created_at,
                };
                if (p.payment_method === 'cash') efectivo.push(item);
                else transferencia.push(item);
            });
            setRecuperacionEfectivoDetalle(efectivo.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')));
            setRecuperacionTransferenciaDetalle(transferencia.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')));
        } catch (err) {
            console.error('[useCentralCash] Error fetching recuperacion detalle:', err);
        } finally {
            setRecuperacionDetalleLoading(false);
        }
    };

    /** T003: Bonos — servicios regalados por fidelidad (unit_price = 0) */
    const fetchBonosData = async () => {
        if (!businessId) return;
        setBonosLoading(true);
        try {
            const { start, end } = currentMonthRange();
            // 1. Get completed sales in this month
            const { data: monthSales } = await (supabase as any)
                .from('sales')
                .select('id, customer:customers(name), created_at')
                .eq('business_id', businessId)
                .eq('status', 'completed')
                .gte('created_at', start)
                .lt('created_at', end);

            if (!monthSales || monthSales.length === 0) {
                setBonosTotal(0); setBonosDetalle([]); setBonosLoading(false); return;
            }

            const saleIds = monthSales.map((s: any) => s.id);
            const saleMap = new Map<string, any>();
            monthSales.forEach((s: any) => saleMap.set(s.id, s));

            // 2. Get sale_items with unit_price = 0 for these sales
            let allFreeItems: any[] = [];
            for (let i = 0; i < saleIds.length; i += 500) {
                const batch = saleIds.slice(i, i + 500);
                const { data } = await (supabase as any)
                    .from('sale_items')
                    .select('id, service_id, quantity, sale_id')
                    .eq('business_id', businessId)
                    .eq('unit_price', 0)
                    .not('service_id', 'is', null)
                    .in('sale_id', batch);
                if (data) allFreeItems.push(...data);
            }

            if (allFreeItems.length === 0) {
                setBonosTotal(0); setBonosDetalle([]); setBonosLoading(false); return;
            }

            const svcIds = [...new Set(allFreeItems.map((i: any) => i.service_id))];
            const { data: svcs } = await (supabase as any)
                .from('services').select('id, name, price').in('id', svcIds).eq('business_id', businessId);
            const svcMap = new Map<string, { name: string; price: number }>();
            (svcs || []).forEach((s: any) => svcMap.set(s.id, { name: s.name, price: Number(s.price || 0) }));

            let total = 0;
            const items: DetailItem[] = [];
            allFreeItems.forEach(item => {
                const svc = svcMap.get(item.service_id) || { name: 'Servicio', price: 0 };
                const valor = svc.price * Number(item.quantity || 1);
                total += valor;
                const sale = saleMap.get(item.sale_id);
                const cliente = sale?.customer?.name || 'Cliente';
                const fecha = sale?.created_at || '';
                items.push({
                    label: `${svc.name} — ${cliente} (×${item.quantity})`,
                    amount: valor,
                    date: fecha,
                    description: `Canje de fidelidad: ${svc.name}`,
                });
            });

            setBonosTotal(total);
            setBonosDetalle(items.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
        } catch (err) {
            console.error('[useCentralCash] Error fetching bonos:', err);
        } finally {
            setBonosLoading(false);
        }
    };

    /** T004: Ventas Servicios — total facturado en servicios del mes (tiempo real) */
    const fetchVentasServiciosData = async () => {
        if (!businessId) return;
        setVentasServiciosLoading(true);
        try {
            const { start, end } = currentMonthRange();
            // 1. Get completed sales in this month
            const { data: monthSales } = await (supabase as any)
                .from('sales')
                .select('id')
                .eq('business_id', businessId)
                .eq('status', 'completed')
                .gte('created_at', start)
                .lt('created_at', end);

            if (!monthSales || monthSales.length === 0) {
                setVentasServiciosTotal(0); setVentasServiciosDetalle([]); setVentasServiciosLoading(false); return;
            }

            const saleIds = monthSales.map((s: any) => s.id);

            // 2. Get sale_items with service_id for these sales
            let allItems: any[] = [];
            for (let i = 0; i < saleIds.length; i += 500) {
                const batch = saleIds.slice(i, i + 500);
                const { data } = await (supabase as any)
                    .from('sale_items')
                    .select('service_id, quantity, unit_price')
                    .eq('business_id', businessId)
                    .not('service_id', 'is', null)
                    .gt('unit_price', 0)
                    .in('sale_id', batch);
                if (data) allItems.push(...data);
            }

            if (allItems.length === 0) {
                setVentasServiciosTotal(0); setVentasServiciosDetalle([]); setVentasServiciosLoading(false); return;
            }

            const svcIds = [...new Set(allItems.map((i: any) => i.service_id))];
            const { data: svcs } = await (supabase as any)
                .from('services').select('id, name').in('id', svcIds).eq('business_id', businessId);
            const svcMap = new Map<string, string>();
            (svcs || []).forEach((s: any) => svcMap.set(s.id, s.name));

            const agg = new Map<string, { name: string; cantidad: number; total: number }>();
            allItems.forEach(item => {
                const name = svcMap.get(item.service_id) || 'Servicio';
                const prev = agg.get(item.service_id) || { name, cantidad: 0, total: 0 };
                prev.cantidad += Number(item.quantity || 1);
                prev.total += Number(item.unit_price || 0) * Number(item.quantity || 1);
                agg.set(item.service_id, prev);
            });

            let grandTotal = 0;
            const items: DetailItem[] = [];
            agg.forEach(v => {
                grandTotal += v.total;
                items.push({ label: `${v.name} (×${v.cantidad})`, amount: v.total, description: `${v.cantidad} ventas de ${v.name}` });
            });

            setVentasServiciosTotal(grandTotal);
            setVentasServiciosDetalle(items.sort((a, b) => b.amount - a.amount));
        } catch (err) {
            console.error('[useCentralCash] Error fetching ventas servicios:', err);
        } finally {
            setVentasServiciosLoading(false);
        }
    };

    /** fetchDashboardData — carga paralela de todas las queries */
    const fetchDashboardData = async () => {
        if (!businessId) return;
        await Promise.allSettled([
            fetchMovements(),
            fetchCarteraData(),
            fetchCarteraDetalle(),
            fetchRecuperacionDetalle(),
            fetchNominaData(),
            fetchLiquidacionesData(),
            fetchBonosData(),
            fetchVentasServiciosData(),
            fetchCategorySales(currentMonthRange().key),
        ]);
    };

    const addMovement = async (type: 'income' | 'expense', amount: number, description: string, paymentMethod: 'cash' | 'transfer' = 'cash') => {
        try {
            const sanitizedUserId = (user?.id === 'terminal-local' || !user?.id) ? null : user.id;

            console.log('💾 Inserting movement:', { type, amount, description, payment_method: paymentMethod, user_id: sanitizedUserId });

            const { error } = await (supabase
                .from('central_cash_movements' as any)
                .insert({
                    business_id: businessId,
                    type,
                    amount,
                    description,
                    payment_method: paymentMethod,
                    user_id: sanitizedUserId
                }) as any);

            if (error) {
                console.error('❌ Insert error:', error);
                throw error;
            }

            console.log('✅ Movement inserted successfully');
            await fetchMovements();
            return { success: true };
        } catch (error) {
            console.error('Error adding central cash movement:', error);
            return { success: false, error };
        }
    };

    const deleteMovement = async (id: string) => {
        try {
            console.log('🗑️ Deleting movement:', id);
            const { error } = await supabase
                .from('central_cash_movements')
                .delete()
                .eq('id', id);

            if (error) throw error;

            console.log('✅ Movement deleted successfully');
            await fetchMovements();
            return { success: true };
        } catch (error) {
            console.error('Error deleting central cash movement:', error);
            return { success: false, error };
        }
    };

    const updateMovement = async (id: string, type: 'income' | 'expense', amount: number, description: string) => {
        try {
            console.log('✏️ Updating movement:', id, { type, amount, description });
            const { error } = await supabase
                .from('central_cash_movements')
                .update({ type, amount, description })
                .eq('id', id);

            if (error) throw error;

            console.log('✅ Movement updated successfully');
            await fetchMovements();
            return { success: true };
        } catch (error) {
            console.error('Error updating central cash movement:', error);
            return { success: false, error };
        }
    };

    /** Ejecutar backfill de sesiones históricas */
    const backfillSessions = async (): Promise<BackfillResult> => {
        if (!businessId) return { success: false, processed: 0, skipped: 0, message: 'No business_id' };
        setIsBackfilling(true);
        setBackfillResult(null);
        try {
            const { data, error } = await supabase.rpc('backfill_central_cash_sessions', {
                p_business_id: businessId
            });
            if (error) throw error;
            const result = data as BackfillResult;
            setBackfillResult(result);
            await fetchMovements();
            return result;
        } catch (error) {
            console.error('Backfill error:', error);
            const fallback = { success: false, processed: 0, skipped: 0, message: error.message || 'Error' };
            setBackfillResult(fallback);
            return fallback;
        } finally {
            setIsBackfilling(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [businessId]);

    // Sync egresos desde useMemo
    useEffect(() => {
        setEgresosDelMes(computeEgresosDelMes.total);
        setEgresosDetail(computeEgresosDelMes.items);
    }, [computeEgresosDelMes]);

    return {
        // originales
        movements,
        balance,
        loading,
        refresh: fetchMovements,
        addMovement,
        updateMovement,
        deleteMovement,
        cashBalance,
        transferBalance,
        totalBalance,
        monthlySummary,
        backfillSessions,
        backfillResult,
        isBackfilling,
        categorySales,
        categorySalesLoading,
        fetchCategorySales,
        // dashboard
        carteraTotal,
        carteraTotalLoading,
        recuperacionEfectivo,
        recuperacionTransferencia,
        liquidacionesDelMes,
        liquidacionesLoading,
        liquidacionesDetail,
        nominaTotal,
        nominaTotalLoading,
        totalServicios,
        totalServiciosLoading,
        egresosDelMes,
        egresosDetail,
        fetchDashboardData,
        // drill-down
        cashMovementsDelMes,
        transferMovementsDelMes,
        nominaAsalariados,
        nominaSemanas,
        liquidacionesComisionistas,
        carteraClientes,
        carteraClientesLoading,
        recuperacionEfectivoDetalle,
        recuperacionTransferenciaDetalle,
        recuperacionDetalleLoading,
        serviceSalesCount,
        monthlyBreakdown,
        // bonos & ventas servicios
        bonosTotal, bonosLoading, bonosDetalle,
        ventasServiciosTotal, ventasServiciosLoading, ventasServiciosDetalle,
    };
}
