'use client';

import Link from 'next/link';
import { useUI } from '@/app/context/UIContext';
import { usePathname } from 'next/navigation';
import { useBusiness } from '@/app/hooks/useBusiness';
import { useAuth } from '@/app/context/AuthContext';

export default function Sidebar() {
    const { isSidebarCollapsed, toggleSidebar, isMobileMenuOpen, closeMobileMenu } = useUI();
    const { business } = useBusiness();
    const { profile, logout } = useAuth();
    const pathname = usePathname();

    const saasRole = String(profile?.saas_role || '').toLowerCase().trim();
    const normalRole = String(profile?.role || '').toLowerCase().trim();
    const isSuperAdmin = saasRole === 'super_admin' || normalRole === 'super_admin';
    const isOwner = saasRole === 'owner' || normalRole === 'owner';

    // Close mobile menu when a link is clicked
    const handleLinkClick = () => {
        if (window.innerWidth < 1024) {
            closeMobileMenu();
        }
    };

    // Flat routes — no slug needed
    const navLinks: { href: string; label: string; icon: string; category?: string }[] = [
        { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', category: 'Principal' },
        { href: '/dashboard/ventas', label: 'Ventas', icon: 'receipt_long' },
        { href: '/dashboard/inventario', label: 'Inventario', icon: 'inventory_2' },
        { href: '/dashboard/finanzas', label: 'Caja Central', icon: 'account_balance_wallet' },
        { href: '/dashboard/downloads', label: 'Descargas', icon: 'download', category: 'Instalación' },
    ];

    if (isOwner) {
        navLinks.push({ href: '/dashboard/licencia', label: 'Licencia y Software', icon: 'shield_lock', category: 'Soporte' });
    }

    if (isSuperAdmin) {
        navLinks.push({ href: '/saas/dashboard', label: 'Admin SaaS', icon: 'admin_panel_settings', category: 'Sistema' });
    }

    return (
        <>
            {/* Backdrop for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={closeMobileMenu}
                />
            )}

            <aside
                className={`flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen fixed inset-y-0 left-0 z-50 transition-all duration-300 shadow-xl lg:shadow-sm ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} w-72`}
            >
                {/* Branding */}
                <div className={`flex items-center justify-between px-5 py-5 border-b border-slate-100 dark:border-slate-700 overflow-hidden`}>
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-md">
                            {business?.logo_url ? (
                                <img src={business.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <span className="material-symbols-outlined text-2xl">grid_view</span>
                            )}
                        </div>
                        {(!isSidebarCollapsed || isMobileMenuOpen) && (
                            <div className="flex flex-col transition-opacity duration-300">
                                <h1 className="text-base font-bold leading-tight text-slate-900 dark:text-white truncate max-w-[140px]">
                                    {business?.name || 'MagnaSoft'}
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Panel Admin</p>
                            </div>
                        )}
                    </div>

                    {/* Close button for mobile */}
                    <button
                        onClick={closeMobileMenu}
                        className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
                    {navLinks.map((link, index) => {
                        const isActive = pathname === link.href;
                        const showCategory = link.category && (!isSidebarCollapsed || isMobileMenuOpen);

                        return (
                            <div key={link.href}>
                                {showCategory && (
                                    <div className="px-3 py-2 mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        {link.category}
                                    </div>
                                )}
                                <Link
                                    href={link.href}
                                    onClick={handleLinkClick}
                                    title={isSidebarCollapsed ? link.label : ''}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group overflow-hidden ${isActive
                                        ? 'bg-primary text-white shadow-md shadow-blue-500/20'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-[24px] shrink-0 transition-colors ${isActive ? 'fill-1' : 'group-hover:text-primary'
                                        }`}>
                                        {link.icon}
                                    </span>
                                    {(!isSidebarCollapsed || isMobileMenuOpen) && (
                                        <span className="text-sm font-medium whitespace-nowrap transition-opacity duration-300">
                                            {link.label}
                                        </span>
                                    )}
                                </Link>
                            </div>
                        );
                    })}
                </nav>

                {/* Bottom Section: User Profile + Actions */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                    {/* User Profile Info */}
                    {(!isSidebarCollapsed || isMobileMenuOpen) && profile && (
                        <div className="px-3 py-2 mb-1">
                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {profile.full_name || profile.email}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {profile.email}
                            </p>
                        </div>
                    )}

                    {/* Logout Button */}
                    <button
                        onClick={async () => {
                            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                                await logout();
                            }
                        }}
                        title={isSidebarCollapsed ? 'Cerrar Sesión' : ''}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors ${isSidebarCollapsed && !isMobileMenuOpen ? 'justify-center' : ''}`}
                    >
                        <span className="material-symbols-outlined text-[24px] shrink-0">
                            logout
                        </span>
                        {(!isSidebarCollapsed || isMobileMenuOpen) && <span className="text-sm font-medium">Cerrar Sesión</span>}
                    </button>

                    {/* Collapse Button - Desktop Only */}
                    <button
                        onClick={toggleSidebar}
                        className={`hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <span className="material-symbols-outlined text-[24px] shrink-0">
                            {isSidebarCollapsed ? 'chevron_right' : 'chevron_left'}
                        </span>
                        {!isSidebarCollapsed && <span className="text-sm font-medium">Colapsar</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
