'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const router = useRouter();

    useEffect(() => {
        // Supabase emits passwords recovery events that automatically process the hash
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'PASSWORD_RECOVERY') {
                console.log('[Web ResetPassword] Allowed to reset.');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            setSuccessMsg('¡Contraseña actualizada con éxito! Redirigiendo...');
            
            setTimeout(() => {
                router.push('/login');
            }, 3000);

        } catch (err: any) {
            console.error('Error updating password:', err);
            setError(err.message || 'Error al actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-emerald-500/10 blur-[120px] rounded-full"></div>

            <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in zoom-in duration-700">
                <div className="text-center space-y-6">
                    <div className="size-24 mx-auto rounded-[2rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-500"></div>
                        <span className="material-symbols-outlined text-5xl relative z-10">
                            vpn_key
                        </span>
                    </div>
                    <div className="flex flex-col items-center">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                            Restablecer
                        </h1>
                        <p className="text-slate-500 font-bold tracking-[0.3em] uppercase text-[10px] mt-2">
                            Crea tu nueva contraseña
                        </p>
                    </div>
                </div>

                <form onSubmit={handleUpdatePassword} className="bg-slate-900/50 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl border border-white/5 space-y-5">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            Nueva Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 focus:border-emerald-500 rounded-2xl outline-none transition-all text-white font-medium placeholder:text-slate-600"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            Confirmar Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 focus:border-emerald-500 rounded-2xl outline-none transition-all text-white font-medium placeholder:text-slate-600"
                        />
                    </div>

                    {error && (
                        <p className="text-rose-400 text-[11px] font-bold text-center bg-rose-500/10 py-3 rounded-xl border border-rose-500/20">
                            {error}
                        </p>
                    )}

                    {successMsg && (
                        <p className="text-emerald-400 text-[11px] font-bold text-center bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/20">
                            {successMsg}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !!successMsg}
                        className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black shadow-2xl shadow-emerald-500/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[20px]">
                                    save
                                </span>
                                Actualizar
                            </>
                        )}
                    </button>

                    <div className="pt-4 text-center">
                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-colors"
                        >
                            Volver al inicio
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
