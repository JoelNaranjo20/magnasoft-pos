'use client';

import DashboardHeader from '@/app/components/DashboardHeader';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const settingsLinks = [
        { href: `/dashboard/configuracion/miembros`, label: 'Miembros', icon: 'group' },
        { href: `/dashboard/configuracion/empresa`, label: 'Empresa', icon: 'business' },
        { href: `/dashboard/configuracion/cuenta`, label: 'Mi Cuenta', icon: 'person' },
        { href: `/dashboard/configuracion/seguridad`, label: 'Seguridad', icon: 'security' },
    ];

    return (
        <div className="flex flex-col min-h-screen">
            <DashboardHeader />

            <div className="p-8 flex flex-col gap-6 overflow-y-auto">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Configuración</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gestiona los ajustes de tu cuenta y los miembros de tu equipo.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Settings Sub-nav */}
                    <aside className="w-full lg:w-64 shrink-0">
                        <nav className="flex flex-row lg:flex-col gap-1 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
                            {settingsLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${isActive
                                            ? 'bg-primary/10 text-primary dark:bg-primary dark:text-white border border-primary/20 dark:border-primary shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-transparent'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Settings Page Content */}
                    <div className="flex-1 min-w-0">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
