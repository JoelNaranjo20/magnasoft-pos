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
            <div className="flex p-1.5 bg-slate-100 dark:bg-[#0b1227]/85 rounded-2xl w-fit border border-slate-200/50 dark:border-white/5 shadow-inner backdrop-blur-sm">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'products'
                            ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/20 scale-105'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[18px]">inventory_2</span>
                    Productos
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'categories'
                            ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/20 scale-105'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    <span className="material-symbols-outlined !text-[18px]">folder</span>
                    Categorías
                </button>
                <button
                    onClick={() => setActiveTab('subcategories')}
                    className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'subcategories'
                            ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/20 scale-105'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white'
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
