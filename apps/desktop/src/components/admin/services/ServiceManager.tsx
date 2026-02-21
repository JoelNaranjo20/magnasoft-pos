// @ts-nocheck
import { useState } from 'react';
import { ServiceList } from './ServiceList';
import { ServiceForm } from './ServiceForm';
import { ProductStockManager } from '../products/ProductStockManager';
// import type { Database } from '../../../types/supabase';

type Service = Database['public']['Tables']['services']['Row'];
type Tab = 'services' | 'products';

export const ServiceManager = () => {
    const [activeTab, setActiveTab] = useState<Tab>('services');
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
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gestiona los servicios y el inventario de productos.</p>
                </div>
                {!isEditing && activeTab === 'services' && (
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Agregar Servicio
                    </button>
                )}
            </div>

            {/* Internal Tabs */}
            {!isEditing && (
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'services'
                                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        Servicios
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'products'
                                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        Productos (Stock)
                    </button>
                </div>
            )}

            {activeTab === 'services' ? (
                isEditing ? (
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
                )
            ) : (
                <ProductStockManager />
            )}
        </div>
    );
};
