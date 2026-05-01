// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface LoyaltySettingsData {
    points_per_visit: number;
    enabled: boolean;
    points_threshold: number;
    reward_service_id: string; // legacy, kept for backward compat
    reward_service_ids: string[]; // new: multiple rewards
}

export const LoyaltySettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [settings, setSettings] = useState<LoyaltySettingsData>({
        points_per_visit: 10,
        enabled: true,
        points_threshold: 50,
        reward_service_id: '',
        reward_service_ids: []
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
                const loaded = data.value as LoyaltySettingsData;
                // Migrate legacy single reward_service_id → reward_service_ids
                if (!loaded.reward_service_ids && loaded.reward_service_id) {
                    loaded.reward_service_ids = [loaded.reward_service_id];
                } else if (!loaded.reward_service_ids) {
                    loaded.reward_service_ids = [];
                }
                setSettings({
                    ...settings,
                    ...loaded
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
                        Servicios ofrecidos como Recompensa
                    </label>
                    <p className="text-xs text-slate-500 pl-1 mb-2">Selecciona uno o varios servicios que se agregarán gratis al carrito al canjear puntos.</p>
                    <div className="max-h-48 overflow-y-auto border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                        {services.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-4">No hay servicios activos disponibles.</p>
                        ) : (
                            services.map(s => (
                                <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={settings.reward_service_ids?.includes(s.id) || false}
                                        onChange={e => {
                                            const current = settings.reward_service_ids || [];
                                            setSettings({
                                                ...settings,
                                                reward_service_ids: e.target.checked
                                                    ? [...current, s.id]
                                                    : current.filter(id => id !== s.id)
                                            });
                                        }}
                                        className="w-4 h-4 rounded accent-indigo-600"
                                    />
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.name}</span>
                                </label>
                            ))
                        )}
                    </div>
                    {(settings.reward_service_ids?.length || 0) > 0 && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold pl-1">
                            ✓ {settings.reward_service_ids.length} servicio{settings.reward_service_ids.length !== 1 ? 's' : ''} seleccionado{settings.reward_service_ids.length !== 1 ? 's' : ''}.
                        </p>
                    )}
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
