// @ts-nocheck
import { useState, useEffect } from 'react';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useNavigate } from 'react-router-dom';
import { ServiceQueueModal } from '../modals/ServiceQueueModal';
import { supabase } from '../../lib/supabase';
import { useModule } from '../../hooks/useModule';

export const POSTopBar = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const setClosing = useSessionStore((state) => state.setClosing);
    const setChangingAdmin = useSessionStore((state) => state.setChangingAdmin);
    const user = useSessionStore((state) => state.user);
    const { name: businessName, logoUrl } = useBusinessStore();
    const navigate = useNavigate();
    const [isQueueOpen, setIsQueueOpen] = useState(false);
    const hasCommissionsPayment = useModule('commission_payment');
    const hasServiceQueue = useModule('vehicle_queue');
    const { config } = useBusinessStore();

    useEffect(() => {
        console.log("🛠️ POS TOPBAR MODULES DEBUG:");
        console.log("- Config object:", config);
        console.log("- hasCommissionsPayment:", hasCommissionsPayment);
        console.log("- hasServiceQueue:", hasServiceQueue);
    }, [config, hasCommissionsPayment, hasServiceQueue]);
    const [queueCount, setQueueCount] = useState(0);
    const [search, setSearch] = useState('');


    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        fetchQueueCount();
        const queueSubscription = supabase
            .channel('queue_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'service_queue' }, () => {
                fetchQueueCount();
            })
            .subscribe();

        return () => {
            clearInterval(timer);
            supabase.removeChannel(queueSubscription);
        };
    }, []);

    useEffect(() => {
        const handleForceRefresh = () => fetchQueueCount();
        window.addEventListener('queue-force-refresh', handleForceRefresh);
        return () => window.removeEventListener('queue-force-refresh', handleForceRefresh);
    }, []);

    const fetchQueueCount = async () => {
        try {
            const { count, error } = await supabase
                .from('service_queue')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'waiting');

            if (error) throw error;
            setQueueCount(count || 0);
        } catch (err) {
            console.error('Error fetching queue count:', err);
            // Fallback to 0 if error to avoid ghost notifications
            setQueueCount(0);
        }
    };

    return (
        <>
            <header className="sticky top-0 z-40 flex-none flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md px-6 py-3 h-20 shadow-sm transition-all duration-300">
                <div className="flex items-center gap-6">
                    {/* Brand */}
                    <div className="flex items-center gap-3 group cursor-default">
                        {logoUrl ? (
                            <div className="size-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/30 transform group-hover:rotate-6 transition-transform duration-300">
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="size-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white transform group-hover:rotate-6 transition-transform duration-300">
                                <span className="material-symbols-outlined !text-[28px] drop-shadow-sm">local_car_wash</span>
                            </div>
                        )}
                        <div className="flex flex-col">
                            <h1 className="text-lg font-black leading-none tracking-tight text-slate-800 dark:text-white group-hover:text-primary transition-colors">{businessName}</h1>
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold px-1 py-0.5 mt-1">SISTEMA DE GESTIÓN</span>
                        </div>
                    </div>
                    {/* Divider */}
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                    {/* Search */}
                    <label className="relative flex items-center w-96 group">
                        <span className="absolute left-3 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined pointer-events-none">search</span>
                        <input
                            className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-transparent dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400 outline-none shadow-sm"
                            placeholder="Buscar servicio o producto (F3)..."
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onMouseDown={(e) => e.currentTarget.focus()}
                        />
                        <div className="absolute right-2 flex gap-1">
                            <kbd className="hidden group-focus-within:inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 font-sans text-[10px] font-bold text-slate-400">
                                ESC
                            </kbd>
                        </div>
                    </label>
                </div>
                <div className="flex items-center gap-6">
                    {/* Status Chips */}
                    <div className="hidden xl:flex items-center gap-1 bg-slate-50/50 dark:bg-slate-800/30 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            <span className="text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">Caja Abierta</span>
                        </div>
                        <div className="flex items-center gap-4 px-4 text-slate-600 dark:text-slate-300">
                            <div className="flex flex-col items-end leading-none">
                                <span className="text-xs font-bold">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-[10px] opacity-70 uppercase font-medium">{currentTime.toLocaleDateString([], { weekday: 'short' })}</span>
                            </div>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-600"></div>
                            <span className="text-xs font-bold">{currentTime.toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                        </div>
                    </div>
                    {/* User Actions */}
                    <div className="flex items-center gap-3">

                        {/* Commission Payments - Only if module enabled */}
                        {hasCommissionsPayment && (
                            <button
                                onClick={() => navigate('/pos/commissions')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors font-bold shadow-sm border border-amber-200 dark:border-amber-900/30"
                                title="Pagar liquidaciones"
                            >
                                <span className="material-symbols-outlined !text-[20px]">payments</span>
                                <span className="hidden lg:inline">Liquidación</span>
                            </button>
                        )}

                        <button
                            onClick={() => setClosing(true)}
                            className="flex h-10 px-4 items-center gap-2 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl transition-all text-xs font-bold uppercase tracking-wide border border-rose-100 dark:border-rose-900/30 shadow-sm hover:shadow-rose-500/10 active:scale-95"
                        >
                            <span className="material-symbols-outlined !text-[18px]">lock</span>
                            <span className="hidden sm:inline">Cerrar</span>
                        </button>

                        <button
                            onClick={() => navigate('/admin')}
                            className="hidden lg:flex h-10 px-4 items-center gap-2 bg-blue-50 dark:bg-blue-900/10 text-primary hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all text-xs font-bold uppercase tracking-wide border border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-blue-500/10 active:scale-95"
                        >
                            <span className="material-symbols-outlined !text-[20px]">dashboard</span>
                            Panel
                        </button>

                        {/* Profile Avatar & Name */}
                        <div
                            className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-1 pr-4 rounded-full border border-slate-200 dark:border-slate-700"
                        >
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm relative">
                                {user?.avatar_url ? (
                                    <img
                                        alt="Admin"
                                        className="w-full h-full object-cover"
                                        src={user.avatar_url}
                                    />
                                ) : (
                                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                                        {(user?.full_name || user?.email || 'AD').substring(0, 2).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col select-none">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter leading-none">
                                    {useSessionStore.getState().workerRole || 'Administrador'}
                                </span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                                    {user?.full_name || user?.email?.split('@')[0] || 'Cajero'}
                                </span>
                            </div>

                        </div>

                        {/* Queue Trigger - Only if module enabled */}
                        {hasServiceQueue && (
                            <button
                                onClick={() => setIsQueueOpen(true)}
                                className="relative flex h-12 w-12 items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700 group active:scale-95"
                                title="Cola de Espera"
                            >
                                <span className="material-symbols-outlined !text-[26px]">car_repair</span>
                                {queueCount > 0 && (
                                    <span className="absolute -top-2 -right-2 h-6 w-6 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 shadow-lg animate-bounce">
                                        {queueCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <ServiceQueueModal
                isOpen={isQueueOpen}
                onClose={() => setIsQueueOpen(false)}
                onItemSelect={(item) => {
                    // Dispatch event with all items from the queue
                    window.dispatchEvent(new CustomEvent('pos-add-to-cart-from-queue', {
                        detail: {
                            plate: item.reference_info,
                            workerId: item.worker_id,
                            items: item.items,
                            service: item.service // Fallback for single service
                        }
                    }));
                }}
            />
        </>
    );
};
