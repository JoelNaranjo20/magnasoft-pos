import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@shared/store/useAuthStore';
import { useState, useEffect } from 'react';
import { ChangePasswordModal } from '../components/modals/ChangePasswordModal';

export const StandardLayout = () => {
    const location = useLocation();
    const { business, signOut } = useAuthStore();
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'u') {
                e.preventDefault();
                signOut();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [signOut]);

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
                    <button onClick={() => setIsChangePasswordOpen(true)} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-medium">
                        <span className="material-symbols-outlined">key</span>
                        Cambiar Contraseña
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
                <Outlet />
            </main>

            <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
        </div>
    );
};
