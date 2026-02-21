import { POSTopBar } from './POSTopBar';
import { POSProductGrid } from './POSProductGrid';
import { POSCart } from './POSCart';
import { CategoryTabs } from './CategoryTabs';

export const POSLayout = () => {
    return (
        <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 font-display selection:bg-primary/20">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent dark:from-blue-900/10 pointer-events-none"></div>
            <POSTopBar />
            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden z-0">
                {/* Product Area with Tabs */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <CategoryTabs />
                    <div className="flex-1 overflow-hidden relative">
                        <POSProductGrid />
                    </div>
                </div>

                {/* Right Column: Cart */}
                <POSCart />
            </main>
        </div>
    );
};
