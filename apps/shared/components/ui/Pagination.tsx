import type { FC } from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage: number;
}

export const Pagination: FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage
}) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex items-center justify-between px-2 py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Mostrando del <span className="text-slate-900 dark:text-white">{startItem}</span> al <span className="text-slate-900 dark:text-white">{endItem}</span> de <span className="text-slate-900 dark:text-white">{totalItems}</span> resultados
            </p>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="size-10 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:grayscale transition-all hover:border-primary hover:text-primary"
                >
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>

                <div className="flex items-center gap-1 hidden sm:flex">
                    {[...Array(totalPages)].map((_, i) => {
                        // Simple logic for small number of pages, can be improved for large numbers
                        if (totalPages > 7 && Math.abs(currentPage - (i + 1)) > 2 && i !== 0 && i !== totalPages - 1) {
                            if (i === 1 || i === totalPages - 2) return <span key={i} className="text-slate-400">...</span>;
                            return null;
                        }

                        return (
                            <button
                                key={i + 1}
                                onClick={() => onPageChange(i + 1)}
                                className={`size-10 flex items-center justify-center rounded-xl text-xs font-black transition-all ${currentPage === i + 1
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110'
                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:border-primary hover:text-primary'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        );
                    })}
                </div>
                {/* Mobile page indicator if needed, or just rely on prev/next */}
                <span className="sm:hidden text-xs font-bold text-slate-500">
                    {currentPage} / {totalPages}
                </span>

                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="size-10 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:grayscale transition-all hover:border-primary hover:text-primary"
                >
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
        </div>
    );
};
