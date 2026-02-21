'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useBusiness } from '@/app/hooks/useBusiness';

export default function LoginPage() {
    const [isRegister, setIsRegister] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signUp } = useAuth();
    // const { business, loading: businessLoading } = useBusiness();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        if (isRegister) {
            const result = await signUp(email, password, fullName, {
                // Business will be configured later in Desktop App
                business_name: 'Pending Setup',
                business_type: 'pending'
            });
            if (result.success) {
                // Redirect immediately as email confirmation is disabled
                // The AuthContext will pick up the new session, but we force navigation
                window.location.href = '/dashboard';
            } else {
                setError(result.error || 'Error al registrarse');
            }
        } else {
            const result = await login(email, password);
            if (!result.success) {
                setError(result.error || 'Credenciales incorrectas');
            }
        }
        setLoading(false);
    };

    // Non-blocking loading
    // if (businessLoading) return <Loading /> -- Removed to prevent hang

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-primary/10 blur-[120px] rounded-full"></div>

            <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in zoom-in duration-700">
                <div className="text-center space-y-6">
                    <div className="size-24 mx-auto rounded-[2rem] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-primary/40 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-500"></div>
                        <span className="material-symbols-outlined text-5xl relative z-10">
                            {isRegister ? 'rocket_launch' : 'shield_person'}
                        </span>
                    </div>
                    <div className="flex flex-col items-center">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                            {isRegister ? 'Únete a MagnaSoft' : 'Panel Maestro'}
                        </h1>
                        <p className="text-slate-500 font-bold tracking-[0.3em] uppercase text-[10px] mt-2">
                            {isRegister ? 'Comienza tu expansión hoy' : 'Control Central de Ecosistema'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-slate-900/50 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl border border-white/5 space-y-5">
                    {isRegister && (
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                                Nombre Completo
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Tu nombre"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 focus:border-primary rounded-2xl outline-none transition-all text-white font-medium placeholder:text-slate-600"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            Correo Electrónico
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="email@magnasoft.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 focus:border-primary rounded-2xl outline-none transition-all text-white font-medium placeholder:text-slate-600"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 focus:border-primary rounded-2xl outline-none transition-all text-white font-medium placeholder:text-slate-600"
                        />
                    </div>

                    {/* Business Data Fields Removed for simplified onboarding */}

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
                        disabled={loading || !email || !password}
                        className="w-full py-5 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black shadow-2xl shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[20px]">
                                    {isRegister ? 'send' : 'login'}
                                </span>
                                {isRegister ? 'Enviar Solicitud' : 'Ingresar'}
                            </>
                        )}
                    </button>

                    <div className="pt-4 text-center">
                        <button
                            type="button"
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
                        >
                            {isRegister ? 'Ya manejo MagnaSoft → Iniciar' : 'Quiero registrar mi negocio →'}
                        </button>
                    </div>
                </form>

                <p className="text-center text-slate-700 text-[9px] font-black uppercase tracking-[0.3em]">
                    © 2026 MagnaSoft Global - Secured Session
                </p>
            </div>
        </div>
    );
}
