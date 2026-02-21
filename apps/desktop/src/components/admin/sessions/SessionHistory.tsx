// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Pagination } from '../../ui/Pagination';
import { CashMovementsModal } from '../../modals/CashMovementsModal';

export const SessionHistory = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [sessionDetails, setSessionDetails] = useState<{
        session: any,
        sales: any[],
        movements: any[],
        commissions: any[]
    } | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
    const [activeMovementType, setActiveMovementType] = useState<'income' | 'expense'>('expense');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Pagination state
    const [currentSalesPage, setCurrentSalesPage] = useState(1);
    const salesItemsPerPage = 10;

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            // First fetch sessions
            const { data: sessionsData, error: sessionsError } = await supabase
                .from('cash_sessions')
                .select('*')
                .order('opened_at', { ascending: false });

            if (sessionsError) throw sessionsError;

            // Fetch worker names for each session
            // Use worker_id as per schema, filtering out nulls
            const workerIds = [...new Set(sessionsData.map(s => s.worker_id).filter(id => id))];

            let workerMap: any = {};
            if (workerIds.length > 0) {
                const { data: workersData } = await supabase
                    .from('workers')
                    .select('id, name')
                    .in('id', workerIds);

                workerMap = (workersData || []).reduce((acc: any, w: any) => {
                    acc[w.id] = w.name;
                    return acc;
                }, {});
            }

            const enrichedSessions = sessionsData.map(s => ({
                ...s,
                workerName: workerMap[s.worker_id] || 'Desconocido'
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
            // Fetch Session Object (for notes, difference, etc)
            const { data: sessionData } = await supabase
                .from('cash_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            // Fetch Sales
            const { data: sales } = await supabase
                .from('sales')
                .select('*, items:sale_items(*)')
                .eq('session_id', sessionId);

            // Fetch Movements
            const { data: movements } = await supabase
                .from('cash_movements')
                .select('*')
                .eq('session_id', sessionId);

            // Fetch Commissions
            let commissions: any[] = [];
            if (sales && sales.length > 0) {
                const saleIds = sales.map(s => s.id);
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

    if (loading) return <div className="text-center py-12">Cargando historial de sesiones...</div>;

    const sales = sessionDetails?.sales || [];
    const totalPages = Math.ceil(sales.length / salesItemsPerPage);
    const paginatedSales = sales.slice(
        (currentSalesPage - 1) * salesItemsPerPage,
        currentSalesPage * salesItemsPerPage
    );

    return (
        <div className="flex flex-col gap-6 h-full overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
                {/* List of Sessions */}
                <div className={`transition-all duration-300 ease-in-out bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col uppercase lg:normal-case ${isSidebarCollapsed ? 'h-[60px] md:h-full w-full md:w-[70px]' : 'h-full w-full md:w-[400px]'}`}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center whitespace-nowrap">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">history</span>
                            {!isSidebarCollapsed && <span>Historial de Turnos</span>}
                        </h3>
                        <div className="flex items-center gap-1">
                            {!isSidebarCollapsed && (
                                <button
                                    onClick={fetchSessions}
                                    title="Actualizar"
                                    className="text-slate-400 hover:text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                                </button>
                            )}
                            <button
                                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                title={isSidebarCollapsed ? "Expandir lista" : "Colapsar lista"}
                                className="text-slate-400 hover:text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {isSidebarCollapsed ? 'chevron_right' : 'chevron_left'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className={`overflow-y-auto custom-scrollbar flex-1 ${isSidebarCollapsed ? 'invisible opacity-0' : 'visible opacity-100 transition-opacity duration-300'}`}>
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
                                        <span className="text-xs text-slate-500">{new Date(session.opened_at).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${session.status === 'open'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                        }`}>
                                        {session.status === 'open' ? 'EN CURSO' : 'CERRADO'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex flex-col">
                                        <span className="text-slate-400">Apertura</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">${session.opening_balance?.toLocaleString() || '0'}</span>
                                    </div>
                                    {session.status === 'closed' && (
                                        <div className="flex flex-col text-right">
                                            <span className="text-slate-400">Cierre</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">${session.closing_balance?.toLocaleString() || '0'}</span>
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
                            <span className="material-symbols-outlined !text-6xl mb-4 opacity-20">inventory</span>
                            <p className="font-medium">Seleccione una sesión para ver los detalles del turno.</p>
                        </div>
                    ) : detailsLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                            <span className="mt-4 text-sm text-slate-500">Cargando detalles...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">Resumen del Turno</h4>
                                        <p className="text-sm text-slate-500">ID: {selectedSessionId.slice(0, 8)}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Recaudado</div>
                                        <div className="text-2xl font-black text-primary">
                                            ${sessionDetails?.sales.reduce((sum, s) => sum + s.total_amount, 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Breakdown */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Base Inicial</div>
                                        <div className="text-lg font-black text-slate-700 dark:text-slate-200">
                                            ${sessionDetails?.session?.opening_balance?.toLocaleString() || '0'}
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Ventas Efectivo</div>
                                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                            ${sessionDetails?.sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total_amount, 0).toLocaleString() || '0'}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                        <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Ventas Crédito</div>
                                        <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                            ${sessionDetails?.sales.filter(s => s.payment_method === 'credit').reduce((sum, s) => sum + s.total_amount, 0).toLocaleString() || '0'}
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/20 rounded-xl p-4 border-2 border-primary/30">
                                        <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Efectivo Esperado</div>
                                        <div className="text-lg font-black text-primary">
                                            ${(() => {
                                                const start = sessionDetails?.session?.opening_balance || 0;
                                                const cashSales = sessionDetails?.sales?.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total_amount, 0) || 0;
                                                const movementBalance = (sessionDetails?.movements || []).reduce((acc, mov) => {
                                                    return mov.type === 'income' ? acc + mov.amount : acc - mov.amount;
                                                }, 0);
                                                return (start + cashSales + movementBalance).toLocaleString();
                                            })()}
                                        </div>
                                        {/* Show breakdown of historical payments if any */}
                                        {(() => {
                                            const historicalPayments = (sessionDetails?.movements || [])
                                                .filter(m => m.type === 'expense' && m.description?.toLowerCase().includes('pago de comisiones'))
                                                .reduce((sum, m) => sum + m.amount, 0);

                                            return (
                                                <div className="text-[10px] font-medium leading-tight mt-1 border-t border-primary/20 pt-1 flex justify-between">
                                                    <span className="text-primary/70">Liq. Históricas</span>
                                                    <span className={`${historicalPayments > 0 ? 'text-primary font-bold' : 'text-primary/50'}`}>
                                                        -${historicalPayments.toLocaleString()}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                                {/* Session Summary Module */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="bg-slate-50 dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Arqueo de Caja</span>
                                            <span className="material-symbols-outlined text-primary opacity-40">point_of_sale</span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-500 uppercase">Base Inicial</span>
                                                <span className="text-slate-900 dark:text-white">${sessionDetails?.session?.opening_balance?.toLocaleString() || '0'}</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-500 uppercase">Sistema</span>
                                                <span className="text-slate-900 dark:text-white">${sessionDetails?.session?.closing_balance?.toLocaleString() || '0'}</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-500 uppercase">Contado</span>
                                                <span className="text-slate-900 dark:text-white">${sessionDetails?.session?.manual_end_amount?.toLocaleString() || '0'}</span>
                                            </div>
                                            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-black">
                                                <span className="text-xs text-slate-400 uppercase">Dif.</span>
                                                <span className={`text-lg ${sessionDetails?.session?.difference < 0 ? 'text-rose-500' : sessionDetails?.session?.difference > 0 ? 'text-blue-500' : 'text-emerald-500'}`}>
                                                    ${sessionDetails?.session?.difference?.toLocaleString() || '0'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Liquidaciones</span>
                                            <span className="material-symbols-outlined text-amber-500 opacity-40">badge</span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-500 uppercase">Pagadas</span>
                                                <span className="text-blue-600">${sessionDetails?.commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commission_amount, 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-500 uppercase tracking-wider">Pendientes</span>
                                                <span className="text-amber-600">${sessionDetails?.commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0).toLocaleString()}</span>
                                            </div>
                                            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-black">
                                                <span className="text-xs text-slate-400 uppercase">Servs.</span>
                                                <span className="text-lg text-slate-900 dark:text-white">{sessionDetails?.commissions?.length || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => {
                                            setActiveMovementType('income');
                                            setIsMovementsModalOpen(true);
                                        }}
                                        className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 shadow-sm border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-5 relative overflow-hidden cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
                                    >
                                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined !text-[80px]">add_circle</span>
                                        </div>
                                        <div className="relative z-10 h-full flex flex-col justify-between">
                                            <span className="text-xs font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest leading-none block mb-2">Entradas</span>
                                            <div>
                                                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                                                    ${sessionDetails?.movements?.filter(m => m.type === 'income').reduce((sum, m) => sum + m.amount, 0).toLocaleString() || '0'}
                                                </span>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <p className="text-[10px] font-bold text-emerald-600/70 uppercase">Ingresos Manuales</p>
                                                    <span className="material-symbols-outlined !text-[14px] text-emerald-600/50">visibility</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => {
                                            setActiveMovementType('expense');
                                            setIsMovementsModalOpen(true);
                                        }}
                                        className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20 shadow-sm border border-rose-100 dark:border-rose-900/40 rounded-2xl p-5 relative overflow-hidden cursor-pointer hover:border-rose-300 dark:hover:border-rose-700 transition-all group"
                                    >
                                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined !text-[80px]">remove_circle</span>
                                        </div>
                                        <div className="relative z-10 h-full flex flex-col justify-between">
                                            <span className="text-xs font-black text-rose-600/60 dark:text-rose-400/60 uppercase tracking-widest leading-none block mb-2">Gastos</span>
                                            <div>
                                                <span className="text-3xl font-black text-rose-600 dark:text-rose-400">
                                                    ${sessionDetails?.movements?.filter(m => m.type === 'expense').reduce((sum, m) => sum + m.amount, 0).toLocaleString() || '0'}
                                                </span>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <p className="text-[10px] font-bold text-rose-600/70 uppercase">Egresos + Liquidaciones</p>
                                                    <span className="material-symbols-outlined !text-[14px] text-rose-600/50">visibility</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Session Notes (Novedades) */}
                                {sessionDetails?.session?.notes && (
                                    <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="material-symbols-outlined text-amber-500">sticky_note_2</span>
                                            <span className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Novedades de Cierre</span>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-300 font-medium italic">"{sessionDetails.session.notes}"</p>
                                    </div>
                                )}

                                {/* Sales Summary table */}
                                <div>
                                    <h5 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-center text-[20px]">shopping_basket</span>
                                        Ventas Realizadas ({sales.length})
                                    </h5>
                                    <div className="border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
                                                <tr>
                                                    <th className="px-4 py-3">Hora</th>
                                                    <th className="px-4 py-3">Cliente / Vehículo</th>
                                                    <th className="px-4 py-3">Método</th>
                                                    <th className="px-4 py-3 text-right">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {paginatedSales.map((sale) => (
                                                    <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                                        <td className="px-4 py-3 text-slate-500">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{sale.customer_name || 'Venta Rápida'}</span>
                                                                {sale.items && sale.items.length > 0 && (
                                                                    <span className="text-[10px] text-slate-400">{sale.items[0].name} {sale.items.length > 1 ? `+${sale.items.length - 1}` : ''}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`capitalize px-2 py-0.5 rounded text-[10px] font-bold ${sale.payment_method === 'credit'
                                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                                }`}>
                                                                {sale.payment_method === 'cash' ? 'Efectivo'
                                                                    : sale.payment_method === 'card' ? 'Tarjeta'
                                                                        : sale.payment_method === 'credit' ? 'Crédito'
                                                                            : 'Transferencia'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">${sale.total_amount.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                {sales.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">No hubo ventas en este turno.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Pagination
                                        currentPage={currentSalesPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentSalesPage}
                                        totalItems={sales.length}
                                        itemsPerPage={salesItemsPerPage}
                                    />
                                </div>

                                {/* Movements Section */}
                                < div >
                                    <h5 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
                                        Movimientos de Caja ({sessionDetails?.movements.length})
                                    </h5>
                                    <div className="space-y-3">
                                        {sessionDetails?.movements.map((mov) => (
                                            <div key={mov.id} className="flex flex-col p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${mov.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>
                                                            <span className="material-symbols-outlined text-[20px]">{mov.type === 'income' ? 'south_west' : 'north_east'}</span>
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 dark:text-white capitalize">
                                                                {mov.type === 'income'
                                                                    ? 'Ingreso Extra'
                                                                    : mov.description?.toLowerCase().includes('pago de comisiones')
                                                                        ? 'Pago Nómina / Comisiones'
                                                                        : 'Gasto Rápido'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">{new Date(mov.created_at).toLocaleTimeString()}</div>
                                                        </div>
                                                    </div>
                                                    <div className={`font-bold text-lg ${mov.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {mov.type === 'income' ? '+' : '-'}${mov.amount.toLocaleString()}
                                                    </div>
                                                </div>
                                                {mov.description && (
                                                    <div className="mt-2 pl-[52px] pr-2">
                                                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Observaciones:</div>
                                                        <div className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-700/50">
                                                            {mov.description}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {sessionDetails?.movements.length === 0 && (
                                            <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl text-slate-400 text-sm">
                                                No hubo entradas o salidas de efectivo manuales.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Detailed Commissions Section */}
                                <div>
                                    <h5 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[20px]">badge</span>
                                        Detalle de Liquidaciones ({sessionDetails?.commissions.length})
                                    </h5>
                                    <div className="border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
                                                <tr>
                                                    <th className="px-4 py-3">Trabajador</th>
                                                    <th className="px-4 py-3">Servicio</th>
                                                    <th className="px-4 py-3">Monto Base</th>
                                                    <th className="px-4 py-3 text-right">Liquidación</th>
                                                    <th className="px-4 py-3 text-right">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {sessionDetails?.commissions.map((comm) => (
                                                    <tr key={comm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{comm.worker?.name}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-700 dark:text-slate-300">{comm.sale_item?.name || 'Servicio'}</span>
                                                                <span className="text-[10px] text-slate-400 uppercase tracking-tight">{comm.service_type}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500">${comm.base_amount.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                                                            ${comm.commission_amount.toLocaleString()}
                                                            <span className="text-[10px] text-slate-400 ml-1">({comm.commission_percentage}%)</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${comm.status === 'paid'
                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                }`}>
                                                                {comm.status === 'paid' ? 'PAGADA' : 'PENDIENTE'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {sessionDetails?.commissions.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No se generaron liquidaciones en este turno.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
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
                title={activeMovementType === 'income' ? 'Ingresos de Caja' : 'Gastos del Turno'}
                subtitle={activeMovementType === 'income' ? "Detalle de ingresos manuales reportados" : `Egresos registrados por ${sessionDetails?.session?.workerName || 'el trabajador'} en este turno`}
            />
        </div>
    );
};
