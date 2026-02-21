// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '@shared/store/useAuthStore';

interface Role {
    id: string;
    name: string;
}

export const RoleManager = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [newRoleName, setNewRoleName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('roles')
                .select('*')
                .order('name');

            if (error) throw error;
            setRoles(data || []);
        } catch (error) {
            console.error('Error fetching roles:', error);
        } finally {
            setLoading(false);
        }
    };

    const { business } = useAuthStore();

    // ... inside handleCreateRole ...
    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;
        if (!business?.id) {
            alert('Error: No se ha identificado el negocio.');
            return;
        }

        setCreating(true);
        try {
            const { error } = await supabase
                .from('roles')
                .insert([{
                    name: newRoleName.trim(),
                    business_id: business.id
                }]);

            if (error) throw error;

            setNewRoleName('');
            fetchRoles();
        } catch (error: any) {
            console.error('Error creating role:', error);
            alert(`Error al crear rol: ${error.message}`);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteRole = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar el rol "${name}"? Esto podría afectar a los trabajadores asignados.`)) return;

        try {
            const { error } = await supabase
                .from('roles')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchRoles();
        } catch (error: any) {
            console.error('Error deleting role:', error);
            alert('Error al eliminar el rol. Puede estar en uso por un trabajador.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">

                {/* Create Role Form */}
                <div className="w-full md:w-1/3">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sticky top-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">add_moderator</span>
                            Nuevo Rol
                        </h3>

                        <form onSubmit={handleCreateRole} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Rol</label>
                                <input
                                    type="text"
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    placeholder="Ej. Mecánico"
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={creating || !newRoleName.trim()}
                                className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {creating ? 'Creando...' : 'Crear Rol'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Roles List */}
                <div className="w-full md:w-2/3">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300">Roles Existentes ({roles.length})</h3>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Cargando roles...</div>
                        ) : roles.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 italic">No hay roles configurados.</div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {roles.map((role) => (
                                    <div key={role.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center capitalize font-bold text-sm">
                                                {role.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-slate-900 dark:text-white">{role.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleDeleteRole(role.id, role.name)}
                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                title="Eliminar rol"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
