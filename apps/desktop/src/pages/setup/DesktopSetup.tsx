// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabase";
import { useAuthStore } from '@shared/store/useAuthStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { getPresetModules } from '../../shared/modules';

type BusinessType = 'automotive' | 'retail' | 'restaurant' | 'barbershop';

export const DesktopSetup = () => {
    const [serial, setSerial] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [businessType, setBusinessType] = useState<BusinessType>('retail');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hwid, setHwid] = useState(''); // State for Hardware ID

    const { user, checkSession } = useAuthStore((state) => state);

    // 1. Fetch HWID on mount
    useEffect(() => {
        const fetchHWID = async () => {
            if (window.electronAPI?.getHWID) {
                try {
                    const id = await window.electronAPI.getHWID();
                    console.log('Setup: Detected HWID:', id);
                    setHwid(id);
                } catch (e) {
                    console.error('Setup: Failed to get HWID', e);
                }
            }
        };
        fetchHWID();
    }, []);

    // Derives initial module config from INDUSTRY_PRESETS (single source of truth)
    const getInitialConfig = (type: BusinessType) => getPresetModules(type);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!serial.trim() || !businessName.trim()) {
            setError('Todos los campos son obligatorios');
            return;
        }

        setLoading(true);

        try {
            // 2. RPC: Create Business & Link Profile (Atomic Transaction)
            // Fixes RLS Paradox: We can't insert/select business before linking, 
            // and we can't link before getting the ID. RPC does both as Super User.
            // 2. RPC: Activate Business via Pre-generated Code
            // This now links the user to the business via the activation code table
            const { data: business, error: rpcError } = await supabase.rpc('activate_business_with_code', {
                p_code: serial,
                p_hardware_id: hwid || null,
                p_business_name: businessName
            });

            if (rpcError) {
                console.error('RPC Error:', rpcError);
                // Pass the specific error message from SQL (e.g. "Serial inválido")
                throw new Error(rpcError.message);
            }

            // 3. Post-Creation Update: Set Type & Config
            // Once linked via RPC, we are the OWNER, so we have RLS permission to UPDATE.
            const { error: updateError } = await supabase
                .from('business')
                .update({
                    business_type: businessType,
                    config: getInitialConfig(businessType),
                    status: 'active'
                })
                .eq('id', business.id);

            if (updateError) {
                console.error('Config Update Error:', updateError);
                // Non-critical: Business exists, we can proceed or warn.
            }

            console.log('✅ Business created successfully. Reloading session...');

            // Force Full Session Reload: This refreshes user, profile, and business in one call
            // Replaces manual setBusiness() and ensures we have the latest state from DB
            await checkSession();

            // Note: If checkSession doesn't auto-navigate, we navigate manually:
            // navigate('/admin/dashboard');

        } catch (err: any) {
            setError(err.message || 'Error al activar el negocio. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">

                {/* Header */}
                <div className="text-center mb-12 space-y-4 animate-in fade-in slide-in-from-top-6 duration-700">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-3xl shadow-xl shadow-primary/30 mb-4">
                        <span className="material-symbols-outlined !text-5xl text-white">rocket_launch</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                        Configuración <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Inicial</span>
                    </h1>

                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        Activa tu instalación y configura tu negocio para comenzar a vender
                    </p>
                </div>

                {/* Setup Form */}
                <form onSubmit={handleActivate} className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">

                    {/* Serial Input */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            <span className="material-symbols-outlined !text-[20px] text-primary">key</span>
                            Serial de Instalación
                        </label>
                        <input
                            type="text"
                            value={serial}
                            onChange={(e) => setSerial(e.target.value)}
                            placeholder="Pega tu serial aquí"
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-mono font-bold focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all outline-none"
                            disabled={loading}
                        />
                    </div>

                    {/* Business Name */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            <span className="material-symbols-outlined !text-[20px] text-primary">storefront</span>
                            Nombre del Negocio
                        </label>
                        <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Ej: Barbería El Corte"
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all outline-none"
                            disabled={loading}
                        />
                    </div>

                    {/* Business Type */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            <span className="material-symbols-outlined !text-[20px] text-primary">category</span>
                            Tipo de Negocio
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { value: 'automotive', label: 'Taller Automotriz', icon: 'directions_car' },
                                { value: 'retail', label: 'Retail / Tienda', icon: 'shopping_cart' },
                                { value: 'restaurant', label: 'Restaurante', icon: 'restaurant' },
                                { value: 'barbershop', label: 'Barbería / Salón', icon: 'content_cut' }
                            ].map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setBusinessType(type.value as BusinessType)}
                                    disabled={loading}
                                    className={`p-6 rounded-2xl border-2 transition-all ${businessType === type.value
                                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl ${businessType === type.value ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-900'
                                        } flex items-center justify-center mb-3 mx-auto transition-all`}>
                                        <span className={`material-symbols-outlined !text-2xl ${businessType === type.value ? 'text-white' : 'text-slate-400'
                                            }`}>
                                            {type.icon}
                                        </span>
                                    </div>
                                    <p className={`text-sm font-bold ${businessType === type.value ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                                        }`}>
                                        {type.label}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* HWID Indicator (Optional but good for debug) */}
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                            Device ID: {hwid || 'Detecting...'}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <span className="material-symbols-outlined !text-[24px] text-rose-600 dark:text-rose-400 flex-shrink-0">error</span>
                            <p className="text-sm font-bold text-rose-900 dark:text-rose-200">{error}</p>
                        </div>
                    )}

                    {/* Activate Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {loading ? (
                            <>
                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                Activando...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined !text-[28px]">check_circle</span>
                                Activar Negocio
                            </>
                        )}
                    </button>

                    {/* Info Note */}
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-center text-slate-500 dark:text-slate-400 font-medium">
                            <span className="material-symbols-outlined !text-[14px] align-middle mr-1">info</span>
                            Al activar, tu negocio se configurará automáticamente según el tipo seleccionado
                        </p>
                    </div>
                </form>

            </div>
        </div>
    );
};
