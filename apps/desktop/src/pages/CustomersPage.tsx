import { CustomerManager } from '../components/admin/config/CustomerManager';

export const CustomersPage = () => {
    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Clientes</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Administra tu base de clientes, vehículos y deudas
                </p>
            </div>
            <CustomerManager />
        </div>
    );
};
