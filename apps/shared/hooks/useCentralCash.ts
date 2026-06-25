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

// ─── Interfaces para tabla 3 niveles (014-resumen-operativo-mes-completo) ───

/** Fila de nivel 2 (Mes) en la tabla multi-mes */
export interface MonthlyTableRow {
    monthKey: string;          // "2026-06"
    monthLabel: string;        // "Junio"
    year: number;              // 2026
    ingresos: number;
    egresos: number;
    neto: number;
    bonos: number;
    servicios: number;
    // Detalles para N3
    cashIngresos: DetailItem[];
    transferIngresos: DetailItem[];
    egresosDetalle: DetailItem[];
    serviciosDetalle: DetailItem[];
    bonosDetalle: DetailItem[];
    // Desglose diario (016-resumen-diario)
    dailyBreakdown: DailyBreakdown[];
}

/** Desglose diario dentro de un mes (016-resumen-diario) */
export interface DailyBreakdown {
    day: number;           // 1-31
    ingresos: number;
    egresos: number;
    bonos: number;
    servicios: number;
    neto: number;
}

/** Agrupación de nivel 1 (Año) */
export interface YearGroup {
    year: number;
    months: MonthlyTableRow[];
    totalIngresos: number;
    totalEgresos: number;
    totalNeto: number;
    totalBonos: number;
    totalServicios: number;
}

/** Fila fija al pie de la tabla */
export interface GeneralTotal {
    ingresos: number;
    egresos: number;
    neto: number;
    bonos: number;
    servicios: number;
}

/** Deuda con acreedor (015-acreedores-modulo) */
export interface AcreedorItem {
    id: string;
    creditor_name: string;
    amount: number;
    remaining_amount: number;
    invoice_date: string | null;
    status: 'pending' | 'partial' | 'paid';
}

/** Abono a acreedor (015-acreedores-modulo) */
export interface AcreedorPagoItem {
    id: string;
    creditor_name: string;
    amount: number;
    payment_method: 'cash' | 'transfer';
    created_at: string;
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

    // ─── Estados para tabla 3 niveles ───
    const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
    const [generalTotal, setGeneralTotal] = useState<GeneralTotal>({ ingresos: 0, egresos: 0, neto: 0, bonos: 0, servicios: 0 });
    const [tableLoading, setTableLoading] = useState(false);

    // ─── Estados de Acreedores (015-acreedores-modulo) ───
    const [acreedoresTotal, setAcreedoresTotal] = useState(0);
    const [acreedoresPagadoMes, setAcreedoresPagadoMes] = useState(0);
    const [acreedoresLoading, setAcreedoresLoading] = useState(false);
    const [acreedoresDetalle, setAcreedoresDetalle] = useState<AcreedorItem[]>([]);
    const [acreedoresPagosDetalle, setAcreedoresPagosDetalle] = useState<AcreedorPagoItem[]>([]);

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

    /** Convierte un monthKey "YYYY-MM" en rango { start, end } */
    function monthRangeForKey(monthKey: string) {
        const [y, m] = monthKey.split('-').map(Number);
        return {
            start: new Date(y, m - 1, 1).toISOString(),
            end: new Date(y, m, 1).toISOString(),
        };
    }

    /** T006: Obtiene todos los monthKeys desde la primera venta hasta hoy */
    function getAllMonthKeys(): string[] {
        const keys: string[] = [];
        const now = new Date();
        // Empezar desde enero 2026
        let y = 2026;
        let m = 1;
        const endY = now.getFullYear();
        const endM = now.getMonth() + 1;
        while (y < endY || (y === endY && m <= endM)) {
            keys.push(`${y}-${String(m).padStart(2, '0')}`);
            m++;
            if (m > 12) { m = 1; y++; }
        }
        return keys;
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
                    .select('id, service_id, product_id, quantity, unit_price')
                    .in('sale_id', batch);

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

    /** T004: Bonos para un mes específico — retorna { total, items } sin tocar estado */
    const fetchBonosDataForMonth = async (monthKey: string): Promise<{ total: number; items: DetailItem[] }> => {
        if (!businessId) return { total: 0, items: [] };
        try {
            const { start, end } = monthRangeForKey(monthKey);
            // 1. Get completed sales in this month
            const { data: monthSales } = await (supabase as any)
                .from('sales')
                .select('id, customer:customers(name), created_at')
                .eq('business_id', businessId)
                .eq('status', 'completed')
                .gte('created_at', start)
                .lt('created_at', end);

            if (!monthSales || monthSales.length === 0) return { total: 0, items: [] };

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
                    .eq('unit_price', 0)
                    .not('service_id', 'is', null)
                    .in('sale_id', batch);
                if (data) allFreeItems.push(...data);
            }

            if (allFreeItems.length === 0) return { total: 0, items: [] };

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

            return { total, items: items.sort((a, b) => (b.date || '').localeCompare(a.date || '')) };
        } catch (err) {
            console.error('[useCentralCash] Error fetching bonos for month:', monthKey, err);
            return { total: 0, items: [] };
        }
    };

