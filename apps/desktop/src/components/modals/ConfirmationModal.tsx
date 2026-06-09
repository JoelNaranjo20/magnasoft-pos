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

    const getIconColor = () => {
        switch (type) {
            case 'danger': return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20';
            case 'warning': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
            case 'success': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
            default: return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
        }
    };

    const getConfirmButton = () => {
        switch (type) {
            case 'danger':
                return 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 focus:ring-rose-400/50';
            case 'warning':
                return 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 focus:ring-amber-400/50';
            case 'success':
                return 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 focus:ring-emerald-400/50';
            default:
                return 'bg-primary hover:bg-[#0b6ddb] dark:hover:bg-[#3b9eff] focus:ring-primary/50';
        }
    };

    return (
        /* Overlay — Modal contract */
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal panel — Modal contract */}
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl animate-in scale-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-end px-6 pt-5 pb-0">
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined !text-[18px]">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-col items-center text-center px-6 pb-6 pt-2">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${getIconColor()}`}>
                        <span className="material-symbols-outlined !text-3xl">{getIcon()}</span>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        {title}
                    </h3>

                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed whitespace-pre-wrap">
                        {message}
                    </div>

                    {/* Footer — action buttons */}
                    <div className="flex gap-3 w-full">
                        {/* Secondary / Cancel button */}
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="flex-1 inline-flex items-center justify-center py-2.5 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cancelText}
                        </button>

                        {/* Primary / Confirm button */}
                        <button
                            onClick={onConfirm}
                            disabled={isProcessing}
                            className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${getConfirmButton()}`}
                        >
                            {isProcessing ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    <span className="opacity-70">Procesando...</span>
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
