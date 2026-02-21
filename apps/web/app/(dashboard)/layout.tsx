
'use client';

import { useAuth } from '@/app/context/AuthContext';
import LoginPage from '@/app/components/LoginPage';
import Sidebar from '@/app/components/Sidebar';
import { useUI } from '@/app/context/UIContext';
import { useBusiness } from '@/app/hooks/useBusiness';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, profile, loading, logout, accountStatus } = useAuth();
    const { isSidebarCollapsed, toggleMobileMenu } = useUI();
    const { business } = useBusiness();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && isAuthenticated && profile) {
            const saasRole = String(profile.saas_role || '').toLowerCase().trim();
            const normalRole = String(profile.role || '').toLowerCase().trim();
            const isSuperAdmin = saasRole === 'super_admin' || normalRole === 'super_admin';

            // 1. SUPER ADMIN REDIRECT
            if (isSuperAdmin && !pathname.startsWith('/saas')) {
                router.replace('/saas');
                return;
            }

            // 2. ACCOUNT PENDING LOCKDOWN
            if (accountStatus === 'pending') {
                if (pathname !== '/dashboard') {
                    router.replace('/dashboard');
                }
                return;
            }

            if (pathname.startsWith('/dashboard/')) {
                // Flat routes, no slug to validate
                return;
            }

            const businessStatus = profile.business?.status;
            const isRestricted = businessStatus === 'pending' || businessStatus === 'suspended' || businessStatus === 'pending_approval';

            // 3. RESTRICTED ACCOUNT → Downloads only
            if (isRestricted) {
                if (pathname !== '/dashboard/downloads') {
                    router.replace('/dashboard/downloads');
                }
                return;
            }
        } else if (!loading && !isAuthenticated) {
            router.replace('/');
        }
    }, [isAuthenticated, profile, loading, pathname, router, accountStatus]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const hideSidebar = accountStatus === 'pending';

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen relative overflow-x-hidden">
            {!hideSidebar && <Sidebar />}

            <main
                className={`flex-1 transition-all duration-300 flex flex-col w-full min-w-0 ${!hideSidebar
                    ? (isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64')
                    : ''
                    }`}
            >
                {/* Mobile Header Bar */}
                {!hideSidebar && (
                    <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-30">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleMobileMenu}
                                className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
                            >
                                <span className="material-symbols-outlined">menu</span>
                            </button>
                            <span className="font-bold text-slate-800 dark:text-white truncate max-w-[150px]">
                                {business?.name || 'MagnaSoft'}
                            </span>
                        </div>
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-xl">grid_view</span>
                        </div>
                    </header>
                )}

                <div className="flex-1 overflow-x-hidden">
                    {children}
                </div>

                <footer className="py-6 px-8 text-center bg-transparent border-t border-slate-100 dark:border-slate-800/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        © 2026 Joel Naranjo - <span className="text-primary">{business?.name || 'MagnaSoft'}</span>
                    </p>
                </footer>
            </main>
        </div>
    );
}
