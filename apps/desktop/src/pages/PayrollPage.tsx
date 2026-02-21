import { WorkerPaymentCalculator } from '../components/admin/workers/WorkerPaymentCalculator';

export const PayrollPage = () => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 p-8">
            <WorkerPaymentCalculator />
        </div>
    );
};
