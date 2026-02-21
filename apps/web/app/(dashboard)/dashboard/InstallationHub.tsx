'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface InstallationHubProps {
    user: any;
}

type CodeState = {
    code: string | null;
    status: 'loading' | 'pending' | 'used' | 'not_found';
    businessName?: string;
    redeemedAt?: string;
};

export default function InstallationHub({ user }: InstallationHubProps) {
    const [activationData, setActivationData] = useState<CodeState>({
        code: null,
        status: 'loading'
    });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchActivationCode = async () => {
            if (!user?.id) return;

            try {
                // Fetch code and related business info if used
                const { data, error } = await supabase
                    .from('activation_codes')
                    .select(`
                        code, 
                        status, 
                        redeemed_at, 
                        business:business_id(name)
                    `)
                    .eq('user_id', user.id)
                    .single();

                if (error) {
                    // Start polling or just set not found if it's a permanent error
                    // For now, if not found, it means admin hasn't approved or trigger hasn't run
                    console.warn('Code fetch error or empty:', error);
                    setActivationData({ code: null, status: 'not_found' });
                    return;
                }

                if (data) {
                    setActivationData({
                        code: data.code,
                        status: data.status as 'pending' | 'used',
                        // Handle generic join result which might be array or object
                        businessName: Array.isArray(data.business) ? data.business[0]?.name : (data.business as any)?.name,
                        redeemedAt: data.redeemed_at
                    });
                }
            } catch (err) {
                console.error('Unexpected error fetching code:', err);
                setActivationData({ code: null, status: 'not_found' });
            }
        };

        fetchActivationCode();

        // Real-time subscription could go here to auto-update when admin approves
    }, [user?.id]);

    const handleCopySerial = async () => {
        if (!activationData.code) return;
        try {
            await navigator.clipboard.writeText(activationData.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleDownload = (platform: 'windows' | 'mac') => {
        // Redirigir temporalmente a la carpeta de Google Drive proporcionada
        window.open('https://drive.google.com/drive/folders/12snedBuJQUK7tbZ-oSI22xfUj17wKQVu?usp=sharing', '_blank');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full space-y-8 animate-in fade-in zoom-in duration-500">

                {/* Hero Section */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold uppercase tracking-wider animate-in slide-in-from-top-4 duration-700">
                        <span className="material-symbols-outlined !text-[20px]">verified</span>
                        Cuenta Verificada
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-none animate-in slide-in-from-top-6 duration-700 delay-100">
                        Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Magnasoft</span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto animate-in slide-in-from-top-8 duration-700 delay-200">
                        {activationData.status === 'used'
                            ? 'Tu negocio está activo y operando correctamente.'
                            : 'Tu serial de instalación está listo. Descarga la aplicación de escritorio para activar tu negocio.'
                        }
                    </p>
                </div>

                {/* Serial Card - Dynamic State */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 md:p-12 space-y-6 animate-in slide-in-from-bottom-4 duration-700 delay-300">

                    {activationData.status === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-500 font-bold animate-pulse">Buscando licencia asignada...</p>
                        </div>
                    )}

                    {activationData.status === 'not_found' && (
                        <div className="text-center py-6">
                            <div className="inline-flex p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
                                <span className="material-symbols-outlined text-amber-600 !text-4xl">hourglass_top</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Generando Licencia</h2>
                            <p className="text-slate-500 mt-2">Tu cuenta ha sido aprobada, pero aún estamos generando tu serial único. Por favor recarga la página en unos segundos.</p>
                        </div>
                    )}

                    {activationData.status === 'pending' && (
                        <>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 !text-3xl">key</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Tu Serial de Instalación</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Copia este código para activar la app</p>
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity blur-xl"></div>
                                <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 group-hover:border-primary transition-colors">
                                    <code className="text-xl md:text-3xl font-mono font-black text-slate-900 dark:text-white break-all select-all tracking-wider text-center block">
                                        {activationData.code}
                                    </code>
                                </div>
                            </div>

                            <button
                                onClick={handleCopySerial}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/30 hover:shadow-emerald-600/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <span className="material-symbols-outlined !text-[24px]">
                                    {copied ? 'check_circle' : 'content_copy'}
                                </span>
                                {copied ? '¡Serial Copiado!' : 'Copiar Serial'}
                            </button>
                        </>
                    )}

                    {activationData.status === 'used' && (
                        <div className="text-center py-6">
                            <div className="inline-flex p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-6">
                                <span className="material-symbols-outlined text-blue-600 !text-5xl">verified_user</span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                                ✅ Licencia Activada
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">
                                Negocio vinculado: <span className="text-primary font-bold">{activationData.businessName || 'Tu Negocio'}</span>
                            </p>
                            {activationData.redeemedAt && (
                                <p className="text-xs text-slate-400 mt-4 uppercase tracking-widest">
                                    Activado el: {new Date(activationData.redeemedAt).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Download Section (Only show if pending or loading/not_found - if used, maybe hide or keep as utility?) */}
                {/* Keeping it visible as user might need to re-download */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 md:p-12 space-y-6 animate-in slide-in-from-bottom-6 duration-700 delay-400">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 !text-3xl">download</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Descarga Magnasoft POS</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Elige tu plataforma</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleDownload('windows')}
                            className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                        >
                            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 !text-2xl">computer</span>
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="font-bold text-slate-900 dark:text-white">Windows</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Windows 10 o superior</p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">chevron_right</span>
                        </button>

                        <button
                            onClick={() => handleDownload('mac')}
                            className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                        >
                            <div className="h-12 w-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 !text-2xl">laptop_mac</span>
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="font-bold text-slate-900 dark:text-white">macOS</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">macOS 11 o superior</p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">chevron_right</span>
                        </button>
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-3xl border border-blue-200 dark:border-blue-800 p-8 md:p-12 space-y-6 animate-in slide-in-from-bottom-8 duration-700 delay-500">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">info</span>
                        Próximos Pasos
                    </h3>

                    <ol className="space-y-4">
                        {[
                            { num: 1, text: 'Descarga e instala Magnasoft POS en tu computadora' },
                            { num: 2, text: 'Abre la aplicación e inicia sesión con tu cuenta' },
                            { num: 3, text: 'Ingresa el serial de instalación cuando te lo solicite' },
                            { num: 4, text: 'Configura tu negocio y comienza a vender' }
                        ].map((step) => (
                            <li key={step.num} className="flex items-start gap-4">
                                <div className="flex-shrink-0 h-8 w-8 bg-primary text-white rounded-full flex items-center justify-center font-black text-sm">
                                    {step.num}
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 font-medium pt-0.5">{step.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>

            </div>
        </div>
    );
}
