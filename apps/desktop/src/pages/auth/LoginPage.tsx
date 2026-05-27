// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@shared/store/useAuthStore';

export const LoginPage = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [fullName, setFullName] = useState('');
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
            
            if (isRegister) {
                if (!fullName.trim()) {
                    throw new Error('Por favor, ingresa tu nombre completo.');
                }

                // Register flow
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email: cleanEmail,
                    password,
                    options: {
                        data: {
                            full_name: fullName.trim(),
                            business_name: 'Pending Setup',
                            business_type: 'pending'
                        }
                    }
                });

                if (signUpError) throw signUpError;

                if (data.user) {
                    // Save credentials for auto-login/fill
                    if (window.electronAPI) {
                        await window.electronAPI.storageSet('sv_login_email', cleanEmail);
                        await window.electronAPI.storageSet('sv_login_password', password);
                    } else {
                        localStorage.setItem('sv_login_email', cleanEmail);
                        localStorage.setItem('sv_login_password', password);
                    }
                    
                    setSuccessMsg('¡Registro exitoso! Iniciando sesión...');
                    // Automatically check and load session
                    await useAuthStore.getState().checkSession();
                }
            } else {
                // Login flow
                const { data, error: authError } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password
                });

                if (authError) throw authError;

                if (data.user) {
                    if (window.electronAPI) {
                        await window.electronAPI.storageSet('sv_login_email', cleanEmail);
                        await window.electronAPI.storageSet('sv_login_password', password);
                    } else {
                        localStorage.setItem('sv_login_email', cleanEmail);
                        localStorage.setItem('sv_login_password', password);
                    }

                    await useAuthStore.getState().checkSession();
                }
            }
        } catch (err: any) {
            console.error('Authentication error:', err);
            let message = '';
            if (typeof err === 'string') {
                message = err;
            } else if (err?.message) {
                message = err.message;
            } else if (err?.error_description) {
                message = err.error_description;
            } else {
                message = 'Error en la autenticación';
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
        <div className="min-h-screen bg-[#070b19] flex items-center justify-center p-6 relative overflow-hidden font-display select-none">
            {/* Ambient Background Glowing Blobs */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 size-[450px] bg-primary/20 blur-[120px] rounded-full animate-glow-slow z-0"></div>
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 size-[450px] bg-indigo-600/20 blur-[130px] rounded-full animate-glow-slower z-0"></div>

            <div className="w-full max-w-lg space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* Branding / Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex size-20 rounded-[2rem] bg-gradient-to-br from-primary via-blue-600 to-indigo-600 p-0.5 shadow-2xl shadow-primary/30 items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        <div className="w-full h-full bg-[#0d1527] flex items-center justify-center rounded-[1.95rem]">
                            <span className="material-symbols-outlined text-4xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">
                                {isRegister ? 'rocket_launch' : 'shield_person'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold font-title text-white uppercase tracking-tight leading-none">
                            {isRegister ? 'Registrar Negocio' : 'Bienvenido'}
                        </h2>
                        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-[0.25em] mt-1.5">
                            {isRegister ? 'Crea tu cuenta en MagnaSoft' : 'Iniciar Sesión'}
                        </p>
                    </div>
                </div>

                {/* Main Card */}
                <form onSubmit={handleLogin} className="glass-panel p-10 rounded-[3rem] shadow-3xl space-y-6">
                    <div className="space-y-4">
                        
                        {/* Full Name field (Only shown for Sign Up) */}
                        {isRegister && (
                            <div className="space-y-1.5 animate-in fade-in duration-300">
                                <label className="block ml-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                    Nombre Completo
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="Tu nombre y apellido"
                                    className="w-full px-5 py-4.5 glass-input rounded-2xl outline-none placeholder:text-slate-600 text-sm font-medium"
                                />
                            </div>
                        )}

                        {/* Email Input */}
                        <div className="space-y-1.5">
                            <label className="block ml-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                required
                                autoFocus={!isRegister}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="usuario@ejemplo.com"
                                className="w-full px-5 py-4.5 glass-input rounded-2xl outline-none placeholder:text-slate-600 text-sm font-medium"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="space-y-1.5">
                            <label className="block ml-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-5 py-4.5 glass-input rounded-2xl outline-none placeholder:text-slate-600 text-sm font-medium pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors flex items-center justify-center h-full"
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Forgot Password Link (Only for Login) */}
                    {!isRegister && (
                        <div className="flex justify-end mt-1">
                            <button
                                type="button"
                                onClick={handleResetPassword}
                                disabled={loading}
                                className="text-[10px] font-semibold text-primary hover:text-cyan-400 transition-colors uppercase tracking-widest disabled:opacity-50"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    )}

                    {/* Notification Messages */}
                    {error && (
                        <div className="text-rose-400 text-center text-xs font-medium bg-rose-500/10 border border-rose-500/20 py-3.5 px-4 rounded-2xl animate-shake">
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="text-emerald-400 text-center text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 py-3.5 px-4 rounded-2xl">
                            {successMsg}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-600/95 text-white rounded-[1.5rem] font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="animate-spin size-5 border-b-2 border-white rounded-full mx-auto"></div>
                        ) : (
                            isRegister ? 'Registrar Negocio' : 'INGRESAR AL SISTEMA'
                        )}
                    </button>

                    {/* Register Toggle */}
                    <div className="pt-2 text-center border-t border-slate-800/60 mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setError('');
                                setSuccessMsg('');
                            }}
                            className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
                        >
                            {isRegister ? 'Ya tengo cuenta → Iniciar Sesión' : '¿Nuevo negocio? → Regístralo aquí'}
                        </button>
                    </div>

                    <div className="text-center">
                        <p className="text-[9px] text-slate-700 uppercase tracking-widest">
                            Magnasoft POS System v2.0
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};