    /** Wrapper: Bonos del mes en curso (para cards del dashboard) */
    const fetchBonosData = async () => {
        if (!businessId) return;
        setBonosLoading(true);
        const { total, items } = await fetchBonosDataForMonth(currentMonthRange().key);
        setBonosTotal(total);
        setBonosDetalle(items);
        setBonosLoading(false);
    };

    /** T005: Ventas Servicios para un mes específico — retorna { total, items } sin tocar estado */
    const fetchVentasServiciosForMonth = async (monthKey: string): Promise<{ total: number; items: DetailItem[] }> => {
        if (!businessId) return { total: 0, items: [] };
        try {
            const { start, end } = monthRangeForKey(monthKey);
            // 1. Get completed sales in this month
            const { data: monthSales } = await (supabase as any)
                .from('sales')
                .select('id')
                .eq('business_id', businessId)
                .eq('status', 'completed')
                .gte('created_at', start)
                .lt('created_at', end);

            if (!monthSales || monthSales.length === 0) return { total: 0, items: [] };

            const saleIds = monthSales.map((s: any) => s.id);

            // 2. Get sale_items with service_id for these sales
            let allItems: any[] = [];
            for (let i = 0; i < saleIds.length; i += 500) {
                const batch = saleIds.slice(i, i + 500);
                const { data } = await (supabase as any)
                    .from('sale_items')
                    .select('service_id, quantity, unit_price')
                    .not('service_id', 'is', null)
                    .gt('unit_price', 0)
                    .in('sale_id', batch);
                if (data) allItems.push(...data);
            }

            if (allItems.length === 0) return { total: 0, items: [] };

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

            return { total: grandTotal, items: items.sort((a, b) => b.amount - a.amount) };
        } catch (err) {
            console.error('[useCentralCash] Error fetching ventas servicios for month:', monthKey, err);
            return { total: 0, items: [] };
        }
    };

    /** Wrapper: Ventas Servicios del mes en curso (para cards del dashboard) */
    const fetchVentasServiciosData = async () => {
        if (!businessId) return;
        setVentasServiciosLoading(true);
        const { total, items } = await fetchVentasServiciosForMonth(currentMonthRange().key);
        setVentasServiciosTotal(total);
        setVentasServiciosDetalle(items);
        setVentasServiciosLoading(false);
    };

