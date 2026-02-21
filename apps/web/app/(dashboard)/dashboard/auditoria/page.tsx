'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SessionHistoryPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [sessionDetails, setSessionDetails] = useState<{
        session: any;
        sales: any[];
        movements: any[];
        commissions: any[];
    } | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
    const [isCountsModalOpen, setIsCountsModalOpen] = useState(false);
    const [activeMovementType, setActiveMovementType] = useState<'income' | 'expense'>('expense');

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const { data: sessionsData, error: sessionsError } = await supabase
                .from('cash_sessions')
                .select('*')
                .order('opened_at', { ascending: false });

            if (sessionsError) throw sessionsError;

            const userIds = [...new Set(sessionsData.map((s: any) => s.user_id))];
            const { data: workersData } = await supabase
                .from('workers')
                .select('id, name')
                .in('id', userIds);

            const workerMap = (workersData || []).reduce((acc: any, w: any) => {
                acc[w.id] = w.name;
                return acc;
            }, {});

            const enrichedSessions = sessionsData.map((s: any) => ({
                ...s,
                workerName: workerMap[s.user_id] || 'Desconocido'
            }));

            setSessions(enrichedSessions);
        } catch (error) {
            console.error('Error fetching session history:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionDetails = async (sessionId: string) => {
        setDetailsLoading(true);
        setSelectedSessionId(sessionId);
        try {
            const { data: sessionData } = await supabase
                .from('cash_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            const { data: sales } = await supabase
                .from('sales')
                .select('*, items:sale_items(*)')
                .eq('session_id', sessionId);

            const { data: movements } = await supabase
                .from('cash_movements')
                .select('*')
                .eq('session_id', sessionId);

            let commissions: any[] = [];
            if (sales && sales.length > 0) {
                const saleIds = sales.map((s: any) => s.id);
                const { data: commissionsData } = await supabase
                    .from('worker_commissions')
                    .select(`
                        *,
                        worker:workers(name),
                        sale_item:sale_items(name)
                    `)
                    .in('sale_id', saleIds);
                commissions = commissionsData || [];
            }

            setSessionDetails({
                session: sessionData,
                sales: sales || [],
                movements: movements || [],
                commissions: commissions || []
            });
        } catch (error) {
            console.error('Error fetching session details:', error);
        } finally {
            setDetailsLoading(false);
        }
    };

    const CashCountsModal = ({
        isOpen,
        onClose,
        counts
    }: {
        isOpen: boolean;
        onClose: () => void;
        counts: any[];
    }) => {
        if (!isOpen) return null;

        const totalManual = Array.isArray(counts) ? counts.reduce((sum, c) => sum + Number(c.total), 0) : 0;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">payments</span>
                                Desglose de Arqueo
                            </h3>
                            <p className="text-slate-500 text-xs mt-1">Detalle de billetes y monedas contados físicamente</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="p-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
                        {!Array.isArray(counts) || counts.length === 0 ? (
                            <div className="py-8 text-center text-slate-400">
                                <p className="text-sm">No se registró desglose de denominaciones.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <table className="w-full text-sm">
                                    <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="text-left py-2 font-black">Denominación</th>
                                            <th className="text-center py-2 font-black">Cant.</th>
                                            <th className="text-right py-2 font-black">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {counts.map((c, idx) => (
                                            <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                                <td className="py-3 font-bold text-slate-700 dark:text-slate-300">
                                                    {c.denomination === 1 ? 'Monedas' : `$${Number(c.denomination).toLocaleString()}`}
                                                </td>
                                                <td className="py-3 text-center font-black text-slate-400">
                                                    {c.denomination === 1 ? '-' : `${c.quantity}`}
                                                </td>
                                                <td className="py-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                                                    ${Number(c.total).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Contado</span>
                        <span className="text-2xl font-black text-primary">
                            ${totalManual.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const CashMovementsModal = ({
        isOpen,
        onClose,
        movements,
        type = 'expense'
    }: {
        isOpen: boolean;
        onClose: () => void;
        movements: any[];
        type?: 'income' | 'expense';
    }) => {
        if (!isOpen) return null;

        const filteredMovements = movements.filter(m => m.type === type);
        const total = filteredMovements.reduce((sum, m) => sum + m.amount, 0);
        const isIncome = type === 'income';

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className={`material-symbols-outlined ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isIncome ? 'download' : 'upload'}
                                </span>
                                {isIncome ? 'Ingresos de Caja' : 'Gastos del Turno'}
                            </h3>
                            <p className="text-slate-500 text-xs mt-1">
                                {isIncome ? 'Detalle de ingresos manuales reportados' : 'Egresos registrados por el trabajador en este turno'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {filteredMovements.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">receipt_long</span>
                                <p className="text-xs uppercase font-bold tracking-widest">No hay movimientos de {isIncome ? 'entrada' : 'salida'}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredMovements.map((mov) => (
                                    <div key={mov.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg ${isIncome ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'} flex items-center justify-center`}>
                                                <span className="material-symbols-outlined !text-[20px]">{isIncome ? 'trending_up' : 'trending_down'}</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5">Concepto:</p>
                                                <p className="font-bold text-slate-800 dark:text-slate-200 capitalize text-sm mb-1">
                                                    {mov.description || (isIncome ? 'Ingreso' : 'Egreso')}
                                                </p>
                                                {mov.reason && mov.reason !== mov.description && (
                                                    <p className="text-xs text-slate-500 italic mb-1">"{mov.reason}"</p>
                                                )}
                                                <p className="text-[10px] text-slate-400">
                                                    {new Date(mov.created_at).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                        <p className={`font-bold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {isIncome ? '+' : '-'}${mov.amount.toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase">Total {isIncome ? 'Entradas' : 'Gastos'}</span>
                        <span className={`text-xl font-black ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            ${total.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return <div className="text-center py-12">Cargando historial de sesiones...</div>;

    return (
        <div className="flex flex-col gap-6 h-full overflow-hidden p-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Auditoría de Turnos</h1>
                <p className="text-sm text-slate-500">Historial completo de sesiones de caja</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
                {/* Sessions List */}
                <div className="w-full md:w-[450px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="font-bold text-slate-900 dark:text-white">Historial de Turnos</h3>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => fetchSessionDetails(session.id)}
                                className={`p-4 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/30 ${selectedSessionId === session.id ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 dark:text-white">{session.workerName}</span>
                                        <span className="text-xs text-slate-500">
                                            {new Date(session.opened_at).toLocaleString('es-ES', {
                                                weekday: 'short',
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${session.status === 'open'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                            }`}
                                    >
                                        {session.status === 'open' ? 'EN CURSO' : 'CERRADO'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex flex-col">
                                        <span className="text-slate-400">Apertura</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            ${session.start_amount.toLocaleString()}
                                        </span>
                                    </div>
                                    {session.status === 'closed' && (
                                        <div className="flex flex-col text-right">
                                            <span className="text-slate-400">Cierre</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                ${session.end_amount?.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Session Details */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
                    {!selectedSessionId ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                            <p className="font-medium">Seleccione una sesión para ver los detalles del turno.</p>
                        </div>
                    ) : detailsLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                            <span className="mt-4 text-sm text-slate-500">Cargando detalles...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full overflow-hidden">
                            {/* Header with metrics */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">Resumen del Turno</h4>
                                        <p className="text-sm text-slate-500">ID: {selectedSessionId.slice(0, 8)}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Recaudado</div>
                                        <div className="text-2xl font-black text-primary">
                                            ${sessionDetails?.sales.reduce((sum: number, s: any) => sum + s.total_amount, 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Breakdown */}
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Apertura</div>
                                        <div className="text-lg font-black text-slate-700 dark:text-slate-200">
                                            ${sessionDetails?.session?.start_amount?.toLocaleString() || '0'}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Ventas Efectivo</div>
                                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                            ${sessionDetails?.sales
                                                .filter((s: any) => s.payment_method === 'cash')
                                                .reduce((sum: number, s: any) => sum + s.total_amount, 0)
                                                .toLocaleString() || '0'}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                        <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Ingresos/Gastos</div>
                                        <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                                            {(() => {
                                                const movementBalance =
                                                    sessionDetails?.movements?.reduce((acc: number, mov: any) => {
                                                        return mov.type === 'income' ? acc + mov.amount : acc - mov.amount;
                                                    }, 0) || 0;
                                                return `${movementBalance >= 0 ? '+' : ''}$${Math.abs(movementBalance).toLocaleString()}`;
                                            })()}
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/20 rounded-xl p-4 border-2 border-primary/30">
                                        <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Efectivo Esperado</div>
                                        <div className="text-lg font-black text-primary">
                                            ${(() => {
                                                const start = sessionDetails?.session?.start_amount || 0;
                                                const cashSales =
                                                    sessionDetails?.sales
                                                        .filter((s: any) => s.payment_method === 'cash')
                                                        .reduce((sum: number, s: any) => sum + s.total_amount, 0) || 0;
                                                const movementBalance =
                                                    sessionDetails?.movements?.reduce((acc: number, mov: any) => {
                                                        return mov.type === 'income' ? acc + mov.amount : acc - mov.amount;
                                                    }, 0) || 0;
                                                return (start + cashSales + movementBalance).toLocaleString();
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary cards */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    {/* Arqueo */}
                                    <div
                                        onClick={() => setIsCountsModalOpen(true)}
                                        className="bg-slate-50 dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl p-5 cursor-pointer hover:border-primary/30 transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Arqueo de Caja</span>
                                            <span className="material-symbols-outlined !text-[14px] text-primary/40 opacity-0 group-hover:opacity-100 transition-opacity">visibility</span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-500 uppercase">Sistema</span>
                                                <span className="text-slate-900 dark:text-white">
                                                    ${sessionDetails?.session?.end_amount?.toLocaleString() || '0'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-500 uppercase">Contado</span>
                                                <span className="text-slate-900 dark:text-white">
                                                    ${sessionDetails?.session?.manual_end_amount?.toLocaleString() || '0'}
                                                </span>
                                            </div>
                                            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-black">
                                                <span className="text-xs text-slate-400 uppercase">Dif.</span>
                                                <span
                                                    className={`text-lg ${sessionDetails?.session?.difference < 0
                                                        ? 'text-rose-500'
                                                        : sessionDetails?.session?.difference > 0
                                                            ? 'text-blue-500'
                                                            : 'text-emerald-500'
                                                        }`}
                                                >
                                                    ${sessionDetails?.session?.difference?.toLocaleString() || '0'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Liquidaciones */}
                                    <div className="bg-slate-50 dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Liquidaciones</span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-500 uppercase">Pagadas</span>
                                                <span className="text-blue-600">
                                                    $
                                                    {sessionDetails?.commissions
                                                        ?.filter((c: any) => c.status === 'paid')
                                                        .reduce((sum: number, c: any) => sum + c.commission_amount, 0)
                                                        .toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-500 uppercase tracking-wider">Pendientes</span>
                                                <span className="text-amber-600">
                                                    $
                                                    {sessionDetails?.commissions
                                                        ?.filter((c: any) => c.status === 'pending')
                                                        .reduce((sum: number, c: any) => sum + c.commission_amount, 0)
                                                        .toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-black">
                                                <span className="text-xs text-slate-400 uppercase">Servs.</span>
                                                <span className="text-lg text-slate-900 dark:text-white">{sessionDetails?.commissions?.length || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Entradas */}
                                    <div
                                        onClick={() => {
                                            setActiveMovementType('income');
                                            setIsMovementsModalOpen(true);
                                        }}
                                        className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 shadow-sm border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-5 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest leading-none block">
                                                Entradas
                                            </span>
                                            <span className="material-symbols-outlined !text-[14px] text-emerald-600/50 opacity-0 group-hover:opacity-100 transition-opacity">visibility</span>
                                        </div>
                                        <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                                            $
                                            {sessionDetails?.movements
                                                ?.filter((m: any) => m.type === 'income')
                                                .reduce((sum: number, m: any) => sum + m.amount, 0)
                                                .toLocaleString() || '0'}
                                        </div>
                                        <p className="text-[10px] font-bold text-emerald-600/70 mt-1 uppercase">Ingresos Manuales</p>
                                    </div>

                                    {/* Gastos */}
                                    <div
                                        onClick={() => {
                                            setActiveMovementType('expense');
                                            setIsMovementsModalOpen(true);
                                        }}
                                        className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20 shadow-sm border border-rose-100 dark:border-rose-900/40 rounded-2xl p-5 cursor-pointer hover:border-rose-300 dark:hover:border-rose-700 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-black text-rose-600/60 dark:text-rose-400/60 uppercase tracking-widest leading-none block">
                                                Gastos
                                            </span>
                                            <span className="material-symbols-outlined !text-[14px] text-rose-600/50 opacity-0 group-hover:opacity-100 transition-opacity">visibility</span>
                                        </div>
                                        <div className="text-3xl font-black text-rose-600 dark:text-rose-400">
                                            $
                                            {sessionDetails?.movements
                                                ?.filter((m: any) => m.type === 'expense')
                                                .reduce((sum: number, m: any) => sum + m.amount, 0)
                                                .toLocaleString() || '0'}
                                        </div>
                                        <p className="text-[10px] font-bold text-rose-600/70 mt-1 uppercase">Egresos + Liquidaciones</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <CashMovementsModal
                isOpen={isMovementsModalOpen}
                onClose={() => setIsMovementsModalOpen(false)}
                movements={sessionDetails?.movements || []}
                type={activeMovementType}
            />

            <CashCountsModal
                isOpen={isCountsModalOpen}
                onClose={() => setIsCountsModalOpen(false)}
                counts={sessionDetails?.session?.cash_counts || []}
            />
        </div>
    );
}
