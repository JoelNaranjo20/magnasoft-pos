import { useState } from 'react';
import { SessionHistory } from '../../components/admin/sessions/SessionHistory';
import { MonthlyReportView } from '../../components/admin/audit/MonthlyReportView';

export const AuditPage = () => {
    const [currentView, setCurrentView] = useState<'history' | 'report'>('history');

    return (
        <>
            {/* Top Header */}
            <header className="px-8 py-6 flex flex-wrap justify-between items-end gap-4 bg-white/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 backdrop-blur-md">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Auditoría de Turnos</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Revisa las sesiones de caja y actividad por administrador.</p>
                </div>

                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setCurrentView('history')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${currentView === 'history'
                                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        Historial Detallado
                    </button>
                    <button
                        onClick={() => setCurrentView('report')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${currentView === 'report'
                                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        Reporte Mensual
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className="p-8 h-[calc(100vh-100px)] flex flex-col">
                {currentView === 'history' ? (
                    <SessionHistory />
                ) : (
                    <MonthlyReportView />
                )}
            </div>
        </>
    );
};
