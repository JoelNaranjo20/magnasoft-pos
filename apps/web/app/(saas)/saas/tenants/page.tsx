'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ActiveTenant {
    id: string;
    email: string | null;
    full_name: string | null;
    account_status: 'active' | 'suspended';
    created_at: string;
    business: {
        id: string;
        name: string;
        status: string;
        business_type: string;
    } | null;
}

export default function SaasTenantsPage() {
    const [tenants, setTenants] = useState<ActiveTenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        setLoading(true);
        try {
            // Get current user to exclude self
            const { data: { user } } = await supabase.auth.getUser();

            // Fetch active or suspended profiles + Business Join
            // Strict Filter: Not Pending AND Not Super Admin
            const { data, error } = await supabase
                .from('profiles')
                .select('*, business:business(*)')
                .neq('account_status', 'pending')
                .neq('saas_role', 'super_admin') // Don't show ourselves or other admins
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTenants(data as unknown as ActiveTenant[] || []);
        } catch (error) {
            console.error('Error fetching tenants:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string, email: string | null) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        const action = newStatus === 'active' ? 'Reactivar' : 'Suspender';

        if (!confirm(`¿${action} acceso para ${email}?`)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ account_status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setTenants(prev => prev.map(t =>
                t.id === id ? { ...t, account_status: newStatus as any } : t
            ));
        } catch (error: any) {
            alert('Error updating status: ' + error.message);
        }
    };

    const filteredTenants = tenants.filter(t =>
        (t.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.business?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-600 scale-125">folder_shared</span>
                        Directorio <span className="text-blue-600">Clientes</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
                        Gestión de usuarios activos y sus negocios vinculados.
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Buscar cliente o negocio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-5">Dueño / Usuario</th>
                                <th className="px-8 py-5">Negocio Vinculado</th>
                                <th className="px-8 py-5">Estado Cuenta</th>
                                <th className="px-8 py-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/10 h-16"></td>
                                    </tr>
                                ))
                            ) : filteredTenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <span className="material-symbols-outlined">person</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800 dark:text-white">{tenant.email}</span>
                                                <span className="text-[10px] text-slate-400">{tenant.full_name || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        {tenant.business ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{tenant.business.name}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{tenant.business.business_type}</span>
                                                    {tenant.business.status !== 'active' && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold uppercase">Estado: {tenant.business.status}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                Sin Configurar
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${tenant.account_status === 'active'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                            }`}>
                                            {tenant.account_status === 'active' ? 'Activo' : 'Suspendido'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => toggleStatus(tenant.id, tenant.account_status, tenant.email)}
                                            className={`p-2 rounded-xl transition-all ${tenant.account_status === 'active'
                                                ? 'bg-rose-50 text-rose-500 hover:bg-rose-100 hover:scale-110'
                                                : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:scale-110'
                                                }`}
                                            title={tenant.account_status === 'active' ? "Suspender Acceso" : "Reactivar Acceso"}
                                        >
                                            <span className="material-symbols-outlined">
                                                {tenant.account_status === 'active' ? 'block' : 'refresh'}
                                            </span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
