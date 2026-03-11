import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChangePasswordModal = ({ isOpen, onClose }: ChangePasswordModalProps) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            
            if (error) throw error;
            
            alert('Contraseña actualizada correctamente.');
            onClose();
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error('Error changing password:', err);
            setError(err.message || 'Error al cambiar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 z-40 transition-opacity bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative z-50 flex flex-col w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-white/10">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">key</span>
                        Cambiar Contraseña
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 transition-colors rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/10 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Nueva Contraseña
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-11 px-4 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:border-primary focus:ring-primary outline-none"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Confirmar Nueva Contraseña
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full h-11 px-4 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:border-primary focus:ring-primary outline-none"
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="mt-8">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-primary text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">save</span>
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
