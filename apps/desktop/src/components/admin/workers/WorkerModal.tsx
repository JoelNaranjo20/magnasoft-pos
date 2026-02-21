import { WorkerForm } from './WorkerForm';

interface WorkerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    workerToEdit?: any;
}

export const WorkerModal = ({ isOpen, onClose, onSuccess, workerToEdit }: WorkerModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined !text-3xl">{workerToEdit ? 'edit_square' : 'person_add'}</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {workerToEdit ? 'Editar Personal' : 'Nuevo Registro'}
                            </h3>
                            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
                                {workerToEdit ? 'Actualizar información' : 'Añadir al sistema'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-8">
                    <WorkerForm
                        workerToEdit={workerToEdit}
                        onSuccess={() => {
                            onSuccess();
                            onClose();
                        }}
                        onCancel={onClose}
                    />
                </div>
            </div>
        </div>
    );
};
