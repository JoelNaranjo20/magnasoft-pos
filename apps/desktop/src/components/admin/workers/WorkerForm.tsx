// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface WorkerFormProps {
    workerToEdit?: any;
    onSuccess: () => void;
    onCancel: () => void;
}

interface Role {
    id: string;
    name: string;
}

export const WorkerForm = ({ workerToEdit, onSuccess, onCancel }: WorkerFormProps) => {
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        role_id: '',
        active: true,
        phone: '',
    });

    // Fetch available roles from database
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const { data, error } = await supabase
                    .from('roles')
                    .select('id, name')
                    .order('name');

                if (error) throw error;
                setRoles(data || []);
            } catch (error) {
                console.error('Error fetching roles:', error);
                alert('Error al cargar los roles disponibles');
            } finally {
                setLoadingRoles(false);
            }
        };

        fetchRoles();
    }, []);

    useEffect(() => {
        if (workerToEdit && roles.length > 0) {
            setFormData({
                name: workerToEdit.name,
                role_id: workerToEdit.role_id || (roles[0]?.id || ''),
                active: workerToEdit.active ?? true,
                phone: workerToEdit.phone || '',
            });
        }
    }, [workerToEdit, roles]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Find the selected role from fetched list
            const selectedRole = roles.find(r => r.id === formData.role_id);

            if (!selectedRole) {
                throw new Error('Rol no válido');
            }

            const roleName = selectedRole.name;
            const payload = {
                name: formData.name,
                role_id: formData.role_id,
                active: formData.active,
                phone: formData.phone,
                business_id: useBusinessStore.getState().id
            };

            if (workerToEdit) {
                const { error } = await (supabase
                    .from('workers')
                    .update(payload) as any)
                    .eq('id', workerToEdit.id)
                    .eq('business_id', useBusinessStore.getState().id);  // 🔒 SECURITY: Validate business ownership
                if (error) throw error;
            } else {
                const { error } = await (supabase
                    .from('workers')
                    .insert([payload]) as any);
                if (error) throw error;
            }
            onSuccess();
        } catch (error: any) {
            console.error('Error saving worker:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (loadingRoles) {
        return <div>Cargando...</div>; // Should be instant now
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 font-bold">
                    <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Nombre Completo</label>
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">person</span>
                        <input
                            type="text"
                            required
                            placeholder="Ej. Juan Pérez"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-primary transition-all text-slate-900 dark:text-white"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-1.5 font-bold">
                    <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Rol del Personal</label>
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">badge</span>
                        <select
                            required
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-primary transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                            value={formData.role_id}
                            onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                        >
                            <option value="">Seleccione un rol...</option>
                            {roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                </div>

                <div className="space-y-1.5 font-bold">
                    <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Teléfono Movil</label>
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">smartphone</span>
                        <input
                            type="text"
                            placeholder="+57 300 000 0000"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-primary transition-all text-slate-900 dark:text-white"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                    <div className="flex-1">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Estado de la cuenta</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Permitir que este trabajador aparezca en el sistema</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer group">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary rounded-full"></div>
                    </label>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-8 py-3 text-sm font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 text-sm font-black text-white uppercase tracking-widest bg-primary rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                    {loading ? 'Guardando...' : (workerToEdit ? 'Actualizar' : 'Registrar')}
                </button>
            </div>
        </form>
    );
};
