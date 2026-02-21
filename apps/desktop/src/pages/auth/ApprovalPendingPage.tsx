// @ts-nocheck
import React, { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@shared/store/useAuthStore';

export const ApprovalPendingPage = () => {
    const { setSession, setProfile, user } = useAuthStore();

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('desktop_approval_check')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload: any) => {
                    if (payload.new.account_status === 'active') {
                        // Refresh app to re-run AuthProvider logic
                        window.location.reload();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        window.location.href = '#/login'; // Force nav
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in duration-500">

                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                    <div className="size-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/20 relative z-10">
                        <span className="material-symbols-outlined text-5xl">person_search</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
                        Revisión de Cuenta
                    </h1>
                    <p className="text-slate-400 font-medium text-lg">
                        Hemos recibido tu registro correctamente.
                    </p>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                        Tu cuenta está marcada como <strong>Pendiente de Aprobación</strong>. Un administrador debe autorizar tu acceso al sistema POS.
                    </p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 space-y-4 backdrop-blur-sm">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl text-left border border-white/5">
                        <div className="size-10 rounded-full bg-blue-500/20 flex flex-shrink-0 items-center justify-center text-blue-500">
                            <span className="material-symbols-outlined text-xl">lock_clock</span>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Estado</p>
                            <p className="text-sm font-bold text-white">En Espera</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-black/20 transition-all flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">logout</span>
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
};
