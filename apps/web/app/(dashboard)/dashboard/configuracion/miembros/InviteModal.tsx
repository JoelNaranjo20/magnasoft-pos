'use client';

import { useState } from 'react';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (email: string, role: string) => Promise<void>;
}

export default function InviteModal({ isOpen, onClose, onInvite }: InviteModalProps) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('worker');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onInvite(email, role);
            setEmail('');
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
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Invitar Miembro</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Correo Electrónico</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="ejemplo@correo.com"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Rol del Miembro</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['worker', 'manager', 'admin'].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setRole(r)}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${role === r
                                        ? 'bg-primary/10 text-primary border-primary dark:bg-primary dark:text-white'
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    {r === 'admin' ? 'Administrador' :
                                        r === 'manager' ? 'Gestor' :
                                            'Operario'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-2 flex flex-col gap-3">
                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                    Enviar Invitación
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center italic">
                        El invitado recibirá un enlace por correo para completar su registro.
                    </p>
                </div>
            </div>
        </div>
    );
}
