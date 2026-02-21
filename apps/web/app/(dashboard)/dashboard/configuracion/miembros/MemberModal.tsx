'use client';

import { useState, useEffect } from 'react';
import { Member } from '@/app/hooks/useMembers';

interface MemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: Member | null;
    onUpdate: (id: string, newRole: string) => Promise<any>;
}

export default function MemberModal({ isOpen, onClose, member, onUpdate }: MemberModalProps) {
    const [role, setRole] = useState('worker');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (member) {
            setRole(member.role || 'worker');
        }
    }, [member]);

    if (!isOpen || !member) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onUpdate(member.id, role);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Editar Miembro</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                            {member.full_name ? member.full_name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white">{member.full_name || 'Sin Nombre'}</span>
                            <span className="text-sm text-slate-500">{member.email}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Rol del Miembro</label>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { id: 'admin', label: 'Administrador', desc: 'Acceso total al sistema y configuración.' },
                                { id: 'manager', label: 'Gestor', desc: 'Gestión de ventas, inventario y reportes.' },
                                { id: 'worker', label: 'Operario', desc: 'Registro de ventas y servicios del día.' },
                            ].map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setRole(r.id)}
                                    className={`flex flex-col items-start gap-1 p-4 rounded-xl text-left transition-all border ${role === r.id
                                        ? 'bg-primary/5 border-primary shadow-sm'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className={`font-bold ${role === r.id ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                                            {r.label}
                                        </span>
                                        {role === r.id && (
                                            <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {r.desc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={loading || role === member.role}
                            type="submit"
                            className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                'Guardar Cambios'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
