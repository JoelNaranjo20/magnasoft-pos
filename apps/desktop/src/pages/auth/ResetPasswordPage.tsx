// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const ResetPasswordPage = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Supabase sends the recovery token as a hash fragment in the URL
        // e.g. /#/reset-password#access_token=...&type=recovery
        // However, HashRouter already extracts the pathname from the hash.
        // We will listen to Supabase's auth state change instead, as it automatically parses the URL Hash on load.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                console.log('[ResetPassword] Recovery session detected.');
                // We are allowed to show the form
            } else if (event === 'SIGNED_IN' && !successMsg) {
                // Because auto-login kicks in when the recovery link is clicked
                // If it's a normal sign in without a recovery context, we should maybe redirect
                // But let's just allow them to reset if they landed here.
            }
        });

        // Parse hash from window.location in case the router swallowed it
        const hash = window.location.hash;
        if (!hash.includes('type=recovery') && !hash.includes('access_token')) {
            // Wait a sec for supabase to process, if no session, show warning? 
            // Actually, Supabase processes the hash automatically and fires PASSWORD_RECOVERY
        }

        return () => {
            subscription.unsubscribe();
        };
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
            
            // Clean hash and redirect to login
            setTimeout(() => {
                navigate('/login', { replace: true });
            }, 3000);

        } catch (err: any) {
            console.error('Error updating password:', err);
            setError(err.message || 'Error al actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative">
            {/* Background elements to match the login page vibe */}
            <div className="absolute top-0 right-0 right-1/4 size-96 bg-sky-500/10 blur-[100px] rounded-full"></div>
            <div className="absolute bottom-0 left-0 left-1/4 size-96 bg-indigo-500/10 blur-[100px] rounded-full"></div>

            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
                <div className="text-center space-y-4">
                    <div className="size-24 mx-auto rounded-[2rem] bg-white p-1 shadow-2xl overflow-hidden flex items-center justify-center">
                        <div className="w-full h-full bg-emerald-500 flex items-center justify-center text-white rounded-[1.8rem]">
                            <span className="material-symbols-outlined text-4xl">vpn_key</span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Restablecer</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Crea tu nueva contraseña</p>
                    </div>
                </div>

                <form onSubmit={handleUpdatePassword} className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-800 shadow-3xl space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="block ml-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nueva Contraseña</label>
                            <input
                                type="password"
                                required
                                autoFocus
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 focus:border-emerald-500 rounded-2xl outline-none transition-all text-white font-medium placeholder:text-slate-600"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block ml-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Confirmar Contraseña</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 focus:border-emerald-500 rounded-2xl outline-none transition-all text-white font-medium placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-rose-500 text-center text-xs font-bold bg-rose-500/10 py-3 px-4 rounded-xl animate-shake border border-rose-500/20">
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="text-emerald-400 text-center text-xs font-bold bg-emerald-500/10 py-3 px-4 rounded-xl border border-emerald-500/20">
                            {successMsg}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading || !!successMsg}
                            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="animate-spin size-5 border-b-2 border-white rounded-full"></div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">save</span>
                                    Actualizar
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="pt-4 text-center">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-[10px] text-slate-500 hover:text-white uppercase tracking-widest transition-colors font-bold flex items-center justify-center gap-1 mx-auto"
                    >
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        Volver al inicio
                    </button>
                </div>
            </div>
        </div>
    );
};
