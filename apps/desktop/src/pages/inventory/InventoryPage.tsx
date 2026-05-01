// @ts-nocheck
import { useState } from 'react';
import { ProductStockManager } from '../../components/admin/products/ProductStockManager';
import { CategoryManager } from '../../components/inventory/CategoryManager';

type Tab = 'products' | 'categories' | 'subcategories';

export const InventoryPage = () => {
    const [activeTab, setActiveTab] = useState<Tab>('products');

    return (
        <div className="p-6 pb-24 md:pb-6 space-y-6 max-w-7xl mx-auto anime-fade-in">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/20">
                        <span className="material-symbols-outlined !text-[24px]">category</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Inventario y Categorías</h1>
                        <p className="text-sm text-slate-500 font-medium">Gestiona tus productos y comisiones por niveles</p>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'products'
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[18px]">inventory_2</span>
                    Productos
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'categories'
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[18px]">folder</span>
                    Categorías
                </button>
                <button
                    onClick={() => setActiveTab('subcategories')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'subcategories'
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[18px]">account_tree</span>
                    Subcategorías
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 min-h-[500px]">
                {activeTab === 'products' && (
                    <ProductStockManager />
                )}
                {activeTab === 'categories' && (
                    <CategoryManager isSubcategory={false} />
                )}
                {activeTab === 'subcategories' && (
                    <CategoryManager isSubcategory={true} />
                )}
            </div>
        </div>
    );
};
