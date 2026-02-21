'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface PendingProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    account_status: 'pending';
    created_at: string;
}

export default function SaasApprovalsPage() {
    const [pendings, setPendings] = useState<PendingProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchPendings();
    }, []);

    const fetchPendings = async () => {
        setLoading(true);
        try {
            // Filter by account_status = 'pending'
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('account_status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPendings(data as PendingProfile[] || []);
        } catch (error) {
            console.error('Error fetching pending approvals:', error);
        } finally {
            setLoading(false);
        }
    };

    const approveAccount = async (id: string, email: string | null) => {
        if (!confirm(`¿Aprobar acceso para ${email}?`)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ account_status: 'active' })
                .eq('id', id);

            if (error) throw error;

            // Remove from local list to avoid full refetch
            setPendings(prev => prev.filter(p => p.id !== id));
            alert(`Cuenta ${email} aprobada correctamente.`);
        } catch (error: any) {
            alert('Error al aprobar: ' + error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-500 scale-125">notification_important</span>
                    Bandeja de <span className="text-amber-500">Entrada</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
                    Usuarios solicitando acceso al ecosistema Magnasoft.
                </p>
            </div>

            {pendings.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xl">
                    <div className="size-20 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl">check_circle</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">¡Todo al día!</h3>
                    <p className="text-slate-500 dark:text-slate-400">No hay solicitudes pendientes de aprobación en este momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendings.map((profile) => (
                        <div key={profile.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-amber-100 dark:border-amber-900/30 shadow-lg shadow-amber-500/5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                            <div className="absolute top-0 right-0 p-6 opacity-10 text-amber-500">
                                <span className="material-symbols-outlined text-9xl -mr-8 -mt-8 rotate-12">person_add</span>
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                            <span className="material-symbols-outlined">badge</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Solicitante</p>
                                            <p className="text-xs text-slate-400">{new Date(profile.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 truncate" title={profile.email || ''}>
                                        {profile.email}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">
                                        {profile.full_name || 'Sin nombre registrado'}
                                    </p>
                                </div>

                                <button
                                    onClick={() => approveAccount(profile.id, profile.email)}
                                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 group/btn"
                                >
                                    <span className="material-symbols-outlined text-xl group-hover/btn:scale-110 transition-transform">how_to_reg</span>
                                    Aprobar Acceso
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
