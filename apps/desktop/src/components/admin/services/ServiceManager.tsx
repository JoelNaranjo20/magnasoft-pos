// @ts-nocheck
import { useState } from 'react';
import { ServiceList } from './ServiceList';
import { ServiceForm } from './ServiceForm';

type Service = Database['public']['Tables']['services']['Row'];

export const ServiceManager = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleAdd = () => {
        setSelectedService(null);
        setIsEditing(true);
    };

    const handleEdit = (service: Service) => {
        setSelectedService(service);
        setIsEditing(true);
    };

    const handleSuccess = () => {
        setIsEditing(false);
        setSelectedService(null);
        setRefreshKey(prev => prev + 1);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setSelectedService(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">Catálogo de Servicios y Productos</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gestiona los servicios que ofreces a tus clientes.</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Agregar Servicio
                    </button>
                )}
            </div>

            {isEditing ? (
                <ServiceForm
                    serviceToEdit={selectedService}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            ) : (
                <ServiceList
                    onEdit={handleEdit}
                    refreshKey={refreshKey}
                />
            )}
        </div>
    );
};
