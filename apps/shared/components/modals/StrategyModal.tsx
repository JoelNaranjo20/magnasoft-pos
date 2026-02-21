// @ts-nocheck
import React, { useState } from 'react';
import { supabase } from '@shared/lib/supabase';
import { format } from 'date-fns';

interface StrategyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const StrategyModal: React.FC<StrategyModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: format(new Date(), "yyyy-MM-dd'T'07:00"),
        end_date: format(new Date(), "yyyy-MM-dd'T'18:00"),
        color: '#6366f1'
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('business_strategies')
                .insert([{
                    name: formData.name,
                    description: formData.description,
                    start_date: new Date(formData.start_date).toISOString(),
                    end_date: new Date(formData.end_date).toISOString(),
                    color: formData.color
                }]);

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving strategy:', error);
            alert('Error al guardar la estrategia');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">campaign</span>
                            Nueva Estrategia
                        </h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Marca un hito en la línea de tiempo</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-slate-400">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre de la Campaña / Estrategia</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: Promo Aceite + Lavado Gratis"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descripción / Notas</label>
                        <textarea
                            rows={3}
                            placeholder="Describe qué cambios implementaste..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-slate-900 dark:text-white resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Inicia</label>
                            <input
                                required
                                type="datetime-local"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-xs text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Termina</label>
                            <input
                                required
                                type="datetime-local"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-xs text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Color Identificador</label>
                        <div className="flex gap-2">
                            {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'].map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color })}
                                    className={`size-8 rounded-full border-4 transition-all ${formData.color === color ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">add_task</span>
                                    Guardar Estrategia
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
