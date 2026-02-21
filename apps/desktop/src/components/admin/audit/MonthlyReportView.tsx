// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { AnnualDeletionModal } from './AnnualDeletionModal';

interface MonthlySummary {
    year: number;
    month: number;
    monthName: string;
    totalSessions: number;
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    isArchived: boolean;
}

export const MonthlyReportView = () => {
    const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false);

    useEffect(() => {
        fetchMonthlyData();
    }, []);

    const fetchMonthlyData = async () => {
        setLoading(true);
        try {
            // Fetch all sessions (lightweight fetch)
            const { data: sessions, error } = await supabase
                .from('cash_sessions')
                .select('id, opened_at, start_amount, end_amount, difference')
                .order('opened_at', { ascending: false });

            if (error) throw error;

            // Also fetch movements to calculate accurate totals if needed
            // For now, let's rely on session end_amount or calculate from movements if possible.
            // A more robust approach for large datasets would be creating a database view, 
            // but for now we aggregate client-side or assume sessions table has enough info.
            // The 'end_amount' represents the system calculated money.

            // To be accurate with "Ingresos" vs "Gastos", we really need the movements.
            // Let's fetch movements for the sessions.
            const { data: movements } = await supabase
                .from('cash_movements')
                .select('amount, type, session_id, created_at');

            // Aggregate data
            const groupedData = new Map<string, MonthlySummary>();

            sessions.forEach(session => {
                const date = new Date(session.opened_at);
                const year = date.getFullYear();
                const month = date.getMonth();
                const key = `${year}-${month}`;

                if (!groupedData.has(key)) {
                    groupedData.set(key, {
                        year,
                        month,
                        monthName: date.toLocaleString('es-ES', { month: 'long' }),
                        totalSessions: 0,
                        totalIncome: 0,
                        totalExpenses: 0,
                        netBalance: 0,
                        isArchived: false // Logic to check if archived could be added later
                    });
                }

                const summary = groupedData.get(key)!;
                summary.totalSessions += 1;

                // Add session movements
                const sessionMovements = movements?.filter(m => m.session_id === session.id) || [];
                const income = sessionMovements.filter(m => m.type === 'income').reduce((sum, m) => sum + m.amount, 0);
                const expense = sessionMovements.filter(m => m.type === 'expense').reduce((sum, m) => sum + m.amount, 0);

                summary.totalIncome += income;
                summary.totalExpenses += expense;
                summary.netBalance += (income - expense);
            });

            const sortedSummaries = Array.from(groupedData.values()).sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });

            setSummaries(sortedSummaries);

        } catch (error) {
            console.error('Error fetching monthly data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnnualDeletion = (year: number) => {
        setSelectedYear(year);
        setIsDeletionModalOpen(true);
    };

    if (loading) return <div className="text-center py-12">Cargando reporte mensual...</div>;

    const currentYear = new Date().getFullYear();

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reporte Mensual de Caja</h3>
                    <p className="text-sm text-slate-500">Resumen consolidado de ingresos y egresos por mes.</p>
                </div>
                <div className="flex gap-2">
                    {/* Add global actions here if needed */}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="space-y-8">
                    {Object.entries(summaries.reduce((acc, curr) => {
                        (acc[curr.year] = acc[curr.year] || []).push(curr);
                        return acc;
                    }, {} as Record<number, MonthlySummary[]>)).sort((a, b) => Number(b[0]) - Number(a[0])).map(([year, months]) => (
                        <div key={year} className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                <h4 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="text-primary">{year}</span>
                                    <span className="text-sm font-normal text-slate-400">({months.length} meses registrados)</span>
                                </h4>
                                {Number(year) < currentYear && (
                                    <button
                                        onClick={() => handleAnnualDeletion(Number(year))}
                                        className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-rose-200 dark:border-rose-900/50"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                                        Consolidar y Archivar {year}
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {months.map((summary) => (
                                    <div key={`${summary.year}-${summary.month}`} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <h5 className="font-bold text-slate-900 dark:text-white capitalize text-lg">{summary.monthName}</h5>
                                            <span className="text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full">
                                                {summary.totalSessions} Sesiones
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Ingresos (Caja)</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">+${summary.totalIncome.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Gastos (Caja)</span>
                                                <span className="font-bold text-rose-600 dark:text-rose-400">-${summary.totalExpenses.toLocaleString()}</span>
                                            </div>
                                            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
                                                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs">Flujo Neto</span>
                                                <span className={`font-black text-lg ${summary.netBalance >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                                                    {summary.netBalance >= 0 ? '+' : ''}${summary.netBalance.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {summaries.length === 0 && (
                        <div className="text-center py-20 opacity-50">
                            <span className="material-symbols-outlined text-6xl mb-4">calendar_today</span>
                            <p className="text-xl font-medium">No hay registros mensuales disponibles.</p>
                        </div>
                    )}
                </div>
            </div>

            {selectedYear && (
                <AnnualDeletionModal
                    isOpen={isDeletionModalOpen}
                    onClose={() => {
                        setIsDeletionModalOpen(false);
                        setSelectedYear(null);
                    }}
                    year={selectedYear}
                    onSuccess={() => {
                        fetchMonthlyData();
                        setIsDeletionModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};
