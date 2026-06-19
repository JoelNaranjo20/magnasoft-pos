'use client';

import React from 'react';
import { CentralCash } from '@shared/components/finance/CentralCash';
import DashboardHeader from '@/app/components/DashboardHeader';

export default function CentralCashPage() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0a0f14]">
            <DashboardHeader />
            <CentralCash />
        </div>
    );
}
