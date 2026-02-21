import { useState } from 'react';
import { WorkerList } from './WorkerList';
import { WorkerModal } from './WorkerModal';

export const WorkerManager = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState<any>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleAdd = () => {
        setSelectedWorker(null);
        setIsEditing(true);
    };

    const handleEdit = (worker: any) => {
        setSelectedWorker(worker);
        setIsEditing(true);
    };

    const handleSuccess = () => {
        setIsEditing(false);
        setSelectedWorker(null);
        setRefreshKey(prev => prev + 1);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setSelectedWorker(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm gap-6">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestión de Personal</h3>
                    <p className="text-sm text-slate-500 font-medium">Administra administradores y trabajadores desde un solo lugar.</p>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto">
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 font-black text-sm uppercase tracking-widest"
                    >
                        <span className="material-symbols-outlined !text-[20px]">person_add</span>
                        Nuevo Personal
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <WorkerList
                    onEdit={handleEdit}
                    refreshKey={refreshKey}
                />
            </div>

            <WorkerModal
                isOpen={isEditing}
                onClose={handleCancel}
                onSuccess={handleSuccess}
                workerToEdit={selectedWorker}
            />
        </div>
    );
};
