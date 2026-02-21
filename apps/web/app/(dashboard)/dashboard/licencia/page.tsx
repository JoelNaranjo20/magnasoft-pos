'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface License {
    code: string;
    status: string;
    hwid: string | null;
    activated_at: string | null;
}

export default function LicensePage() {
    const { profile } = useAuth();
    const [license, setLicense] = useState<License | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    // Version management
    const CURRENT_VERSION = '2.4.0';
    const INSTALLER_FILENAME = `POS-lavadero-setup-v${CURRENT_VERSION}.exe`;

    useEffect(() => {
        const fetchLicense = async () => {
            if (!profile?.business_id) return;

            try {
                const { data, error } = await supabase
                    .from('activation_codes')
                    .select('code, status, hwid, activated_at')
                    .eq('business_id', profile.business_id)
                    .maybeSingle();

                if (error) throw error;
                setLicense(data);
            } catch (error) {
                console.error('Error fetching license:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLicense();
    }, [profile]);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            // Get public URL from Supabase Storage
            const { data } = supabase.storage
                .from('installers')
                .getPublicUrl(INSTALLER_FILENAME);

            if (data?.publicUrl) {
                // Create temporary link and trigger download
                const link = document.createElement('a');
                link.href = data.publicUrl;
                link.download = INSTALLER_FILENAME;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert('Error: No se pudo obtener el enlace de descarga');
            }
        } catch (error) {
            console.error('Download error:', error);
            alert('Error al descargar el instalador');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Mi Licencia y Software</h1>
                <p className="text-slate-500 dark:text-slate-400">Gestiona la activación de tu punto de venta y descarga el software oficial.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* License Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-3xl">vpn_key</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Código de Activación</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Serial del Negocio</p>
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-hover:bg-primary/10 transition-all"></div>
                        <div className="relative bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center gap-3">
                            {loading ? (
                                <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 animate-pulse rounded"></div>
                            ) : license ? (
                                <>
                                    <span className="text-2xl font-mono font-black text-primary tracking-widest select-all">
                                        {license.code}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={`size-2 rounded-full ${license.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                            {license.status === 'active' ? 'Activado en un PC' : 'Pendiente de Activación'}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm font-bold text-rose-500 text-center">
                                    No tienes un serial asignado.<br />
                                    <span className="text-xs text-slate-400 font-medium">Contacta al administrador para obtener uno.</span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-widest">Dispositivos</span>
                            <span className="font-black text-slate-900 dark:text-white">1 / 1</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-widest">Hardware ID</span>
                            <span className="font-mono text-slate-500">{license?.hwid ? license.hwid.slice(0, 12) + '...' : 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Download Card */}
                <div className="bg-primary rounded-3xl p-8 text-white shadow-xl shadow-primary/30 flex flex-col justify-between overflow-hidden relative group">
                    <div className="absolute top-0 right-0 size-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>

                    <div className="relative space-y-4">
                        <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl">desktop_windows</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Descargar POS v{CURRENT_VERSION}</h3>
                            <p className="text-white/70 text-sm font-medium">Aplicación de escritorio optimizada para Windows.</p>
                        </div>
                    </div>

                    <div className="relative pt-8 space-y-4">
                        <ul className="space-y-2">
                            {[
                                'Control de caja en tiempo real',
                                'Impresión de tickets térmica',
                                'Funciona sin internet (offline)',
                                'Estadísticas de servicios'
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs font-bold">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="w-full bg-white text-primary py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-black/10 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {downloading ? (
                                <>
                                    <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                    Descargando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">download</span>
                                    Descargar Instalador
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Help Section */}
            <div className="bg-slate-100 dark:bg-slate-800/30 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                <span className="material-symbols-outlined text-slate-400">info</span>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter mr-1">Instrucciones:</span>
                    Copia tu serial, instala el programa y pégalo cuando el asistente lo solicite por primera vez.
                </p>
            </div>
        </div>
    );
}
