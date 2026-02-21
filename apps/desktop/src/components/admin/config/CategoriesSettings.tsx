// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { Trash2, Plus, AlertCircle } from 'lucide-react';



export const CategoriesSettings = () => {
    const businessId = useBusinessStore((state) => state.id);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('general');

    useEffect(() => {
        if (businessId) fetchCategories();
    }, [businessId]);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('business_id', businessId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { error } = await supabase.from('categories').insert({
                business_id: businessId,
                name: newName,
                type: newType,
            });

            if (error) {
                if (error.code === '23505') {
                    alert('Ya existe una categoría con ese nombre.');
                } else {
                    throw error;
                }
                return;
            }

            // Reset form and reload
            setNewName('');
            setNewType('general');
            fetchCategories();

        } catch (error: any) {
            console.error('Error creating category:', error);
            alert('Error al crear categoría: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;

        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchCategories();
        } catch (error: any) {
            console.error('Error deleting category:', error);
            alert('Error al eliminar: ' + error.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Creation Form */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Nueva Categoría
                </h3>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Bebidas, Cortes, Productos..."
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                        <select
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            value={newType}
                            onChange={(e) => setNewType(e.target.value)}
                        >
                            <option value="general">General</option>
                            <option value="product">Producto</option>
                            <option value="service">Servicio</option>
                        </select>
                    </div>

                    <div className="md:col-span-4 flex justify-end mt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {submitting ? 'Guardando...' : 'Crear Categoría'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Cargando categorías...</td>
                            </tr>
                        ) : categories.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                                    <AlertCircle className="w-8 h-8 opacity-50" />
                                    No hay categorías creadas aún.
                                </td>
                            </tr>
                        ) : (
                            categories.map((cat) => (
                                <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                        {cat.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.type === 'product' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                            cat.type === 'service' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                                'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                                            }`}>
                                            {cat.type === 'product' ? 'Producto' :
                                                cat.type === 'service' ? 'Servicio' : 'General'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
