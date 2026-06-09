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

    const navButtonClass =
        'size-10 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors duration-200 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-[0.95] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-500 dark:disabled:hover:border-slate-700 dark:disabled:hover:text-slate-400';

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-xl">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <span className="text-slate-700 dark:text-slate-300 font-bold">{startItem}</span>
                {' – '}
                <span className="text-slate-700 dark:text-slate-300 font-bold">{endItem}</span>
                {' de '}
                <span className="text-slate-700 dark:text-slate-300 font-bold">{totalItems}</span>
            </p>

            <div className="flex items-center gap-1.5">
                {/* Previous */}
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={navButtonClass}
                >
                    <span className="material-symbols-outlined !text-[18px]">chevron_left</span>
                </button>

                {/* Page numbers (desktop) */}
                <div className="hidden sm:flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        const isActive = currentPage === page;
                        const isNearCurrent = Math.abs(currentPage - page) <= 2;
                        const isEdge = page === 1 || page === totalPages;

                        if (totalPages > 7 && !isNearCurrent && !isEdge) {
                            if (page === 2 || page === totalPages - 1) {
                                return <span key={page} className="w-8 text-center text-xs text-slate-400 select-none">…</span>;
                            }
                            return null;
                        }

                        return (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`size-10 inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-[0.95] ${
                                    isActive
                                        ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary'
                                }`}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Mobile */}
                <span className="sm:hidden text-xs font-bold text-slate-500 dark:text-slate-400 px-2 tabular-nums">
                    {currentPage} / {totalPages}
                </span>

                {/* Next */}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={navButtonClass}
                >
                    <span className="material-symbols-outlined !text-[18px]">chevron_right</span>
                </button>
            </div>
        </div>
    );
};
