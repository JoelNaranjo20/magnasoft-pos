import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@shared/store/useAuthStore';

export const StandardLayout = () => {
    const location = useLocation();
    const { business, signOut } = useAuthStore();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-display">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        {business?.name || 'Magnasoft'}
                    </h1>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{business?.business_type || 'SaaS'}</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                        <span className="material-symbols-outlined">dashboard</span>
                        Dashboard
                    </Link>
                    <Link to="/pos" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/pos') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                        <span className="material-symbols-outlined">point_of_sale</span>
                        Caja / POS
                    </Link>
                    <Link to="/customers" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/customers') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                        <span className="material-symbols-outlined">group</span>
                        Clientes
                    </Link>
                    <Link to="/finance" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/finance') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                        <span className="material-symbols-outlined">attach_money</span>
                        Finanzas
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={signOut} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
                        <span className="material-symbols-outlined">logout</span>
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
                <Outlet />
            </main>
        </div>
    );
};
