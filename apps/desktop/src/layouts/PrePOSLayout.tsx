import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useAuthStore } from '@shared/store/useAuthStore';

const navItems = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/sales', label: 'Ventas', icon: 'storefront' },
    { path: '/finance', label: 'Finanzas', icon: 'attach_money' },
    { path: '/customers', label: 'Clientes', icon: 'group' },
    { path: '/audit', label: 'Auditoría', icon: 'verified_user' },
    { path: '/config', label: 'Configuración', icon: 'settings' },
];

export const PrePOSLayout = ({ children }: { children?: React.ReactNode }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { name: businessName, logoUrl } = useBusinessStore();
    const { signOut } = useAuthStore();

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
        <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-display">
            {/* Top Navigation Bar */}
            <header className="flex-none flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-2 shadow-sm z-40">
                {/* Left: Brand + Nav */}
                <div className="flex items-center gap-5">
                    {/* Brand */}
                    <div className="flex items-center gap-2.5 cursor-default select-none">
                        {logoUrl ? (
                            <div className="size-9 rounded-xl overflow-hidden shadow-md">
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="size-9 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-md text-white">
                                <span className="material-symbols-outlined !text-[22px]">store</span>
                            </div>
                        )}
                        <div className="flex flex-col leading-none">
                            <span className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{businessName}</span>
                            <span className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-bold">Panel de Gestión</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-7 w-px bg-slate-200 dark:bg-slate-700"></div>

                    {/* Navigation Links */}
                    <nav className="flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${isActive(item.path)
                                        ? 'bg-primary/10 text-primary dark:bg-primary/20'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                            >
                                <span className="material-symbols-outlined !text-[18px]">{item.icon}</span>
                                <span className="hidden lg:inline">{item.label}</span>
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Right: POS Button + Sign Out */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/pos')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wide shadow-md shadow-blue-500/20 transition-all active:scale-95"
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
