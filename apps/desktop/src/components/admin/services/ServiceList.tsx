// @ts-nocheck

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { Pagination } from '../../ui/Pagination';
// import type { Database } from '../../../types/supabase';

type Service = Database['public']['Tables']['services']['Row'];

interface ServiceListProps {
    onEdit: (service: Service) => void;
    refreshKey: number; // To trigger refetch
}

export const ServiceList = ({ onEdit, refreshKey }: ServiceListProps) => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchServices();
    }, [refreshKey]);

    const fetchServices = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('business_id', useBusinessStore.getState().id)
            .order('active', { ascending: false })
            .order('name');

        if (error) {
            console.error('Error fetching services:', error);
        } else {
            setServices(data || []);
        }
        setLoading(false);
    };

    const toggleActive = async (service: Service) => {
        const { error } = await supabase
            .from('services')
            .update({ active: !service.active })
            .eq('id', service.id);

        if (error) {
            alert('Error al actualizar el estado');
        } else {
            fetchServices();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este servicio PERMANENTEMENTE?\nEsta acción no se puede deshacer.')) return;

        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchServices();
        } catch (error: any) {
            console.error('Error deleting service:', error);
            if (error.code === '23503') {
                alert('No se puede eliminar porque tiene historial. Por favor, solo desactívalo.');
            } else {
                alert('Error al eliminar el servicio');
            }
        }
    };

    if (loading) return <div className="p-4 text-center text-slate-500">Cargando servicios...</div>;

    if (services.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                <span className="material-symbols-outlined text-4xl mb-2">cleaning_services</span>
                <p>No hay servicios registrados.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Nombre</th>
                        <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Categoría</th>
                        <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Precio</th>
                        <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th>
                        <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {services.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((service) => (
                        <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{service.name}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs">
                                    {service.category || 'Sin categoría'}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-slate-900 dark:text-white font-mono">
                                ${service.price.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                                <button
                                    onClick={() => toggleActive(service)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${service.active
                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20'
                                        }`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${service.active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                    {service.active ? 'Activo' : 'Inactivo'}
                                </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button
                                    onClick={() => onEdit(service)}
                                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors mr-1"
                                    title="Editar"
                                >
                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(service.id)}
                                    className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                    title="Eliminar"
                                >
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>



            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(services.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                totalItems={services.length}
                itemsPerPage={itemsPerPage}
            />
        </div >
    );
};
