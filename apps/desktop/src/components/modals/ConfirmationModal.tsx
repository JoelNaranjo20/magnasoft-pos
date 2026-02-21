import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isProcessing?: boolean;
    type?: 'danger' | 'warning' | 'info' | 'success';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isProcessing = false,
    type = 'info'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return 'error';
            case 'warning': return 'warning';
            case 'success': return 'check_circle';
            default: return 'info';
        }
    };

    const getColor = () => {
        switch (type) {
            case 'danger': return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20';
            case 'warning': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
            case 'success': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
            default: return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'danger': return 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30';
            case 'warning': return 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30';
            case 'success': return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30';
            default: return 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30';
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] shadow-2xl p-6 border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200 scale-100">
                <div className="flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${getColor()}`}>
                        <span className="material-symbols-outlined !text-3xl">{getIcon()}</span>
                    </div>

                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 leading-tight">
                        {title}
                    </h3>

                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed whitespace-pre-wrap">
                        {message}
                    </div>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isProcessing}
                            className={`flex-1 py-3 px-4 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${getButtonColor()}`}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>...</span>
                                </>
                            ) : (
                                confirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
