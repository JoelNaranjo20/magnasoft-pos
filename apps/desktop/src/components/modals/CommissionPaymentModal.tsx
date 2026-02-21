// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { ConfirmationModal } from './ConfirmationModal';

interface Worker {
    id: string;
    name: string;
}

interface Commission {
    id: number;
    created_at: string;
    worker_id: string;
    worker_name: string;
    sale_id: string;
    service_type: string;
    base_amount: number;
    commission_percentage: number;
    commission_amount: number;
    status: 'pending' | 'paid';
    sale_item_name: string;
}

interface CommissionsByWorker {
    worker_id: string;
    worker_name: string;
    commissions: Commission[];
    total: number;
    pending: number;
}

export const CommissionPaymentModal = () => {
    const navigate = useNavigate();
    const user = useSessionStore((state) => state.user);
    const cashSession = useSessionStore((state) => state.cashSession);

    const [commissionsByWorker, setCommissionsByWorker] = useState<CommissionsByWorker[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '' as React.ReactNode,
        onConfirm: async () => { },
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isProcessing: false
    });

    useEffect(() => {
        if (cashSession) {
            fetchSessionCommissions();
        }
    }, [cashSession]);

    const fetchSessionCommissions = async () => {
        if (!cashSession) return;

        setLoading(true);
        try {
            const businessId = useBusinessStore.getState().id;
            // Fetch all commissions for sales in this session
            const { data: commissions, error } = await supabase
                .from('worker_commissions')
                .select(`
                    *,
                    sale:sales!inner(session_id, created_at),
                    sale_item:sale_items(name),
                    worker:workers(name)
                `)
                .eq('sale.session_id', cashSession.id)
                .eq('business_id', businessId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group by worker
            const grouped: { [key: string]: CommissionsByWorker } = {};

            commissions?.forEach((comm: any) => {
                const workerId = comm.worker_id;
                const workerName = comm.worker?.name || 'Trabajador desconocido';

                if (!grouped[workerId]) {
                    grouped[workerId] = {
                        worker_id: workerId,
                        worker_name: workerName,
                        commissions: [],
                        total: 0,
                        pending: 0,
                    };
                }

                const commissionData: Commission = {
                    id: comm.id,
                    created_at: comm.created_at,
                    worker_id: comm.worker_id,
                    worker_name: workerName,
                    sale_id: comm.sale_id,
                    service_type: comm.service_type,
                    base_amount: comm.base_amount,
                    commission_percentage: comm.commission_percentage,
                    commission_amount: comm.commission_amount,
                    status: comm.status,
                    sale_item_name: comm.sale_item?.name || 'Item eliminado',
                };

                grouped[workerId].commissions.push(commissionData);
                grouped[workerId].total += comm.commission_amount;
                if (comm.status === 'pending') {
                    grouped[workerId].pending += comm.commission_amount;
                }
            });

            setCommissionsByWorker(Object.values(grouped));
        } catch (error) {
            console.error('Error fetching session commissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePayWorker = async (workerId: string) => {
        const worker = commissionsByWorker.find(w => w.worker_id === workerId);
        if (!worker || worker.pending === 0) return;

        const pendingCommissions = worker.commissions.filter(c => c.status === 'pending');

        setConfirmModal({
            isOpen: true,
            title: 'Confirmar Pago de Comisiones',
            message: `¿Estás seguro de registrar el pago de $${worker.pending.toLocaleString()} en comisiones a ${worker.worker_name}?`,
            type: 'warning',
            isProcessing: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isProcessing: true }));
                try {
                    const businessId = useBusinessStore.getState().id;
                    // 1. Mark commissions as paid
                    const ids = pendingCommissions.map(c => c.id);
                    const { error: updateError } = await supabase
                        .from('worker_commissions')
                        .update({ status: 'paid', paid_at: new Date().toISOString() })
                        .in('id', ids)
                        .eq('business_id', businessId);

                    if (updateError) throw updateError;

                    // 2. Register cash movement (expense)
                    const { error: movementError } = await supabase
                        .from('cash_movements')
                        .insert({
                            session_id: cashSession!.id,
                            business_id: businessId,
                            type: 'expense',
                            amount: worker.pending,
                            description: `Pago de comisiones a ${worker.worker_name} (${pendingCommissions.length} servicios)`,
                            user_id: user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
                                ? user.id
                                : (cashSession?.user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cashSession.user_id) ? cashSession.user_id : null),
                        });

                    if (movementError) throw movementError;

                    // alert(`Comisiones pagadas correctamente a ${worker.worker_name}`);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    await fetchSessionCommissions();
                } catch (error) {
                    console.error('Error processing payment:', error);
                    alert('Error al procesar el pago. Intenta de nuevo.');
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } finally {
                    setConfirmModal(prev => ({ ...prev, isProcessing: false }));
                }
            }
        });
    };

    const totalPending = commissionsByWorker.reduce((sum, w) => sum + w.pending, 0);
    const totalCommissions = commissionsByWorker.reduce((sum, w) => sum + w.total, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-primary/5 to-blue-500/5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">arrow_back</span>
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Pago de Comisiones</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Turno actual - Comisiones generadas</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 font-bold uppercase">Total Pendiente</p>
                        <p className="text-3xl font-black text-amber-600 dark:text-amber-400">${totalPending.toLocaleString()}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="text-center space-y-4">
                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p className="text-slate-600 dark:text-slate-400">Cargando comisiones...</p>
                            </div>
                        </div>
                    ) : commissionsByWorker.length === 0 ? (
                        <div className="text-center py-24">
                            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">payments</span>
                            <p className="text-slate-500 dark:text-slate-400">No hay comisiones generadas en este turno.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {commissionsByWorker.map((worker) => (
                                <div key={worker.worker_id} className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                                    {/* Worker Header */}
                                    <div className={`p-6 flex justify-between items-center ${worker.pending > 0 ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20' : 'bg-slate-50 dark:bg-slate-900/50'}`}>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{worker.worker_name}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{worker.commissions.length} servicios realizados</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-slate-500 font-bold uppercase mb-1">
                                                {worker.pending > 0 ? 'Pendiente' : 'Pagado'}
                                            </p>
                                            <p className={`text-3xl font-black ${worker.pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                ${worker.pending.toLocaleString()}
                                            </p>
                                            {worker.pending > 0 && (
                                                <button
                                                    onClick={() => handlePayWorker(worker.worker_id)}
                                                    disabled={processingPayment}
                                                    className="mt-3 px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {processingPayment ? 'Procesando...' : 'Pagar Ahora'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Commissions Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase">
                                                <tr>
                                                    <th className="px-4 py-3 font-bold">Servicio</th>
                                                    <th className="px-4 py-3 font-bold">Monto Base</th>
                                                    <th className="px-4 py-3 font-bold">%</th>
                                                    <th className="px-4 py-3 font-bold">Comisión</th>
                                                    <th className="px-4 py-3 font-bold text-right">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {worker.commissions.map((comm) => (
                                                    <tr key={comm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-slate-700 dark:text-slate-200">{comm.sale_item_name}</div>
                                                            <div className="text-xs text-slate-400 capitalize">{comm.service_type.replace('_', ' ')}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">${comm.base_amount.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-slate-500">{comm.commission_percentage}%</td>
                                                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">${comm.commission_amount.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${comm.status === 'paid' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                                {comm.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Summary */}
                <div className="px-8 py-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total de comisiones generadas en este turno</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">${totalCommissions.toLocaleString()}</p>
                        </div>
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isProcessing={confirmModal.isProcessing}
            />
        </div>
    );
};
