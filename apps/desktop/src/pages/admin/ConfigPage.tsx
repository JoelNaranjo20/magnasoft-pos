import { useState } from 'react';
import { ServiceManager } from '../../components/admin/services/ServiceManager';
import { WorkerManager } from '../../components/admin/workers/WorkerManager';
import { LoyaltySettings } from '../../components/admin/config/LoyaltySettings';
import { GeneralSettings } from '../../components/admin/config/GeneralSettings';
import { DiscountSettings } from '../../components/admin/config/DiscountSettings';
import { CategoriesSettings } from '../../components/admin/config/CategoriesSettings';
import { RoleManager } from '../../components/admin/config/RoleManager';

type Tab = 'general' | 'services' | 'workers' | 'products' | 'loyalty' | 'rebajas' | 'roles' | 'categories';

export const ConfigPage = () => {
    const [activeTab, setActiveTab] = useState<Tab>('general');

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Configuración</h1>

            {/* Tabs Navigation */}
            <div className="flex p-1.5 bg-slate-100 dark:bg-[#0b1227]/85 rounded-2xl w-fit overflow-x-auto scrollbar-hide border border-slate-200/50 dark:border-white/5 shadow-inner backdrop-blur-sm mb-8 gap-1">
                {(['general', 'categories', 'roles', 'services', 'workers', 'rebajas', 'loyalty'] as Tab[]).map((tab) => {
                    const label = {
                        general: 'General',
                        categories: 'Categorías',
                        roles: 'Roles',
                        services: 'Servicios',
                        workers: 'Trabajadores',
                        rebajas: 'Rebajas',
                        loyalty: 'Fidelización',
                        products: 'Productos'
                    }[tab];

                    const isActive = activeTab === tab;

                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${isActive
                                ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/20 scale-105'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            {label}
                        </button>
                    );
                })}
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
