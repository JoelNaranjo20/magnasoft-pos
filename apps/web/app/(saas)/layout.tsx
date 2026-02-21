'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function SaaSLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { profile, loading, isAuthenticated, logout } = useAuth();

    useEffect(() => {
        if (!loading && isAuthenticated) {
            // STRICT: Only 'super_admin' in saas_role is allowed.
            // We ignore 'role' column for SaaS Panel access to ensure separation.
            const saasRole = String(profile?.saas_role || '').toLowerCase().trim();
            const isSuperAdmin = saasRole === 'super_admin';

            if (!isSuperAdmin) {
                console.warn('Acceso denegado: Rol saas_role != super_admin');
                router.replace('/dashboard'); // Redirect standard users to their dashboard
            }
        } else if (!loading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [profile, loading, isAuthenticated, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
            </div>
        );
    }

    const saasRole = String(profile?.saas_role || '').toLowerCase().trim();
    const isSuperAdmin = saasRole === 'super_admin';

    if (!isSuperAdmin) return null;

    const navItems = [
        { href: '/saas', label: 'Bandeja Entrada', icon: 'all_inbox' }, // Home is now Approvals
        { href: '/saas/tenants', label: 'Negocios', icon: 'business_center' },
        { href: '/saas/serials', label: 'Seriales / Licencias', icon: 'vpn_key' },
        { href: '/saas/dashboard/configurations', label: 'Configuraciones', icon: 'settings' },
    ];

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
            {/* Top SaaS Header */}
            <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="size-9 bg-rose-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                        <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Admin Central</h2>
                        <p className="text-[10px] font-bold text-rose-500">SUPER ADMIN / SAAS</p>
                    </div>
                </div>

                <nav className="flex items-center gap-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isActive
                                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-4">
                    {/* User Profile Info */}
                    {profile && (
                        <div className="text-right mr-2">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {profile.full_name || profile.email}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Super Admin
                            </p>
                        </div>
                    )}

                    <button
                        onClick={async () => {
                            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                                await logout();
                            }
                        }}
                        className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/10"
                    >
                        <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
                {children}
            </main>
        </div>
    );
}
