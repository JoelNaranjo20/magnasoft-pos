'use client';

import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../hooks/useBusiness';

export default function DashboardHeader() {
    const { logout } = useAuth();
    const { business } = useBusiness();

    return (
        <header className="px-4 md:px-8 py-4 md:py-5 flex justify-between items-center bg-white/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex flex-col gap-0.5">
                <h2 className="text-sm md:text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">Panel de Control</h2>
                <p className="text-slate-500 dark:text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none mt-1">Actividad en tiempo real</p>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                {/* User Profile Widget */}
                <div className="flex items-center gap-2 md:gap-4 pl-3 md:pl-6 border-l border-slate-200 dark:border-slate-700">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">Admin Principal</p>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-0.5">
                            {business?.location || 'Sucursal Norte'}
                        </p>
                    </div>

                    <div className="group relative">
                        <button className="size-10 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-all border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-[24px]">account_circle</span>
                        </button>

                        {/* Dropdown / Tooltip for Logout */}
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100 z-30">
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-xs font-black uppercase tracking-widest"
                            >
                                <span className="material-symbols-outlined !text-[18px]">logout</span>
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
