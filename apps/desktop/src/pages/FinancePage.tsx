import { useState } from 'react';
import { PayrollPage } from './PayrollPage';
import { CarteraHub } from '../components/finance/CarteraHub';
import { WorkerLoans } from '../components/finance/WorkerLoans';
import { CentralCash } from '../components/finance/CentralCash';

export const FinancePage = () => {
    const [activeTab, setActiveTab] = useState<'payroll' | 'cash_sessions' | 'loans' | 'central_cash'>('cash_sessions');

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Finanzas y Cartera</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Gestión financiera, cajas y control de créditos</p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit overflow-x-auto">
                <button
                    onClick={() => setActiveTab('payroll')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'payroll'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[20px]">payments</span>
                    Nómina
                </button>
                <button
                    onClick={() => setActiveTab('cash_sessions')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'cash_sessions'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[20px]">account_balance</span>
                    Caja y Cartera
                </button>
                <button
                    onClick={() => setActiveTab('loans')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'loans'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[20px]">credit_card</span>
                    Préstamos
                </button>
                <button
                    onClick={() => setActiveTab('central_cash')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'central_cash'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[20px]">savings</span>
                    Caja Central
                </button>
            </div>

            <div className="mt-6">
                {activeTab === 'payroll' && <PayrollPage />}
                {activeTab === 'cash_sessions' && <CarteraHub />}
                {activeTab === 'loans' && <WorkerLoans />}
                {activeTab === 'central_cash' && <CentralCash />}
            </div>
        </div>
    );
};
