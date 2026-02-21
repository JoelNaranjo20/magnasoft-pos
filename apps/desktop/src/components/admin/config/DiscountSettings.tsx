// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useCategories } from '../../../hooks/useCategories';

interface DiscountRule {
    id: string;
    type: 'category' | 'item';
    target: string;
    targetId?: string;
    itemType?: 'product' | 'service';
    percentage: number;
}

export const DiscountSettings = () => {
    const businessId = useBusinessStore((state) => state.id);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rules, setRules] = useState<DiscountRule[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const { categories } = useCategories(businessId);

    // New rule form
    const [showNewForm, setShowNewForm] = useState(false);
    const [newRule, setNewRule] = useState<Partial<DiscountRule>>({
        type: 'category',
        target: '',
        percentage: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: settingsData } = await supabase
                .from('business_settings')
                .select('value')
                .eq('business_id', businessId)
                .eq('setting_type', 'discounts')
                .maybeSingle();

            if (settingsData && settingsData.value) {
                setRules(settingsData.value as DiscountRule[]);
            }

            const { data: prodData } = await supabase
                .from('products')
                .select('id, name')
                .eq('business_id', businessId)
                .order('name');
            const { data: servData } = await supabase
                .from('services')
                .select('id, name')
                .eq('business_id', businessId)
                .order('name');

            setProducts(prodData || []);
            setServices(servData || []);
        } catch (error) {
            console.error('Error fetching discount data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('business_settings')
                .upsert({
                    business_id: businessId,
                    setting_type: 'discounts',
                    value: rules
                }, { onConflict: 'business_id,setting_type' });

            if (error) throw error;
            alert('Configuración de rebajas guardada correctamente.');
        } catch (error: any) {
            console.error('Error saving discount settings:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const addRule = () => {
        if (!newRule.target || !newRule.percentage) return;

        const rule: DiscountRule = {
            id: Math.random().toString(36).substr(2, 9),
            type: newRule.type as any,
            target: newRule.target as string,
            targetId: newRule.targetId,
            itemType: newRule.itemType as any,
            percentage: newRule.percentage as number
        };

        setRules([...rules, rule]);
        setShowNewForm(false);
        setNewRule({ type: 'category', target: '', percentage: 0 });
    };

    const removeRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id));
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando configuración...</div>;

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                        <span className="material-symbols-outlined !text-4xl">sell</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Configuración de Rebajas</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Establece descuentos automáticos por categoría o artículo.</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowNewForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined !text-[20px]">add</span>
                    Nueva Rebaja
                </button>
            </div>

            {/* Existing Rules Table */}
            <div className="space-y-4">
                {rules.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-3xl">
                        <span className="material-symbols-outlined !text-5xl text-slate-200 dark:text-slate-700 mb-4">tab_unselected</span>
                        <p className="text-slate-400 font-medium">No hay rebajas configuradas aún.</p>
                    </div>
                ) : (
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Aplicado a</th>
                                    <th className="px-6 py-4">Descuento</th>
                                    <th className="px-6 py-4 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {rules.map((rule) => (
                                    <tr key={rule.id} className="group hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${rule.type === 'category'
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                }`}>
                                                {rule.type === 'category' ? 'Categoría' : 'Artículo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{rule.target}</span>
                                                {rule.itemType && <span className="text-[10px] text-slate-500 uppercase font-bold">{rule.itemType}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">-{rule.percentage}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => removeRule(rule.id)}
                                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <span className="material-symbols-outlined !text-[20px]">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                >
                    {saving ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">save</span>
                            Guardar Rebajas
                        </>
                    )}
                </button>
            </div>

            {/* New Rule Modal */}
            {showNewForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white mb-6">Nueva Rebaja</h4>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Tipo de Rebaja</label>
                                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                    <button
                                        onClick={() => setNewRule({ ...newRule, type: 'category', target: '', targetId: undefined, itemType: undefined })}
                                        className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${newRule.type === 'category' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Por Categoría
                                    </button>
                                    <button
                                        onClick={() => setNewRule({ ...newRule, type: 'item', target: '', targetId: undefined, itemType: 'product' })}
                                        className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${newRule.type === 'item' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Por Artículo
                                    </button>
                                </div>
                            </div>

                            {newRule.type === 'category' ? (
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Categoría</label>
                                    <select
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-200 transition-all"
                                        value={newRule.targetId}
                                        onChange={(e) => {
                                            const cat = categories.find(c => c.id === e.target.value);
                                            setNewRule({ ...newRule, targetId: e.target.value, target: cat?.name || '' });
                                        }}
                                    >
                                        <option value="">Seleccionar categoría...</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Subtipo</label>
                                        <div className="flex p-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl">
                                            <button
                                                onClick={() => setNewRule({ ...newRule, itemType: 'product', target: '', targetId: undefined })}
                                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${newRule.itemType === 'product' ? 'bg-slate-200 dark:bg-slate-700' : 'text-slate-400'}`}
                                            >
                                                Producto
                                            </button>
                                            <button
                                                onClick={() => setNewRule({ ...newRule, itemType: 'service', target: '', targetId: undefined })}
                                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${newRule.itemType === 'service' ? 'bg-slate-200 dark:bg-slate-700' : 'text-slate-400'}`}
                                            >
                                                Servicio
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Seleccionar {newRule.itemType === 'product' ? 'Producto' : 'Servicio'}</label>
                                        <select
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-200 transition-all"
                                            value={newRule.targetId}
                                            onChange={(e) => {
                                                const items = newRule.itemType === 'product' ? products : services;
                                                const item = items.find(i => i.id === e.target.value);
                                                setNewRule({ ...newRule, targetId: e.target.value, target: item?.name || '' });
                                            }}
                                        >
                                            <option value="">Seleccionar</option>
                                            {(newRule.itemType === 'product' ? products : services).map(i => (
                                                <option key={i.id} value={i.id}>{i.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Porcentaje de Descuento</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={newRule.percentage}
                                        onChange={(e) => setNewRule({ ...newRule, percentage: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-500 font-black text-2xl text-emerald-600 dark:text-emerald-400 transition-all"
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">%</span>
                                </div>
                                <p className="mt-2 text-[10px] font-bold text-slate-400 italic">Este porcentaje se restará automáticamente del precio original.</p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setShowNewForm(false)}
                                    className="flex-1 py-4 text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-xs"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={addRule}
                                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
                                >
                                    Añadir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
