// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
// import type { Database } from '../../types/supabase';

type Worker = Database['public']['Tables']['workers']['Row'];
type Role = Database['public']['Tables']['roles']['Row'];
type WorkerWithRole = Worker & { roles: Role | null };

export const ChangeAdminModal = () => {
    const setChangingAdmin = useSessionStore((state) => state.setChangingAdmin);
    const setUser = useSessionStore((state) => state.setUser);

    const [admins, setAdmins] = useState<WorkerWithRole[]>([]);
    const [search, setSearch] = useState('');
    const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                // 1. Dynamically find roles that are considered "Admin"
                // We search for roles containing 'admin' in the roles table first
                const { data: rolesData } = await supabase
                    .from('roles')
                    .select('id')
                    .ilike('name', '%admin%'); // Soft match for 'Admin', 'Administrador', etc.

                const adminRoleIds = rolesData?.map(r => r.id) || [];

                if (adminRoleIds.length === 0) {
                    console.warn('No admin roles found in database.');
                    setAdmins([]);
                    return;
                }

                // 2. Fetch workers who have one of these roles
                // We use the relational query but filter by the foreign key or relationship
                const { data, error } = await supabase
                    .from('workers')
                    .select(`
                        *,
                        roles!inner (*)
                    `)
                    .eq('active', true)
                    .in('roles.id', adminRoleIds) // Filter using the found IDs
                    .order('name');

                if (error) throw error;
                setAdmins(data as unknown as WorkerWithRole[]);

            } catch (error) {
                console.error('Error fetching admins:', error);
            }
        };

        fetchAdmins();
    }, []);

    const filteredAdmins = admins.filter(admin =>
        admin.name.toLowerCase().includes(search.toLowerCase()) ||
        admin.roles?.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleConfirmChange = async () => {
        if (!selectedAdminId) return;

        const selectedWorker = admins.find(a => a.id === selectedAdminId);

        if (!selectedWorker) return;

        setLoading(true);

        // Update Global User State
        // We are mapping the "Worker" to the "User" session object structure loosely
        // or just storing the worker details. 
        // The Store expects a Profile, but we are moving towards Workers. 
        // We will adapt the worker to the user shape for now to keep typescript happy 
        // until we fully refactor the store to use 'Worker' instead of 'Profile'.

        const mockProfileUser = {
            id: selectedWorker.id,
            email: 'worker@local', // Placeholder
            full_name: selectedWorker.name,
            role: selectedWorker.roles?.name || 'user',
            created_at: selectedWorker.created_at,
            updated_at: new Date().toISOString()
        };

        setUser(mockProfileUser);
        setChangingAdmin(false);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-screen p-4 font-display">
            {/* Modal Backdrop */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setChangingAdmin(false)}></div>

            {/* Modal Container */}
            <div className="relative z-50 w-full max-w-[640px] bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all transform animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border-light dark:border-border-dark">
                    <div>
                        <h2 className="text-text-main-light dark:text-text-main-dark text-xl font-bold leading-tight">Cambiar Administrador</h2>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm mt-1">Seleccione el usuario que tomará el control del turno.</p>
                    </div>
                    <button
                        onClick={() => setChangingAdmin(false)}
                        aria-label="Cerrar"
                        className="text-text-secondary-light dark:text-text-secondary-dark hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined !text-2xl">close</span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-[#15202b] border-b border-border-light dark:border-border-dark sticky top-0 z-10">
                    <label className="relative flex items-center w-full group">
                        <span className="absolute left-4 text-text-secondary-light dark:text-text-secondary-dark pointer-events-none flex items-center">
                            <span className="material-symbols-outlined">search</span>
                        </span>
                        <input
                            className="w-full h-12 pl-12 pr-4 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-main-light dark:text-text-main-dark placeholder:text-text-secondary-light dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
                            placeholder="Buscar por nombre o cargo..."
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </label>
                </div>

                {/* Content Area: List of Admins */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                    {filteredAdmins.map((admin) => (
                        <div
                            key={admin.id}
                            onClick={() => {
                                setSelectedAdminId(admin.id);
                            }}
                            className={`group relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selectedAdminId === admin.id
                                ? 'border-2 border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-border-light dark:border-border-dark bg-white dark:bg-surface-dark hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <div className="relative">
                                <div className={`h-14 w-14 rounded-full bg-cover bg-center border-2 border-white dark:border-surface-dark shadow-sm bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xl font-bold ${selectedAdminId === admin.id ? 'text-primary' : 'text-slate-500'}`}>
                                    {/* Placeholder Avatar or Initials */}
                                    {admin.name.substring(0, 2).toUpperCase()}
                                </div>
                                {selectedAdminId === admin.id && (
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 h-4 w-4 rounded-full border-2 border-white dark:border-surface-dark"></div>
                                )}
                            </div>
                            <div className="flex flex-col flex-1">
                                <p className="text-text-main-light dark:text-text-main-dark text-lg font-semibold">{admin.name}</p>
                                <p className={`${selectedAdminId === admin.id ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'} font-medium text-sm`}>
                                    {admin.roles?.name || 'Sin Rol'}
                                </p>
                            </div>
                            <div className={`shrink-0 ${selectedAdminId === admin.id ? 'text-primary' : 'text-slate-300 dark:text-slate-600 group-hover:text-primary'} transition-colors`}>
                                <span className={`material-symbols-outlined !text-3xl ${selectedAdminId === admin.id ? 'fill-1' : ''}`}>
                                    {selectedAdminId === admin.id ? 'check_circle' : 'radio_button_unchecked'}
                                </span>
                            </div>
                        </div>
                    ))}
                    {filteredAdmins.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            No se encontraron usuarios.
                        </div>
                    )}
                </div>


                {/* Footer / Actions */}
                <div className="p-6 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex gap-4">
                    <button
                        onClick={() => setChangingAdmin(false)}
                        className="flex-1 px-6 py-3.5 rounded-lg border border-border-light dark:border-border-dark text-text-main-light dark:text-text-main-dark font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirmChange}
                        disabled={!selectedAdminId || loading}
                        className="flex-[2] px-6 py-3.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-surface-dark disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                        {loading ? 'Cambiando...' : 'Confirmar Cambio'}
                    </button>
                </div>
            </div>
        </div>
    );
};
