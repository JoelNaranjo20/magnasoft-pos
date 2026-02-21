import { useState, useEffect } from 'react';
import { Pagination } from '../../ui/Pagination';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface WorkerListProps {
    onEdit: (worker: any) => void;
    refreshKey: number;
}

export const WorkerList = ({ onEdit, refreshKey }: WorkerListProps) => {
    const [workers, setWorkers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchWorkers();
    }, [refreshKey]);

    const fetchWorkers = async () => {
        const businessId = useBusinessStore.getState().id;
        if (!businessId) {
            setWorkers([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('workers')
                .select('*, roles(name)')
                .eq('business_id', businessId)
                .order('name');

            if (error) throw error;
            console.log('🔍 AUDITORÍA ROLES (WorkerList):', data);
            setWorkers(data || []);
        } catch (error) {
            console.error('Error fetching workers:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-8">Cargando trabajadores...</div>;

    const getRoleColor = (role: string) => {
        const r = role?.toUpperCase();
        if (r?.includes('ADMIN')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200';
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personal</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol / Cargo</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contacto</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {workers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((worker) => (
                        <tr key={worker.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-primary/10">
                                        {worker.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 dark:text-white leading-tight">{worker.name}</span>
                                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">ID: {worker.id.slice(0, 8)}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getRoleColor(worker.roles?.name || worker.role)}`}>
                                    {worker.roles?.name || worker.role || 'Sin Rol'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined !text-[16px] text-slate-400">smartphone</span>
                                        {worker.phone || 'Sin télefono'}
                                    </p>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${worker.active
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                                    : 'bg-rose-50 text-rose-500 dark:bg-rose-900/20'
                                    }`}>
                                    <div className={`size-1.5 rounded-full mr-1.5 ${worker.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    {worker.active ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button
                                    onClick={() => onEdit(worker)}
                                    className="p-2.5 text-slate-400 hover:text-primary transition-all hover:bg-primary/5 rounded-2xl active:scale-90"
                                >
                                    <span className="material-symbols-outlined !text-[22px]">edit_square</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {workers.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                No hay trabajadores registrados.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(workers.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                totalItems={workers.length}
                itemsPerPage={itemsPerPage}
            />
        </div>
    );
};
