'use client';

import { FinanceDashboard as SharedFinance } from '@shared/features/dashboard/Dashboard';
import DashboardHeader from '@/app/components/DashboardHeader';

export default function DashboardPage() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0a0f14]">
            <DashboardHeader />
            <SharedFinance />
        </div>
    );
}
