import React, { useState } from 'react';

interface InvitationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (email: string, role: string) => Promise<boolean>;
    loading: boolean;
}

export const InvitationModal = ({ isOpen, onClose, onInvite, loading }: InvitationModalProps) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('worker');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onInvite(email, role);
        if (success) {
            setEmail('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">person_add</span>
                        Invitar Miembro
                    </h2>
                    <button
                        onClick={onClose}
                        className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 transition-colors flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Correo Electrónico</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">mail</span>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ejemplo@correo.com"
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Rol en el Equipo</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'worker', label: 'Trabajador', icon: 'badge' },
                                { id: 'manager', label: 'Gerente', icon: 'manage_accounts' },
                                { id: 'admin', label: 'Admin', icon: 'admin_panel_settings' },
                            ].map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setRole(r.id)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all text-sm font-bold ${role === r.id
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <span className="material-symbols-outlined !text-[18px]">{r.icon}</span>
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined !text-[20px]">send</span>
                                    Enviar Invitación
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
