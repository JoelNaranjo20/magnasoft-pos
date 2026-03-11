import { useState, useEffect } from 'react';
import { POSTopBar } from './POSTopBar';
import { POSProductGrid } from './POSProductGrid';
import { POSCart } from './POSCart';
import { CategoryTabs } from './CategoryTabs';
import { POSPatio } from './POSPatio';
import { useModule } from '../../hooks/useModule';
import { useAuthStore } from '@shared/store/useAuthStore';
import { useCartStore } from '../../store/useCartStore';
import { TableOrderModal } from '../modals/TableOrderModal';

export const POSLayout = () => {
    const hasTables = useModule('tables');
    const { business } = useAuthStore();
    const isRestaurant = business?.business_type === 'restaurant';

    const [viewMode, setViewMode] = useState<'menu' | 'patio'>(hasTables ? 'patio' : 'menu');

    // Restaurant: track whether the table-order modal should be open
    const activeCartId = useCartStore(state => state.activeCartId);
    const isTableOrderOpen = isRestaurant && activeCartId !== 'default';

    // Listen for "back to patio" request (from POSCart or TableOrderModal)
    useEffect(() => {
        const handleBackToPatio = () => {
            if (isRestaurant) {
                useCartStore.getState().setActiveCart('default');
                setViewMode('patio');
            }
        };
        window.addEventListener('pos-back-to-patio', handleBackToPatio);
        return () => window.removeEventListener('pos-back-to-patio', handleBackToPatio);
    }, [isRestaurant]);

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 font-display selection:bg-primary/20">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent dark:from-blue-900/10 pointer-events-none"></div>
            <POSTopBar />

            {/* Tab bar: only for non-restaurant businesses with tables */}
            {hasTables && !isRestaurant && (
                <div className="flex justify-center py-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-800/50 z-10 relative flex-none">
                    <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
                        <button
                            onClick={() => setViewMode('patio')}
                            className={`flex items-center gap-2 px-8 py-2 rounded-lg text-sm font-black transition-all ${viewMode === 'patio' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <span className="material-symbols-outlined !text-[18px]">table_restaurant</span>
                            Patio de Mesas
                        </button>
                        <button
                            onClick={() => setViewMode('menu')}
                            className={`flex items-center gap-2 px-8 py-2 rounded-lg text-sm font-black transition-all ${viewMode === 'menu' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <span className="material-symbols-outlined !text-[18px]">restaurant_menu</span>
                            Menú / Orden
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden z-0">
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.05)] z-10">
                    {/* Restaurant: always show patio as main view */}
                    {isRestaurant ? (
                        <POSPatio />
                    ) : viewMode === 'patio' ? (
                        <POSPatio />
                    ) : (
                        <>
                            <CategoryTabs />
                            <div className="flex-1 overflow-hidden relative">
                                <POSProductGrid />
                            </div>
                        </>
                    )}
                </div>

                {/* Right Column: Cart — ONLY for non-restaurant */}
                {!isRestaurant && (
                    <POSCart />
                )}
            </main>

            {/* Restaurant: Table Order Modal (opens over patio when a table is clicked) */}
            {isRestaurant && (
                <TableOrderModal
                    isOpen={isTableOrderOpen}
                    onClose={() => {
                        useCartStore.getState().setActiveCart('default');
                    }}
                />
            )}
        </div>
    );
};
