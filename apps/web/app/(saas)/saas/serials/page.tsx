'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface BusinessAudit {
    id: string;
    name: string;
    license_key: string | null;
    hardware_id: string | null;
    created_at: string;
}

export default function SaasSerialsPage() {
    const [businesses, setBusinesses] = useState<BusinessAudit[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        setLoading(true);
        try {
            // Direct query to business table for hardware audit
            const { data, error } = await supabase
                .from('business')
                .select('id, name, license_key, hardware_id, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBusinesses(data as BusinessAudit[] || []);
        } catch (error) {
            console.error('Error fetching serials:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string | null) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        // Could enable a toast here
    };

    const filteredBusinesses = businesses.filter(b =>
        (b.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.license_key || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.hardware_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-indigo-600 scale-125">memory</span>
                        Auditoría de <span className="text-indigo-600">Hardware</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
                        Control técnico de licencias y dispositivos vinculados.
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Buscar por serial, ID o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-indigo-500 outline-none transition-all shadow-sm font-mono text-sm"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-5">Negocio</th>
                                <th className="px-8 py-5">Licencia (Serial)</th>
                                <th className="px-8 py-5">Hardware ID (Máquina)</th>
                                <th className="px-8 py-5">Registro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/10 h-16"></td>
                                    </tr>
                                ))
                            ) : filteredBusinesses.map((biz) => (
                                <tr key={biz.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                    <td className="px-8 py-5">
                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{biz.name}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        {biz.license_key ? (
                                            <div className="flex items-center gap-2 group/key cursor-pointer w-fit" onClick={() => copyToClipboard(biz.license_key)}>
                                                <code className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs border border-slate-200 dark:border-slate-700 group-hover/key:border-indigo-300 transition-colors">
                                                    {biz.license_key}
                                                </code>
                                                <span className="material-symbols-outlined text-[14px] text-slate-300 group-hover/key:text-indigo-500 transition-colors">content_copy</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-xs italic">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        {biz.hardware_id ? (
                                            <div className="flex items-center gap-2 group/hwid cursor-pointer w-fit" onClick={() => copyToClipboard(biz.hardware_id)}>
                                                <code className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] border border-indigo-100 dark:border-indigo-800 group-hover/hwid:bg-indigo-100 transition-colors">
                                                    {biz.hardware_id}
                                                </code>
                                                <span className="material-symbols-outlined text-[14px] text-slate-300 group-hover/hwid:text-indigo-500 transition-colors">content_copy</span>
                                            </div>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                                                <span className="material-symbols-outlined text-[14px]">link_off</span>
                                                Sin Vincular
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs text-slate-400 font-mono">
                                            {new Date(biz.created_at).toLocaleDateString()}
                                        </span>
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
