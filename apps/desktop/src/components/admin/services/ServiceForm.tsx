// @ts-nocheck

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { IconSelector } from '../../ui/IconSelector';

type Service = Database['public']['Tables']['services']['Row'];
type ServiceInsert = Database['public']['Tables']['services']['Insert'];

interface ServiceFormProps {
    serviceToEdit?: Service | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export const ServiceForm = ({ serviceToEdit, onSuccess, onCancel }: ServiceFormProps) => {
    const [loading, setLoading] = useState(false);
    const user = useSessionStore((state) => state.user);
    const businessId = useBusinessStore((state) => state.id);

    // Categories State
    const [categories, setCategories] = useState<any[]>([]);

    const [formData, setFormData] = useState<any>({
        name: '',
        price: 0,
        category: '',
        description: '',
        code: '',
        active: true,
        commission_percentage: 0,
        is_variable_price: false,
        icon: 'scissors'
    });

    // Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            if (!businessId) return;
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('business_id', businessId)
                    .order('name');

                if (error) throw error;
                setCategories(data || []);

                // Set default category if not editing and categories exist
                if (!serviceToEdit && data && data.length > 0 && !formData.category) {
                    setFormData(prev => ({ ...prev, category: data[0].name }));
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };

        fetchCategories();
    }, [businessId, serviceToEdit]); // Added serviceToEdit dependency to ensure default runs correctly only when needed

    useEffect(() => {
        if (serviceToEdit) {
            setFormData({
                name: serviceToEdit.name,
                price: serviceToEdit.price,
                category: serviceToEdit.category,
                description: serviceToEdit.description,
                code: serviceToEdit.code,
                active: serviceToEdit.active,
                commission_percentage: (serviceToEdit as any).commission_percentage || 0,
                is_variable_price: serviceToEdit.is_variable_price || false,
                icon: (serviceToEdit as any).icon || 'scissors'
            });
        }
    }, [serviceToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Sanitize data: Convert empty strings to null for optional fields
        const payload = {
            ...formData,
            code: formData.code === '' ? null : formData.code,
            description: formData.description === '' ? null : formData.description,
            business_id: businessId,
            updated_by: user?.id, // Track who modified the record
        };

        try {
            if (serviceToEdit) {
                const { error } = await supabase
                    .from('services')
                    .update(payload)
                    .eq('id', serviceToEdit.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('services')
                    .insert(payload);
                if (error) throw error;
            }
            onSuccess();
        } catch (error: any) {
            console.error('Error saving service:', error);
            alert(`Error al guardar el servicio: ${error.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Servicio</label>
                    <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio</label>
                    <input
                        type="number"
                        required
                        min="0"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                    <select
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold"
                        value={formData.category || ''}
                        onChange={(e) => {
                            setFormData({
                                ...formData,
                                category: e.target.value
                            });
                        }}
                    >
                        <option value="">Seleccionar Categoría...</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                    {categories.length === 0 && (
                        <p className="text-xs text-amber-500 mt-1">No hay categorías. Crea una en Configuración.</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código (Opcional)</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                    <textarea
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        rows={3}
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Liquidación Trabajador (%)</label>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all pr-10"
                            value={formData.commission_percentage}
                            onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Porcentaje que recibe el trabajador por este servicio.</p>
                </div>

                <div className="col-span-2">
                    <IconSelector
                        selectedIcon={formData.icon}
                        onSelect={(icon) => setFormData({ ...formData, icon })}
                        label="Resulting Icon (Preview in POS)"
                    />
                </div>

                <div className="flex items-center gap-2 pt-6">
                    <input
                        type="checkbox"
                        id="is_variable_price"
                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                        checked={formData.is_variable_price}
                        onChange={(e) => setFormData({ ...formData, is_variable_price: e.target.checked })}
                    />
                    <label htmlFor="is_variable_price" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        Precio Variable (se ingresa al cobrar)
                    </label>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {loading ? 'Guardando...' : (serviceToEdit ? 'Actualizar Servicio' : 'Crear Servicio')}
                </button>
            </div>
        </form>
    );
};
