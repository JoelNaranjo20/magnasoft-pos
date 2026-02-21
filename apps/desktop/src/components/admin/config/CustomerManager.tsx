import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { CustomerHistoryModal } from '../../modals/CustomerHistoryModal';
import { CustomerEditModal } from './CustomerEditModal';
import { Pagination } from '../../ui/Pagination';

export const CustomerManager = () => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<any>(null);
    const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<any>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchCustomers = async () => {
        const businessId = useBusinessStore.getState().id;
        if (!businessId) {
            setCustomers([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('business_id', businessId)
                .order('name');

            if (error) throw error;
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleViewHistory = (customer: any) => {
        setSelectedCustomerForHistory(customer);
        setIsHistoryModalOpen(true);
    };

    const handleEdit = (customer: any) => {
        setSelectedCustomerForEdit(customer);
        setIsEditModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gestión de Clientes</h3>
                    <p className="text-sm text-slate-500">Consulta y administra la base de datos de clientes registrados.</p>
                </div>
                <div className="relative w-72">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Buscar nombre, tel o email..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-primary outline-none text-slate-900 dark:text-white font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fidelización</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Cargando clientes...</td>
                            </tr>
                        ) : filteredCustomers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No se encontraron clientes.</td>
                            </tr>
                        ) : (
                            filteredCustomers
                                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                .map((customer) => (
                                    <tr key={customer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 dark:text-white">{customer.name}</span>
                                                    <span className="text-xs text-slate-400">ID: {customer.id.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {customer.phone && (
                                                    <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[16px]">phone</span>
                                                        {customer.phone}
                                                    </span>
                                                )}
                                                {customer.email && (
                                                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[16px]">mail</span>
                                                        {customer.email}
                                                    </span>
                                                )}
                                                {!customer.phone && !customer.email && <span className="text-slate-400 italic text-xs">Sin contacto</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[18px]">verified</span>
                                                    {customer.loyalty_points || 0} Puntos
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {customer.total_visits || 0} Visitas totales
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 text-slate-400">
                                                <button
                                                    onClick={() => handleEdit(customer)}
                                                    className="p-2 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                    title="Editar Cliente"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleViewHistory(customer)}
                                                    className="p-2 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                    title="Ver Historial"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">history</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredCustomers.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                totalItems={filteredCustomers.length}
                itemsPerPage={itemsPerPage}
            />

            <CustomerHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                customer={selectedCustomerForHistory}
                vehicle={null}
            />

            <CustomerEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                customer={selectedCustomerForEdit}
                onSuccess={fetchCustomers}
            />
        </div>
    );
};
