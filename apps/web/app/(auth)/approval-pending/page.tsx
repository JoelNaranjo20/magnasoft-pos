'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function ApprovalPendingPage() {
    const { logout, user } = useAuth();

    useEffect(() => {
        if (!user) return;

        console.log('Listening for profile changes for user:', user.id);

        const channel = supabase
            .channel('profile_status_check')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload: any) => {
                    console.log('Profile updated:', payload);
                    const newStatus = payload.new.account_status;
                    if (newStatus === 'active') {
                        console.log('Account approved! Reloading...');
                        window.location.reload();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in duration-500">

                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full"></div>
                    <div className="size-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-amber-500/20 relative z-10">
                        <span className="material-symbols-outlined text-5xl">verified_user</span>
                    </div>
                    <div className="absolute -bottom-2 -right-2 size-8 bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-950 z-20">
                        <span className="material-symbols-outlined text-amber-500 text-sm">schedule</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none">
                        Cuenta en Revisión
                    </h1>
                    <p className="text-slate-400 font-medium text-lg">
                        Tu solicitud ha sido recibida con éxito.
                    </p>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                        Por motivos de seguridad, un administrador debe aprobar tu acceso manualmente. Te notificaremos vía email cuando tu cuenta esté activa.
                    </p>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 space-y-4 backdrop-blur-sm">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl text-left border border-white/5">
                        <div className="size-10 rounded-full bg-emerald-500/20 flex flex-shrink-0 items-center justify-center text-emerald-500">
                            <span className="material-symbols-outlined text-xl">lock_clock</span>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Estado Actual</p>
                            <p className="text-sm font-bold text-white">Pendiente de Aprobación</p>
                        </div>
                        <div className="ml-auto">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-3 mx-auto border border-white/5 hover:border-white/10"
                >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Cerrar Sesión
                </button>

                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    MagnaSoft Security System
                </p>
            </div>
        </div>
    );
}
