// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabase";
import { useAuthStore } from '@shared/store/useAuthStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { getPresetModules } from '../../shared/modules';

type BusinessType = 'automotive' | 'retail' | 'restaurant' | 'barbershop';

export const DesktopSetup = () => {
    const [businessName, setBusinessName] = useState('');
    const [businessType, setBusinessType] = useState<BusinessType>('retail');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { user, checkSession } = useAuthStore((state) => state);

    // Derives initial module config from INDUSTRY_PRESETS (single source of truth)
    const getInitialConfig = (type: BusinessType) => getPresetModules(type);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!businessName.trim()) {
            setError('El nombre del negocio es obligatorio');
            return;
        }

        setLoading(true);

        try {
            // RPC: Create Business & Link Profile (Atomic Transaction) without Serial
            const { data: business, error: rpcError } = await supabase.rpc('create_business_without_serial', {
                p_name: businessName
            });

            if (rpcError) {
                console.error('RPC Error:', rpcError);
                throw new Error(rpcError.message);
            }

            // Post-Creation Update: Set Type & Config
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
            }

            console.log('✅ Business created successfully. Reloading session...');

            // Force Full Session Reload: This refreshes user, profile, and business in one call
            await checkSession();

        } catch (err: any) {
            setError(err.message || 'Error al configurar el negocio. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="min-h-screen bg-[#070b19] flex items-center justify-center p-6 relative overflow-hidden font-display select-none">
            {/* Ambient Background Glowing Blobs */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 size-[450px] bg-primary/20 blur-[120px] rounded-full animate-glow-slow z-0"></div>
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 size-[450px] bg-indigo-600/20 blur-[130px] rounded-full animate-glow-slower z-0"></div>

            <div className="w-full max-w-2xl space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Branding / Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex size-20 rounded-[2rem] bg-gradient-to-br from-primary via-blue-600 to-indigo-600 p-0.5 shadow-2xl shadow-primary/30 items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        <div className="w-full h-full bg-[#0d1527] flex items-center justify-center rounded-[1.95rem]">
                            <span className="material-symbols-outlined text-4xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">
                                rocket_launch
                            </span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold font-title text-white uppercase tracking-tight leading-none">
                            Configuración Inicial
                        </h2>
                        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-[0.25em] mt-1.5">
                            Configura tu negocio para comenzar a vender
                        </p>
                    </div>
                </div>

                {/* Setup Form */}
                <form onSubmit={handleActivate} className="glass-panel p-10 rounded-[3rem] shadow-3xl space-y-8">
                    {/* Business Name */}
                    <div className="space-y-1.5">
                        <label className="block ml-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                            Nombre del Negocio
                        </label>
                        <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Ej: Barbería El Corte"
                            className="w-full px-5 py-4.5 glass-input rounded-2xl outline-none placeholder:text-slate-650 text-sm font-medium"
                            disabled={loading}
                        />
                    </div>

                    {/* Business Type */}
                    <div className="space-y-3">
                        <label className="block ml-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                            Tipo de Negocio
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { value: 'automotive', label: 'Taller Automotriz', icon: 'directions_car' },
                                { value: 'retail', label: 'Retail / Tienda', icon: 'shopping_cart' },
                                { value: 'restaurant', label: 'Restaurante', icon: 'restaurant' },
                                { value: 'barbershop', label: 'Barbería / Salón', icon: 'content_cut' }
                            ].map((type) => {
                                const isSelected = businessType === type.value;
                                return (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setBusinessType(type.value as BusinessType)}
                                        disabled={loading}
                                        className={`p-5 rounded-2xl border transition-all flex flex-col items-center justify-center relative overflow-hidden group ${
                                            isSelected
                                                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/15'
                                                : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all ${
                                            isSelected ? 'bg-primary' : 'bg-white/5 group-hover:bg-white/10'
                                        }`}>
                                            <span className={`material-symbols-outlined text-2xl transition-colors ${
                                                isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-350'
                                            }`}>
                                                {type.icon}
                                            </span>
                                        </div>
                                        <p className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                                            isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'
                                        }`}>
                                            {type.label}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="text-rose-400 text-center text-xs font-medium bg-rose-500/10 border border-rose-500/20 py-3.5 px-4 rounded-2xl animate-shake">
                            {error}
                        </div>
                    )}

                    {/* Activate Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-600/95 text-white rounded-[1.5rem] font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="animate-spin size-5 border-b-2 border-white rounded-full mx-auto"></div>
                        ) : (
                            'Configurar Negocio'
                        )}
                    </button>

                    {/* Info Note */}
                    <div className="pt-4 border-t border-white/5 text-center">
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined !text-[12px]">info</span>
                            Al configurar, tu negocio se establecerá con módulos según tu tipo de industria
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};
