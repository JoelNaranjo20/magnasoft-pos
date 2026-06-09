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
            <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit overflow-x-auto border border-slate-200/50 dark:border-white/5 shadow-inner backdrop-blur-sm">
                <button
                    onClick={() => setActiveTab('payroll')}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'payroll'
                        ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/20 scale-105'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[20px]">payments</span>
                    Nómina
                </button>
                <button
                    onClick={() => setActiveTab('cash_sessions')}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'cash_sessions'
                        ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/20 scale-105'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[20px]">account_balance</span>
                    Caja y Cartera
                </button>
                <button
                    onClick={() => setActiveTab('loans')}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'loans'
                        ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/20 scale-105'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[20px]">credit_card</span>
                    Préstamos
                </button>
                <button
                    onClick={() => setActiveTab('central_cash')}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'central_cash'
                        ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/20 scale-105'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[20px]">savings</span>
                    Caja Central
                </button>
            </div>

            <div className="mt-6">
                <div className={activeTab !== 'payroll' ? 'hidden' : ''}><PayrollPage /></div>
                <div className={activeTab !== 'cash_sessions' ? 'hidden' : ''}><CarteraHub /></div>
                <div className={activeTab !== 'loans' ? 'hidden' : ''}><WorkerLoans /></div>
                <div className={activeTab !== 'central_cash' ? 'hidden' : ''}><CentralCash /></div>
            </div>
        </div>
    );
};