    /** T007: Bulk fetch de todas las ventas + sale_items + movimientos para armar la tabla 3 niveles.
     *  Corre en paralelo con fetchMovements dentro de fetchDashboardData.
     *  NO depende de React state — todo lo obtiene directo de Supabase. */
    const computeMonthlyTable = async () => {
        if (!businessId) return;
        setTableLoading(true);
        try {
            const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                              'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

            // ── 1. Query de ventas + movimientos en paralelo ──
            const [salesRes, movsRes] = await Promise.all([
                (supabase as any)
                    .from('sales')
                    .select('id, customer:customers(name), created_at')
                    .eq('business_id', businessId)
                    .eq('status', 'completed')
                    .gte('created_at', '2026-01-01')
                    .order('created_at', { ascending: false }),
                (supabase as any)
                    .from('central_cash_movements')
                    .select('type, amount, description, payment_method, metadata, created_at, session_id')
                    .eq('business_id', businessId)
                    .order('created_at', { ascending: false }),
            ]);
            const allSales = salesRes.data;

            const bonosByMonth = new Map<string, { total: number; items: DetailItem[] }>();
            const ventasByMonth = new Map<string, { total: number; items: DetailItem[] }>();

            if (allSales && allSales.length > 0) {
                const saleIds = allSales.map((s: any) => s.id);
                const saleMap = new Map<string, any>();
                allSales.forEach((s: any) => saleMap.set(s.id, s));

                // ── Bulk: batch query de TODOS los sale_items con service_id ──
                let allSaleItems: any[] = [];
                for (let i = 0; i < saleIds.length; i += 500) {
                    const batch = saleIds.slice(i, i + 500);
                    const { data } = await (supabase as any)
                        .from('sale_items')
                        .select('id, service_id, quantity, unit_price, sale_id')
                        .not('service_id', 'is', null)
                        .in('sale_id', batch);
                    if (data) allSaleItems.push(...data);
                }

                // ── Bulk: 1 query para TODOS los services ──
                const svcIds = [...new Set(allSaleItems.map((i: any) => i.service_id))];
                const { data: allSvcs } = svcIds.length > 0
                    ? await (supabase as any).from('services').select('id, name, price').in('id', svcIds).eq('business_id', businessId)
                    : { data: [] };
                const svcMap = new Map<string, { name: string; price: number }>();
                (allSvcs || []).forEach((s: any) => svcMap.set(s.id, { name: s.name, price: Number(s.price || 0) }));

                // ── Agrupar sale_items por mes ──
                allSaleItems.forEach((item: any) => {
                    const sale = saleMap.get(item.sale_id);
                    if (!sale) return;
                    const d = new Date(sale.created_at);
                    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const svc = svcMap.get(item.service_id) || { name: 'Servicio', price: 0 };
                    const qty = Number(item.quantity || 1);
                    const unitPrice = Number(item.unit_price || 0);

                    if (unitPrice === 0) {
                        // Bono (canje de fidelidad): valor = services.price × quantity
                        const valor = svc.price * qty;
                        const entry = bonosByMonth.get(monthKey) || { total: 0, items: [] };
                        entry.total += valor;
                        entry.items.push({
                            label: `${svc.name} — ${sale.customer?.name || 'Cliente'} (×${qty})`,
                            amount: valor,
                            date: sale.created_at,
                            description: `Canje de fidelidad: ${svc.name}`,
                        });
                        bonosByMonth.set(monthKey, entry);
                    } else {
                        // Servicio facturado
                        const total = unitPrice * qty;
                        const entry = ventasByMonth.get(monthKey) || { total: 0, items: [] };
                        entry.total += total;
                        // Agregar o acumular por servicio
                        const existing = entry.items.find(e => e.label.startsWith(svc.name + ' (×'));
                        if (existing) {
                            // Parsear y acumular: "Lavado (×3)" → "Lavado (×5)"
                            const prevQty = parseInt(existing.label.match(/×(\d+)/)?.[1] || '0') || 0;
                            existing.label = `${svc.name} (×${prevQty + qty})`;
                            existing.amount += total;
                        } else {
                            entry.items.push({
                                label: `${svc.name} (×${qty})`,
                                amount: total,
                                description: `${qty} ventas de ${svc.name}`,
                            });
                        }
                        ventasByMonth.set(monthKey, entry);
                    }
                });
            }

            // ── Compute local monthly breakdown from fetched movements (parallel, no state dependency) ──
            const movs = (movsRes.data || []) as any[];
            const lbMap = new Map<string, { totalCash: number; totalTransfer: number; totalEgresos: number; cashIngresos: DetailItem[]; transferIngresos: DetailItem[]; egresos: DetailItem[] }>();
            movs.forEach((m: any) => {
                const d = new Date(m.created_at);
                const mkey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!lbMap.has(mkey)) lbMap.set(mkey, { totalCash: 0, totalTransfer: 0, totalEgresos: 0, cashIngresos: [], transferIngresos: [], egresos: [] });
                const e = lbMap.get(mkey)!;
                const item: DetailItem = { label: m.description || 'Movimiento', amount: m.amount, date: m.created_at, description: m.description };
                if (m.type === 'income') {
                    if (m.payment_method === 'transfer' || m.payment_method === 'card') { e.totalTransfer += m.amount; e.transferIngresos.push(item); }
                    else if (m.payment_method === 'mixed' && m.metadata) {
                        const cp = (m.metadata.cash_sales || 0) + (m.metadata.cash_abonos || 0) + (m.metadata.cash_loan_payments || 0) + (m.metadata.cash_other || 0);
                        const tp = (m.metadata.transfer_sales || 0) + (m.metadata.transfer_abonos || 0) + (m.metadata.card_sales || 0) + (m.metadata.card_abonos || 0) + (m.metadata.transfer_loan_payments || 0) + (m.metadata.transfer_other || 0);
                        if (cp > 0) { e.totalCash += cp; e.cashIngresos.push({ ...item, amount: cp, label: (item.label || 'Movimiento') + ' (parte efectivo)' }); }
                        if (tp > 0) { e.totalTransfer += tp; e.transferIngresos.push({ ...item, amount: tp, label: (item.label || 'Movimiento') + ' (parte transf.)' }); }
                    } else { e.totalCash += m.amount; e.cashIngresos.push(item); }
                } else { e.totalEgresos += m.amount; e.egresos.push(item); }
            });
            const localBD: Array<{ month: string; totalCash: number; totalTransfer: number; totalEgresos: number; cashIngresos: DetailItem[]; transferIngresos: DetailItem[]; egresos: DetailItem[] }> = [...lbMap.entries()].map(([month, v]) => ({ month, ...v }));

            // ── Combinar con movimientos locales ──
            const monthKeys = getAllMonthKeys();
            const allRows: MonthlyTableRow[] = [];
            monthKeys.forEach(key => {
                const [y, mon] = key.split('-').map(Number);
                const bonos = bonosByMonth.get(key) || { total: 0, items: [] };
                const ventas = ventasByMonth.get(key) || { total: 0, items: [] };

                const mbEntry = localBD.find(m => m.month === key);
                const ingresos = mbEntry ? mbEntry.totalCash + mbEntry.totalTransfer : 0;
                const egresos = mbEntry ? mbEntry.totalEgresos : 0;
                const neto = ingresos - egresos;
                const cashIng = mbEntry?.cashIngresos || [];
                const transfIng = mbEntry?.transferIngresos || [];
                const egresosD = mbEntry?.egresos || [];

                // ─── Desglose diario (016-resumen-diario) ───
                const dayMap = new Map<number, { ingresos: number; egresos: number; bonos: number; servicios: number }>();
                const addToDay = (day: number, field: string, amount: number) => {
                    if (!day || day < 1 || day > 31) return;
                    if (!dayMap.has(day)) dayMap.set(day, { ingresos: 0, egresos: 0, bonos: 0, servicios: 0 });
                    const entry = dayMap.get(day)!;
                    if (field === 'ingresos') entry.ingresos += amount;
                    else if (field === 'egresos') entry.egresos += amount;
                    else if (field === 'bonos') entry.bonos += amount;
                    else if (field === 'servicios') entry.servicios += amount;
                };
                cashIng.forEach(i => addToDay(new Date(i.date || '').getDate(), 'ingresos', i.amount));
                transfIng.forEach(i => addToDay(new Date(i.date || '').getDate(), 'ingresos', i.amount));
                egresosD.forEach(i => addToDay(new Date(i.date || '').getDate(), 'egresos', i.amount));
                bonos.items.forEach(i => addToDay(new Date(i.date || '').getDate(), 'bonos', i.amount));
                ventas.items.forEach(i => addToDay(new Date(i.date || '').getDate(), 'servicios', i.amount));
                const dailyBreakdown: DailyBreakdown[] = [...dayMap.entries()]
                    .map(([day, d]) => ({ day, ...d, neto: d.ingresos - d.egresos }))
                    .sort((a, b) => a.day - b.day);

                allRows.push({
                    monthKey: key, monthLabel: monthNames[mon - 1], year: y,
                    ingresos, egresos, neto,
                    bonos: bonos.total, servicios: ventas.total,
                    cashIngresos: cashIng, transferIngresos: transfIng, egresosDetalle: egresosD,
                    serviciosDetalle: ventas.items.sort((a, b) => b.amount - a.amount),
                    bonosDetalle: bonos.items.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
                    dailyBreakdown,
                });
            });

            // Agrupar por año
            const yearMap = new Map<number, MonthlyTableRow[]>();
            allRows.forEach(row => {
                if (!yearMap.has(row.year)) yearMap.set(row.year, []);
                yearMap.get(row.year)!.push(row);
            });

            const groups: YearGroup[] = [];
            let gtIngresos = 0, gtEgresos = 0, gtNeto = 0, gtBonos = 0, gtServicios = 0;
            [...yearMap.entries()].sort((a, b) => b[0] - a[0]).forEach(([year, months]) => {
                const totalIngresos = months.reduce((s, r) => s + r.ingresos, 0);
                const totalEgresos = months.reduce((s, r) => s + r.egresos, 0);
                const totalBonos = months.reduce((s, r) => s + r.bonos, 0);
                const totalServicios = months.reduce((s, r) => s + r.servicios, 0);
                const totalNeto = totalIngresos - totalEgresos;
                groups.push({ year, months, totalIngresos, totalEgresos, totalNeto, totalBonos, totalServicios });
                gtIngresos += totalIngresos; gtEgresos += totalEgresos;
                gtNeto += totalNeto; gtBonos += totalBonos; gtServicios += totalServicios;
            });

            setYearGroups(groups);
            setGeneralTotal({ ingresos: gtIngresos, egresos: gtEgresos, neto: gtNeto, bonos: gtBonos, servicios: gtServicios });
        } catch (err) {
            console.error('[useCentralCash] Error computing monthly table:', err);
        } finally {
            setTableLoading(false);
        }
    };

    /** T006: Queries de acreedores (015-acreedores-modulo) */
    const fetchCreditorData = async () => {
        if (!businessId) return;
        setAcreedoresLoading(true);
        try {
            const { start, end } = currentMonthRange();
            // Total deuda pendiente (todos los saldos no pagados)
            const { data: debts } = await (supabase as any)
                .from('creditor_debts')
                .select('remaining_amount')
                .eq('business_id', businessId)
                .neq('status', 'paid');
            const total = (debts || []).reduce((s: number, d: any) => s + Number(d.remaining_amount), 0);
            setAcreedoresTotal(total);

            // Pagado del mes
            const { data: payments } = await (supabase as any)
                .from('creditor_payments')
                .select('amount')
                .eq('business_id', businessId)
                .gte('created_at', start)
                .lt('created_at', end);
            const pagado = (payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
            setAcreedoresPagadoMes(pagado);

            // Detalle de acreedores (para modal)
            const { data: detalle } = await (supabase as any)
                .from('creditor_debts')
                .select('*')
                .eq('business_id', businessId)
                .neq('status', 'paid')
                .order('created_at', { ascending: false });
            setAcreedoresDetalle((detalle || []).map((d: any) => ({
                id: d.id, creditor_name: d.creditor_name, amount: Number(d.amount),
                remaining_amount: Number(d.remaining_amount), invoice_date: d.invoice_date, status: d.status,
            })));

            // Detalle de pagos del mes (para modal)
            const { data: pagosDetalle } = await (supabase as any)
                .from('creditor_payments')
                .select('id, amount, payment_method, created_at, creditor_debt:creditor_debts(creditor_name)')
                .eq('business_id', businessId)
                .gte('created_at', start)
                .lt('created_at', end)
                .order('created_at', { ascending: false });
            setAcreedoresPagosDetalle((pagosDetalle || []).map((p: any) => ({
                id: p.id, creditor_name: p.creditor_debt?.creditor_name || 'Acreedor',
                amount: Number(p.amount), payment_method: p.payment_method, created_at: p.created_at,
            })));
        } catch (err) {
            console.error('[useCentralCash] Error fetching creditor data:', err);
        } finally {
            setAcreedoresLoading(false);
        }
    };

    /** fetchDashboardData — carga paralela de TODAS las queries incluyendo la tabla multi-mes */
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
            fetchCreditorData(),
            computeMonthlyTable(), // ← corre en paralelo, no espera a movements state
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
        // tabla 3 niveles (014-resumen-operativo-mes-completo)
        yearGroups, generalTotal, tableLoading,
        // acreedores (015-acreedores-modulo)
        acreedoresTotal, acreedoresPagadoMes, acreedoresLoading, acreedoresDetalle, acreedoresPagosDetalle,
    };
}
