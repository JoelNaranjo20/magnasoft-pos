import { useAutoUpdater } from '../hooks/useAutoUpdater';
import { useState, useEffect } from 'react';

export function UpdateNotification() {
    const { updateState, quitAndInstall } = useAutoUpdater();
    const [dismissed, setDismissed] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [restartCountdown, setRestartCountdown] = useState<number | null>(null);

    // Show modal when update is ready to install
    useEffect(() => {
        if (updateState.status === 'downloaded') {
            setShowModal(true);
            setDismissed(false);
        }
    }, [updateState.status]);

    // 60-second countdown before auto-restart (only when modal is open)
    useEffect(() => {
        if (!showModal || updateState.status !== 'downloaded') return;
        setRestartCountdown(60);
        const interval = setInterval(() => {
            setRestartCountdown(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    quitAndInstall();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [showModal]);

    // ─── Minimal badge during download ───────────────────────────────────
    if (
        !dismissed &&
        (updateState.status === 'downloading' || updateState.status === 'available' || updateState.status === 'checking')
    ) {
        return (
            <div className="fixed bottom-4 right-4 z-[9000] flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-md shadow-2xl text-white text-sm animate-in slide-in-from-bottom-4 duration-500">
                {updateState.status === 'checking' && (
                    <>
                        <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                        <span className="font-medium text-slate-300">Buscando actualizaciones...</span>
                    </>
                )}
                {(updateState.status === 'available' || updateState.status === 'downloading') && (
                    <>
                        <div className="relative w-8 h-8 flex items-center justify-center">
                            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="3" />
                                <circle
                                    cx="18" cy="18" r="14" fill="none"
                                    stroke="#6366f1" strokeWidth="3"
                                    strokeDasharray={`${(updateState.percent ?? 0) * 0.879} 100`}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dasharray 0.3s ease' }}
                                />
                            </svg>
                            <span className="absolute text-[8px] font-black text-indigo-300">{updateState.percent ?? 0}%</span>
                        </div>
                        <div>
                            <p className="font-bold text-white text-xs">Descargando v{updateState.version}...</p>
                            <p className="text-[10px] text-slate-400 font-medium">{updateState.percent ?? 0}% completado</p>
                        </div>
                        {/* Progress bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${updateState.percent ?? 0}%` }}
                            />
                        </div>
                    </>
                )}
                <button
                    onClick={() => setDismissed(true)}
                    className="ml-1 p-1 rounded-lg hover:bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                >
                    <span className="material-symbols-outlined !text-[16px]">close</span>
                </button>
            </div>
        );
    }

    // ─── Full update ready modal ──────────────────────────────────────────
    if (showModal && updateState.status === 'downloaded') {
        const progress = restartCountdown !== null ? restartCountdown / 60 : 0;
        const dashArray = progress * 150.8;

        return (
            <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-0 perspective-1000">
                {/* Backdrop blur profundo */}
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500" />

                {/* Floating Modal */}
                <div className="relative w-full max-w-md bg-white dark:bg-slate-800 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_0_80px_-15px_rgba(99,102,241,0.4)] border border-white/20 dark:border-white/10 overflow-hidden animate-in slide-in-from-bottom-12 sm:zoom-in-90 duration-700 ease-out-expo ring-1 ring-white/50 dark:ring-white/10">

                    {/* Animated Header */}
                    <div className="relative h-44 overflow-hidden flex flex-col items-center justify-center bg-slate-900">
                        {/* Animated Mesh Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 opacity-90 mix-blend-screen" />
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                        
                        {/* Glowing Orbs */}
                        <div className="absolute -top-12 -left-12 w-40 h-40 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" />
                        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" style={{ animationDelay: '1s' }} />

                        <div className="relative z-10 flex flex-col items-center transform translate-y-3">
                            <div className="relative">
                                {/* Ripple glow effect */}
                                <div className="absolute inset-0 bg-white rounded-[1.5rem] blur-xl opacity-30 animate-ping" />
                                <div className="relative w-16 h-16 bg-slate-200 dark:bg-slate-700 backdrop-blur-xl border border-white/30 rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                                    <span className="material-symbols-outlined text-white !text-[34px] drop-shadow-lg">rocket_launch</span>
                                </div>
                            </div>
                        </div>

                        {/* Wave decoration bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-slate-900/90 to-transparent" />
                    </div>

                    {/* Content Body */}
                    <div className="px-8 pt-6 pb-8 text-center relative z-20">
                        <div className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-500/20 rounded-full mb-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Actualización Lista</p>
                        </div>

                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                            Versión <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">v{updateState.version}</span>
                        </h2>
                        
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 px-4">
                            Se ha instalado la última versión con nuevas funcionalidades y mejoras. Reinicia para aplicarlas.
                        </p>

                        {/* Interactive Action Area */}
                        <div className="flex flex-col gap-4">
                            {/* Main CTA */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-500 mt-2" />
                                <button
                                    onClick={quitAndInstall}
                                    className="relative w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 dark:shadow-white/20 transition-all active:scale-[0.98] flex items-center justify-between px-6 overflow-hidden"
                                >
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-black/10 to-transparent skew-x-12" />
                                    
                                    <span className="flex items-center gap-3">
                                        <span className="material-symbols-outlined !text-[24px]">power_settings_new</span>
                                        Reiniciar Ahora
                                    </span>

                                    {/* Minimal Inline Countdown */}
                                    {restartCountdown !== null && (
                                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 dark:bg-black/10 px-3 py-1.5 rounded-xl border border-white/10 dark:border-black/10">
                                            <div className="relative w-5 h-5 flex items-center justify-center">
                                                <svg className="absolute w-5 h-5 -rotate-90" viewBox="0 0 56 56">
                                                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="8" />
                                                    <circle
                                                        cx="28" cy="28" r="24" fill="none"
                                                        stroke="currentColor" strokeWidth="8"
                                                        strokeDasharray={`${dashArray} 150.8`}
                                                        strokeLinecap="round"
                                                        style={{ transition: 'stroke-dasharray 1s linear' }}
                                                    />
                                                </svg>
                                            </div>
                                            <span className="text-sm tabular-nums tracking-tighter">{restartCountdown}s</span>
                                        </div>
                                    )}
                                </button>
                            </div>

                            {/* Secondary Action */}
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setRestartCountdown(null);
                                }}
                                className="w-full py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                Recordarme más tarde
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error toast
    if (!dismissed && updateState.status === 'error') {
        return (
            <div className="fixed bottom-4 right-4 z-[9000] flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-950/90 border border-rose-500/30 backdrop-blur-md shadow-xl text-white text-sm animate-in slide-in-from-bottom-4 duration-500">
                <span className="material-symbols-outlined !text-[18px] text-rose-400">error</span>
                <p className="text-xs font-medium text-rose-200">Error de actualización</p>
                <button
                    onClick={() => setDismissed(true)}
                    className="ml-1 p-1 rounded-lg hover:bg-slate-100 dark:bg-slate-800 text-rose-400 transition-colors"
                >
                    <span className="material-symbols-outlined !text-[14px]">close</span>
                </button>
            </div>
        );
    }

    return null;
}
