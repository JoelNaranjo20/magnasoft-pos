import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useAuthStore, selectIsAdmin } from '@shared/store/useAuthStore';

const publicNavItems = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/sales', label: 'Ventas', icon: 'storefront' },
    { path: '/finance', label: 'Finanzas', icon: 'attach_money' },
    { path: '/customers', label: 'Clientes', icon: 'group' },
];

const adminNavItems = [
    { path: '/audit', label: 'Auditoría', icon: 'verified_user' },
    { path: '/inventory', label: 'Inventario', icon: 'category' },
    { path: '/config', label: 'Configuración', icon: 'settings' },
];

export const PrePOSLayout = ({ children }: { children?: React.ReactNode }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { name: businessName, logoUrl } = useBusinessStore();
    const { signOut } = useAuthStore();
    const isAdmin = useAuthStore(selectIsAdmin);
    const navItems = isAdmin ? [...publicNavItems, ...adminNavItems] : publicNavItems;

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
        <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-[#090d1f] text-slate-900 dark:text-slate-100 font-display">
            {/* Top Navigation Bar */}
            <header className="flex-none flex items-center justify-between border-b border-slate-200/40 dark:border-white/5 bg-white/70 dark:bg-[#0b1227]/70 backdrop-blur-md px-6 py-3.5 z-40">
                {/* Left: Brand + Nav */}
                <div className="flex items-center gap-6">
                    {/* Brand */}
                    <div className="flex items-center gap-2.5 cursor-default select-none">
                        {logoUrl ? (
                            <div className="size-9 rounded-xl overflow-hidden shadow-md">
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="size-9 bg-gradient-to-br from-primary to-blue-650 rounded-xl flex items-center justify-center shadow-lg shadow-primary/10 text-white">
                                <span className="material-symbols-outlined !text-[20px]">store</span>
                            </div>
                        )}
                        <div className="flex flex-col leading-none">
                            <span className="text-sm font-semibold text-slate-800 dark:text-white tracking-tight">{businessName}</span>
                            <span className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-semibold mt-0.5">Panel de Gestión</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-7 w-px bg-slate-200/60 dark:bg-white/10"></div>

                    {/* Navigation Links */}
                    <nav className="flex items-center gap-1.5 relative h-full">
                        {navItems.map((item) => {
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`relative group flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                        active
                                            ? 'text-primary'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <span className="material-symbols-outlined !text-[18px]">{item.icon}</span>
                                    <span className="hidden lg:inline">{item.label}</span>
                                    {/* Micro-indicator bar with smooth transition */}
                                    <span className={`absolute bottom-[-14px] left-3 right-3 h-0.5 bg-primary rounded-full transition-all duration-300 ${
                                        active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0 group-hover:opacity-50 group-hover:scale-x-50'
                                    }`} />
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Right: POS Button + Sign Out */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/pos')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-600/95 text-white rounded-xl text-xs font-semibold uppercase tracking-wider shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined !text-[18px]">point_of_sale</span>
                        <span className="hidden sm:inline">Caja / POS</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children || <Outlet />}
            </main>
        </div>
    );
};
