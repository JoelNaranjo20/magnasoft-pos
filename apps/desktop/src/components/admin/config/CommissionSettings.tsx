// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface CommissionSettings {
    car_wash: number;
    motorcycle_wash: number;
    mechanics: number;
    alignment: number;
    inventory_sales: number;
    other: number;
}

const DEFAULT_SETTINGS: CommissionSettings = {
    car_wash: 40,
    motorcycle_wash: 50,
    mechanics: 40,
    alignment: 12.5,
    inventory_sales: 6,
    other: 0
};

export const CommissionSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<CommissionSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('business_settings')
                .select('value')
                .eq('business_id', useBusinessStore.getState().id)
                .eq('setting_type', 'commissions')
                .maybeSingle();

            if (data && data.value) {
                // IMPORTANT: Merge with defaults to ensure new fields are never undefined
                setSettings({
                    ...DEFAULT_SETTINGS,
                    ...(data.value as any)
                });
            }
        } catch (error) {
            console.error('Error fetching commission settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const businessId = useBusinessStore.getState().id;

            // 1. Save to JSONB settings (legacy/compatibility)
            const { error: settingsError } = await supabase
                .from('business_settings')
                .upsert({
                    business_id: businessId,
                    setting_type: 'commissions',
                    value: settings
                }, { onConflict: 'business_id,setting_type' });

            if (settingsError) throw settingsError;

            // 2. Save to new dedicated column in business table
            const { error: businessError } = await supabase
                .from('business')
                .update({
                    default_product_commission: settings.inventory_sales
                } as any)
                .eq('id', businessId);

            if (businessError) {
                console.warn('Error saving to business table column:', businessError);
                // We don't throw here to avoid blocking if the column is missing or RLS fails,
                // as long as the settings JSONB was saved.
            }

            alert('Configuración guardada correctamente.');
        } catch (error: any) {
            console.error('Error saving settings:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof CommissionSettings, value: string) => {
        const numValue = value === '' ? 0 : parseFloat(value);
        setSettings(prev => ({
            ...prev,
            [field]: isNaN(numValue) ? 0 : numValue
        }));
    };

    if (loading) return <div className="p-8 text-center">Cargando configuración...</div>;

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined !text-3xl">percent</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Liquidación de Inventario</h3>
                    <p className="text-sm text-slate-500">Configura la liquidación por defecto para ventas de productos.</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Ventas de Inventario (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                value={settings.inventory_sales}
                                onChange={(e) => updateField('inventory_sales', e.target.value)}
                                className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-primary outline-none font-bold"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                        <p className="text-xs text-slate-400">Aplicable a productos que no tengan comisión específica configurada.</p>
                    </div>

                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-xl">
                    <div className="flex gap-3">
                        <span className="material-symbols-outlined text-amber-600">info</span>
                        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                            Las comisiones de servicios (Lavado, Mecánica, etc.) se configuran ahora directamente en el formulario de cada servicio.
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-hover shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                    {saving ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">save</span>
                            Guardar Cambios
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
