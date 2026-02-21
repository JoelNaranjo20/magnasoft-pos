// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface LoyaltySettingsData {
    points_per_visit: number;
    enabled: boolean;
    points_threshold: number;
    reward_service_id: string;
}

export const LoyaltySettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [settings, setSettings] = useState<LoyaltySettingsData>({
        points_per_visit: 10,
        enabled: true,
        points_threshold: 50,
        reward_service_id: ''
    });

    const fetchServices = async () => {
        const businessId = useBusinessStore.getState().id;
        const { data } = await supabase
            .from('services')
            .select('id, name')
            .eq('business_id', businessId)
            .eq('active', true)
            .order('name');
        setServices(data || []);
    };

    const fetchSettings = async () => {
        try {
            const { data } = await supabase
                .from('business_settings')
                .select('value')
                .eq('business_id', useBusinessStore.getState().id)
                .eq('setting_type', 'loyalty')
                .maybeSingle();

            if (data && data.value) {
                setSettings({
                    ...settings,
                    ...(data.value as LoyaltySettingsData)
                });
            }
        } catch (error) {
            console.error('Error fetching loyalty settings:', error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const businessId = useBusinessStore.getState().id;
            const { error } = await supabase
                .from('business_settings')
                .upsert({
                    business_id: businessId,
                    setting_type: 'loyalty',
                    value: settings
                }, { onConflict: 'business_id,setting_type' });

            if (error) throw error;
            alert('Configuración de fidelización guardada correctamente.');
        } catch (error: any) {
            console.error('Error saving loyalty settings:', error);
            alert('Error disponiendo settings: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            await Promise.all([
                fetchSettings(),
                fetchServices()
            ]);
            setLoading(false);
        };
        init();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <span className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></span>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cargando módulos...</p>
        </div>
    );

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm">
                    <span className="material-symbols-outlined !text-4xl">loyalty</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Puntos de Fidelidad (Loyalty)</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configura cómo tus clientes ganan recompensas por sus visitas.</p>
                </div>
            </div>

            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-purple-500">stars</span>
                            Puntos por Visita Completa
                        </label>
                        <div className="relative group">
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={settings.points_per_visit}
                                onChange={(e) => setSettings({ ...settings, points_per_visit: parseInt(e.target.value) || 0 })}
                                className="w-full pl-4 pr-12 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-purple-500 outline-none font-bold text-lg transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase">Pts</span>
                        </div>
                        <p className="text-xs text-slate-500 pl-1">Puntos otorgados cada vez que se completa una venta.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-emerald-500">redeem</span>
                            Puntos Necesarios para Recompensa
                        </label>
                        <div className="relative group">
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={settings.points_threshold}
                                onChange={(e) => setSettings({ ...settings, points_threshold: parseInt(e.target.value) || 1 })}
                                className="w-full pl-4 pr-12 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 outline-none font-bold text-lg transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase">Min</span>
                        </div>
                        <p className="text-xs text-slate-500 pl-1">Número de puntos que el cliente debe acumular para redimir.</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-indigo-500">inventory_2</span>
                        Servicio otorgado como Recompensa
                    </label>
                    <select
                        value={settings.reward_service_id}
                        onChange={(e) => setSettings({ ...settings, reward_service_id: e.target.value })}
                        className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 outline-none font-bold text-lg appearance-none transition-all"
                    >
                        <option value="">Selecciona un servicio...</option>
                        {services.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500 pl-1">Este servicio se agregará gratis al carrito cuando el cliente redima sus puntos.</p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex gap-3">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">tips_and_updates</span>
                    <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                        <p className="font-bold">¿Cómo funciona la redención?</p>
                        <p>Cuando un cliente alcanza el mínimo de puntos, aparecerá un botón en la pantalla de pago para redimir el servicio seleccionado gratuitamente.</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">save</span>
                                Guardar Configuración
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
