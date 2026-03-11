// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useAuthStore } from '@shared/store/useAuthStore';


export const OpenSessionModal = () => {
    const navigate = useNavigate();
    const [amount, setAmount] = useState<string>('0');
    const [loading, setLoading] = useState(false);
    const [workers, setWorkers] = useState<any[]>([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');

    const setCashSession = useSessionStore((state) => state.setCashSession);

    useEffect(() => {
        const fetchWorkers = async () => {
            const businessId = useBusinessStore.getState().id;
            const { data, error } = await supabase
                .from('workers')
                .select('*, roles(name)')
                .eq('business_id', businessId)  // 🔒 SECURITY: Filter by business
                .eq('active', true)
                .order('name');

            if (error) {
                console.error('Error fetching workers:', error);
            } else if (data) {
                console.log('🔍 AUDITORÍA ROLES (OpenSessionModal):', data);
                setWorkers(data);

                // Filter only admins (role name contains 'admin')
                const admins = data.filter(w => {
                    const roleName = w.roles?.name?.toLowerCase() || w.role?.toLowerCase() || '';
                    return roleName.includes('admin');
                });

                // Pre-select first admin if available
                if (admins.length > 0) {
                    setSelectedWorkerId(admins[0].id);
                }
            }
        };

        fetchWorkers();
    }, []);

    const handleNumberClick = (num: string) => {
        if (amount === '0') {
            setAmount(num);
        } else {
            setAmount((prev) => prev + num);
        }
    };

    const handleBackspace = () => {
        if (amount.length > 1) {
            setAmount((prev) => prev.slice(0, -1));
        } else {
            setAmount('0');
        }
    };

    const handleClear = () => {
        setAmount('0');
    };

    const handleOpenSession = async () => {
        if (!selectedWorkerId) {
            alert('Por favor seleccione el responsable del turno.');
            return;
        }
        setLoading(true);

        try {
            // 1. First check if there's already an open session
            const { data: existingSessions, error: checkError } = await (supabase as any)
                .from('cash_sessions')
                .select('id, worker_id, opened_at')
                .eq('status', 'open')
                .limit(1);

            if (checkError) {
                console.error('Error checking sessions:', checkError);
                throw checkError;
            }

            if (existingSessions && existingSessions.length > 0) {
                const session = existingSessions[0];

                // Fetch worker role for existing session
                const { data: workerData } = await supabase
                    .from('workers')
                    .select('*, roles(name)')
                    .eq('id', session.worker_id)
                    .single();

                const workerRole = workerData?.roles?.name || workerData?.role || null;

                // Determine if user is owner
                const { profile, business: authBusiness } = useAuthStore.getState();
                const isOwner = profile?.id && authBusiness?.owner_id && profile.id === authBusiness.owner_id;
                const isSuperAdmin = profile?.role === 'super_admin' || profile?.saas_role === 'super_admin';

                setCashSession(session, workerRole, isOwner, isSuperAdmin);

                alert(
                    `Ya hay una caja abierta.\n\n` +
                    `ID: ${session.id}\n` +
                    `Abierta: ${new Date(session.opened_at).toLocaleString()}\n\n` +
                    `Se ha restaurado la sesión del trabajador con rol: ${workerRole || 'Sin Rol'}`
                );
                setLoading(false);
                return;
            }

            // 2. Create new session if no open session exists
            const startAmount = parseFloat(amount);
            const selectedWorker = workers.find(w => w.id === selectedWorkerId);
            const workerRole = selectedWorker?.roles?.name || selectedWorker?.role || null;

            // Determine if user is owner
            const { profile, business: authBusiness } = useAuthStore.getState();
            const isOwner = profile?.id && authBusiness?.owner_id && profile.id === authBusiness.owner_id;
            const isSuperAdmin = profile?.role === 'super_admin' || profile?.saas_role === 'super_admin';

            const { data, error } = await (supabase as any)
                .from('cash_sessions')
                .insert({
                    business_id: useBusinessStore.getState().id,
                    worker_id: selectedWorkerId,
                    opening_balance: startAmount,
                    status: 'open',
                    opened_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            setCashSession(data, workerRole, isOwner, isSuperAdmin);


        } catch (error: any) {
            console.error('Error opening session:', error);
            alert(`Error al abrir la caja: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const selectedWorker = workers.find(w => w.id === selectedWorkerId);

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-4xl overflow-hidden border shadow-2xl bg-white dark:bg-slate-800 rounded-2xl flex flex-col md:flex-row border-slate-200 dark:border-slate-700">

                {/* Left Side: Form & Context */}
                <div className="flex flex-col justify-between flex-1 p-8">
                    <div>
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => navigate('/')}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    title="Volver al Dashboard"
                                >
                                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">arrow_back</span>
                                </button>
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Apertura de Caja</h2>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Seleccione el responsable e ingrese el monto base.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 mb-4">
                            <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Responsable de Turno</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">badge</span>
                                <select
                                    value={selectedWorkerId}
                                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                                    disabled={(() => {
                                        const admins = workers.filter(w => {
                                            const roleName = w.roles?.name?.toLowerCase() || w.role?.toLowerCase() || '';
                                            return roleName.includes('admin');
                                        });
                                        return admins.length === 0;
                                    })()}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none appearance-none cursor-pointer text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="" disabled>Seleccionar administrador...</option>
                                    {(() => {
                                        const authorizedWorkers = workers.filter(worker => {
                                            const roleName = worker.roles?.name?.toLowerCase() || worker.role?.toLowerCase() || '';
                                            return roleName.includes('admin');
                                        });

                                        if (authorizedWorkers.length === 0) {
                                            return <option value="" disabled>No hay administradores disponibles</option>;
                                        }

                                        return authorizedWorkers.map((worker) => (
                                            <option key={worker.id} value={worker.id}>
                                                {worker.name} ({worker.roles?.name || worker.role || 'Sin Rol'})
                                            </option>
                                        ));
                                    })()}
                                </select>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined pointer-events-none">expand_more</span>
                            </div>
                            {(() => {
                                const admins = workers.filter(w => {
                                    const roleName = w.roles?.name?.toLowerCase() || w.role?.toLowerCase() || '';
                                    return roleName.includes('admin');
                                });

                                if (admins.length === 0) {
                                    return (
                                        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3">
                                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 !text-xl">warning</span>
                                            <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                                                No hay administradores disponibles. Solo usuarios con rol 'admin' pueden abrir caja.
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        Solo administradores pueden abrir sesión de caja.
                                    </p>
                                );
                            })()}
                        </div>

                        {selectedWorker && (
                            <div className="p-4 mb-6 border rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 font-bold rounded-full bg-blue-100 dark:bg-blue-900/30 text-primary">
                                        {selectedWorker.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium tracking-wider uppercase text-slate-500 dark:text-slate-400">Rol Asignado</span>
                                        <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{selectedWorker.roles?.name || selectedWorker.role || 'Sin Rol'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Monto Inicial en Efectivo</label>
                            <div className="relative group">
                                <input
                                    className="block w-full py-6 pl-12 pr-4 text-4xl font-bold border-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                    placeholder="0.00"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        // Allow only numbers and one decimal point
                                        if (/^\d*\.?\d*$/.test(val)) {
                                            setAmount(val);
                                        }
                                    }}
                                    autoFocus
                                    type="text"
                                    value={amount}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-8">
                        <button
                            onClick={handleOpenSession}
                            disabled={loading || !selectedWorkerId}
                            className="w-full bg-primary hover:bg-primary/90 text-white text-lg font-bold py-4 px-6 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Abriendo...' : 'Abrir Caja'}
                        </button>
                    </div>
                </div>

                {/* Right Side: Numpad */}
                <div className="w-full md:w-[320px] bg-slate-50 dark:bg-slate-900/50 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-center">
                    <div className="grid grid-cols-3 gap-3 h-full max-h-[400px]">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num.toString())}
                                className="flex items-center justify-center text-2xl font-semibold bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-900 dark:text-white rounded-lg active:translate-y-0.5"
                            >
                                {num}
                            </button>
                        ))}
                        <button onClick={handleClear} className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg"><span className="material-symbols-outlined">delete</span></button>
                        <button onClick={() => handleNumberClick('0')} className="flex items-center justify-center text-2xl font-semibold bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-900 dark:text-white rounded-lg">0</button>
                        <button onClick={handleBackspace} className="flex items-center justify-center bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"><span className="material-symbols-outlined">backspace</span></button>
                    </div>
                </div>
            </div>
        </div>
    );
};
