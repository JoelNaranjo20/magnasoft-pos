// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@shared/store/useAuthStore';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const loadCredentials = async () => {
            if (window.electronAPI) {
                const svEmail = await window.electronAPI.storageGet('sv_login_email');
                const svPass = await window.electronAPI.storageGet('sv_login_password');
                if (svEmail) setEmail(svEmail as string);
                if (svPass) setPassword(svPass as string);
            } else {
                const svEmail = localStorage.getItem('sv_login_email');
                const svPass = localStorage.getItem('sv_login_password');
                if (svEmail) setEmail(svEmail);
                if (svPass) setPassword(svPass);
            }
        };
        loadCredentials();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const cleanEmail = email.trim();
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password
            });

            if (authError) throw authError;

            if (data.user) {
                // Persistent storage of credentials
                if (window.electronAPI) {
                    await window.electronAPI.storageSet('sv_login_email', cleanEmail);
                    await window.electronAPI.storageSet('sv_login_password', password);
                } else {
                    localStorage.setItem('sv_login_email', cleanEmail);
                    localStorage.setItem('sv_login_password', password);
                }

                // Successful login, update global state
                await useAuthStore.getState().checkSession();
                // The App interaction will automatically redirect due to !user becoming false
            }
        } catch (err: any) {
            console.error('Login error:', err);
            let message = '';
            if (typeof err === 'string') {
                message = err;
            } else if (err?.message) {
                message = err.message;
            } else if (err?.error_description) {
                message = err.error_description;
            } else {
                message = 'Error al iniciar sesión';
            }

            if (message.toLowerCase().includes('invalid login credentials')) {
                message = 'Credenciales de acceso inválidas. Verifica tu correo y contraseña.';
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            setError('Por favor, ingresa tu correo para enviar el enlace de recuperación.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://magnasoft-pos-web.vercel.app/reset-password'
            });
            if (resetError) throw resetError;
            setSuccessMsg('Enlace enviado. Revisa tu bandeja de entrada o spam.');
            setError('');
        } catch (err: any) {
            setError(err.message || 'No se pudo enviar el correo de recuperación.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-4">
                    <div className="size-24 mx-auto rounded-[2rem] bg-white p-1 shadow-2xl overflow-hidden flex items-center justify-center">
                        <div className="w-full h-full bg-sky-500 flex items-center justify-center text-white rounded-[1.8rem]">
                            <span className="material-symbols-outlined text-4xl">lock_open</span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Bienvenido</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Iniciar Sesión</p>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-800 shadow-3xl space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="block ml-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</label>
                            <input
                                type="email"
                                required
                                autoFocus
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="usuario@ejemplo.com"
                                className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 focus:border-sky-500 rounded-2xl outline-none transition-all text-white font-medium placeholder:text-slate-600"
                            />
                        </div>
                        <div className="space-y-1 relative">
                            <label className="block ml-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 focus:border-sky-500 rounded-2xl outline-none transition-all text-white font-medium placeholder:text-slate-600 pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors flex items-center justify-center h-full"
                                >
                                    <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-2">
                        <button
                            type="button"
                            onClick={handleResetPassword}
                            disabled={loading}
                            className="text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-widest disabled:opacity-50"
                        >
                            ¿Cambiar Contraseña?
                        </button>
                    </div>

                    {error && (
                        <div className="text-rose-500 text-center text-xs font-bold bg-rose-500/10 py-3 px-4 rounded-xl animate-shake">
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="text-emerald-400 text-center text-xs font-bold bg-emerald-500/10 py-3 px-4 rounded-xl">
                            {successMsg}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-sky-500 hover:bg-sky-400 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-sky-500/20 transition-all active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="animate-spin size-5 border-b-2 border-white rounded-full mx-auto"></div>
                        ) : (
                            'INGRESAR'
                        )}
                    </button>

                    <div className="pt-2 text-center">
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                            Magnasoft V2.0 System
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};
