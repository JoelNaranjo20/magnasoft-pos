import { useState } from 'react';
import { ServiceManager } from '../../components/admin/services/ServiceManager';
import { WorkerManager } from '../../components/admin/workers/WorkerManager';
import { LoyaltySettings } from '../../components/admin/config/LoyaltySettings';
import { GeneralSettings } from '../../components/admin/config/GeneralSettings';
import { DiscountSettings } from '../../components/admin/config/DiscountSettings';
import { CommissionSettings } from '../../components/admin/config/CommissionSettings';
import { CategoriesSettings } from '../../components/admin/config/CategoriesSettings';
import { RoleManager } from '../../components/admin/config/RoleManager';

type Tab = 'general' | 'services' | 'workers' | 'products' | 'loyalty' | 'commissions' | 'rebajas' | 'roles' | 'categories';

export const ConfigPage = () => {
    const [activeTab, setActiveTab] = useState<Tab>('general');

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Configuración</h1>

            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-8 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap relative ${activeTab === 'general'
                        ? 'text-primary'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    General
                    {activeTab === 'general' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap relative ${activeTab === 'categories'
                        ? 'text-primary'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Categorías
                    {activeTab === 'categories' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('roles')}
                    className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap relative ${activeTab === 'roles'
                        ? 'text-primary'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Roles
                    {activeTab === 'roles' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('services')}
                    className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap relative ${activeTab === 'services'
                        ? 'text-primary'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Servicios
                    {activeTab === 'services' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('workers')}
                    className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap relative ${activeTab === 'workers'
                        ? 'text-primary'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Trabajadores
                    {activeTab === 'workers' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('commissions')}
                    className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap relative ${activeTab === 'commissions'
                        ? 'text-primary'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Liquidación
                    {activeTab === 'commissions' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('rebajas')}
                    className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap relative ${activeTab === 'rebajas'
                        ? 'text-primary'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Rebajas
                    {activeTab === 'rebajas' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('loyalty')}
                    className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap relative ${activeTab === 'loyalty'
                        ? 'text-primary'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Fidelización
                    {activeTab === 'loyalty' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'general' && (
                    <GeneralSettings />
                )}




                {activeTab === 'services' && (
                    <ServiceManager />
                )}

                {activeTab === 'workers' && (
                    <WorkerManager />
                )}

                {activeTab === 'commissions' && (
                    <CommissionSettings />
                )}

                {activeTab === 'rebajas' && (
                    <DiscountSettings />
                )}

                {activeTab === 'loyalty' && (
                    <LoyaltySettings />
                )}

                {activeTab === 'roles' && (
                    <RoleManager />
                )}

                {activeTab === 'categories' && (
                    <CategoriesSettings />
                )}
            </div>
        </div>
    );
};
