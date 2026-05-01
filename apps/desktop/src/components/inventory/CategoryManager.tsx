// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useSessionStore } from '@shared/store/useSessionStore';

interface Category {
    id: string;
    name: string;
    parent_id?: string | null;
    commission_percentage?: number | null;
    commission_type?: 'percentage' | 'fixed' | null;
    commission_amount?: number | null;
    icon?: string;
    type?: string;
    color?: string;
}

interface Props {
    isSubcategory: boolean;
}

export const CategoryManager = ({ isSubcategory }: Props) => {
    const businessId = useBusinessStore((state) => state.id);
    const { user } = useSessionStore();
    
    const [categories, setCategories] = useState<Category[]>([]);
    const [parentCategories, setParentCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<{
        id?: string;
        name: string;
        parent_id: string;
        commission_percentage: string;
        commission_type: 'percentage' | 'fixed';
        commission_amount: string;
        icon: string;
    }>({
        name: '',
        parent_id: '',
        commission_percentage: '',
        commission_type: 'percentage',
        commission_amount: '',
        icon: 'folder'
    });

    useEffect(() => {
        if (businessId) {
            fetchCategories();
            if (isSubcategory) {
                fetchParentCategories();
            }
        }
    }, [businessId, isSubcategory]);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('categories')
                .select('*')
                .eq('business_id', businessId)
                .order('name');

            // If managing subcategories, only fetch those WITH a parent_id
            // If managing main categories, only fetch those WITHOUT a parent_id
            if (isSubcategory) {
                query = query.not('parent_id', 'is', null);
            } else {
                query = query.is('parent_id', null);
            }

            const { data, error } = await query;
            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchParentCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name')
                .eq('business_id', businessId)
                .is('parent_id', null)
                .order('name');
                
            if (error) throw error;
            setParentCategories(data || []);
        } catch (error) {
            console.error('Error fetching parent categories:', error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            alert('El nombre es requerido');
            return;
        }

        if (isSubcategory && !formData.parent_id) {
            alert('Debe seleccionar una categoría principal');
            return;
        }

        try {
            const payload = {
                business_id: businessId,
                name: formData.name.trim(),
                parent_id: isSubcategory ? formData.parent_id : null,
                commission_percentage: formData.commission_type === 'percentage' && formData.commission_percentage !== '' && formData.commission_percentage !== null 
                    ? parseFloat(formData.commission_percentage) 
                    : null,
                commission_type: formData.commission_type,
                commission_amount: formData.commission_type === 'fixed' && formData.commission_amount !== '' && formData.commission_amount !== null 
                    ? parseFloat(formData.commission_amount) 
                    : null,
                icon: formData.icon || 'folder'
            };

            let error;
            if (formData.id) {
                const { error: updateError } = await supabase
                    .from('categories')
                    .update(payload)
                    .eq('id', formData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('categories')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;
            
            setIsEditing(false);
            fetchCategories();
        } catch (error: any) {
            console.error('Error guardando:', error);
            if (error?.code === '23505') {
                alert('Ya existe una categoría con ese nombre');
            } else {
                alert('Error al guardar la categoría');
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`¿Está seguro de eliminar esta ${isSubcategory ? 'subcategoría' : 'categoría'}?`)) return;

        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchCategories();
        } catch (error) {
            console.error('Error eliminando:', error);
            alert('Error al eliminar. Puede que tenga productos asociados.');
        }
    };

    const openEdit = (category?: Category) => {
        if (category) {
            setFormData({
                id: category.id,
                name: category.name,
                parent_id: category.parent_id || '',
                commission_percentage: category.commission_percentage !== null && category.commission_percentage !== undefined 
                    ? category.commission_percentage.toString() 
                    : '',
                commission_type: category.commission_type || 'percentage',
                commission_amount: category.commission_amount !== null && category.commission_amount !== undefined 
                    ? category.commission_amount.toString() 
                    : '',
                icon: category.icon || 'folder'
            });
        } else {
            setFormData({
                name: '',
                parent_id: '',
                commission_percentage: '',
                commission_type: 'percentage',
                commission_amount: '',
                icon: 'folder'
            });
        }
        setIsEditing(true);
    };

    const filteredList = categories.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    if (isEditing) {
        return (
            <div className="max-w-xl mx-auto anime-fade-in bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                    <button 
                        onClick={() => setIsEditing(false)}
                        className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    >
                        <span className="material-symbols-outlined !text-[20px]">arrow_back</span>
                    </button>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {formData.id ? 'Editar' : 'Nueva'} {isSubcategory ? 'Subcategoría' : 'Categoría'}
                    </h2>
                </div>

                <form onSubmit={handleSave} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-900 dark:text-white transition-all"
                            placeholder={isSubcategory ? "Ej: Filtros de Aire" : "Ej: Repuestos"}
                            required
                        />
                    </div>

                    {isSubcategory && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Categoría Principal
                            </label>
                            <select
                                value={formData.parent_id}
                                onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-900 dark:text-white transition-all"
                                required
                            >
                                <option value="">Seleccione una categoría...</option>
                                {parentCategories.map(pc => (
                                    <option key={pc.id} value={pc.id}>{pc.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 mb-1.5">
                            {/* Label */}
                            <div className="flex items-center gap-1 shrink-0">
                                <span className="material-symbols-outlined text-slate-400 !text-base">payments</span>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Comisión por Defecto</span>
                            </div>

                            {/* Toggle pills */}
                            <div className="flex gap-0.5 p-0.5 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, commission_type: 'percentage' })}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all duration-200 ${
                                        formData.commission_type === 'percentage'
                                            ? 'bg-indigo-500 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                >
                                    <span className="material-symbols-outlined !text-xs">percent</span>
                                    %
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, commission_type: 'fixed' })}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all duration-200 ${
                                        formData.commission_type === 'fixed'
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                >
                                    <span className="material-symbols-outlined !text-xs">attach_money</span>
                                    Fijo
                                </button>
                            </div>

                            {/* Input — inline */}
                            {formData.commission_type === 'percentage' ? (
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={formData.commission_percentage}
                                        onChange={e => setFormData({ ...formData, commission_percentage: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full pl-3 pr-8 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg outline-none focus:border-indigo-400 font-mono text-indigo-700 dark:text-indigo-300 font-bold text-sm"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 font-black text-sm">%</span>
                                </div>
                            ) : (
                                <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-sm">$</span>
                                    <input
                                        type="number"
                                        step="100"
                                        min="0"
                                        value={formData.commission_amount}
                                        onChange={e => setFormData({ ...formData, commission_amount: e.target.value })}
                                        placeholder="1000"
                                        className="w-full pl-6 pr-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg outline-none focus:border-emerald-400 font-mono text-emerald-700 dark:text-emerald-300 font-bold text-sm"
                                    />
                                </div>
                            )}

                            {/* Hint (only for fixed with value) */}
                            {formData.commission_type === 'fixed' && formData.commission_amount && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0 whitespace-nowrap">
                                    💰 ${parseFloat(formData.commission_amount || '0').toLocaleString()}
                                </p>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 pl-1">
                            Opcional. Si se define, los productos dentro de esta {isSubcategory ? 'subcategoría' : 'categoría'} 
                            que no tengan comisión propia heredarán este valor.
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined !text-[20px]">save</span>
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6 anime-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder={`Buscar ${isSubcategory ? 'sub' : ''}categoría...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-slate-900 dark:text-white transition-all shadow-sm"
                    />
                </div>
                
                <button
                    onClick={() => openEdit()}
                    className="flex shrink-0 items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all active:scale-95 w-full sm:w-auto"
                >
                    <span className="material-symbols-outlined !text-[20px]">add</span>
                    Nueva {isSubcategory ? 'Subcategoría' : 'Categoría'}
                </button>
            </div>

            {loading ? (
                <div className="py-12 flex justify-center">
                    <div className="size-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            ) : filteredList.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                        <span className="material-symbols-outlined !text-[32px]">
                            {isSubcategory ? 'account_tree' : 'folder_open'}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        No hay {isSubcategory ? 'subcategorías' : 'categorías'}
                    </h3>
                    <p className="text-sm text-slate-500 max-w-sm">
                        Comienza agregando tu primera {isSubcategory ? 'subcategoría' : 'categoría'} para organizar tu inventario.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredList.map((cat) => (
                        <div 
                            key={cat.id} 
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-start gap-4 hover:border-primary/30 dark:hover:border-primary/50 transition-colors group"
                        >
                            <div className="size-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                <span className="material-symbols-outlined">{cat.icon || 'folder'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-900 dark:text-white truncate">{cat.name}</h4>
                                
                                {isSubcategory && (
                                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 mt-1">
                                        <span className="material-symbols-outlined !text-[14px]">account_tree</span>
                                        <span className="truncate">{parentCategories.find(p => p.id === cat.parent_id)?.name || 'Categoría Principal Desconocida'}</span>
                                    </div>
                                )}
                                
                                {cat.commission_type === 'fixed' && cat.commission_amount ? (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold mt-2">
                                        <span className="material-symbols-outlined !text-[12px]">payments</span>
                                        Comisión: ${cat.commission_amount.toLocaleString()}
                                    </div>
                                ) : cat.commission_type === 'percentage' && cat.commission_percentage !== null && cat.commission_percentage !== undefined ? (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold mt-2">
                                        <span className="material-symbols-outlined !text-[12px]">percent</span>
                                        Comisión: {cat.commission_percentage}%
                                    </div>
                                ) : null}
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEdit(cat)}
                                    className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                    title="Editar"
                                >
                                    <span className="material-symbols-outlined !text-[18px]">edit</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(cat.id)}
                                    className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                    title="Eliminar"
                                >
                                    <span className="material-symbols-outlined !text-[18px]">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
