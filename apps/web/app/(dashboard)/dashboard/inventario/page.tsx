'use client';

import { useState } from 'react';
import DashboardHeader from '@/app/components/DashboardHeader';
import { useUI } from '@/app/context/UIContext';
import { useInventory, Product } from '@/app/hooks/useInventory';
import ProductModal from './ProductModal';

export default function InventoryPage() {
    const { isSidebarCollapsed } = useUI();
    const { products, loading, addProduct, updateProduct, deleteProduct } = useInventory();
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search)) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
    );

    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setSelectedProduct(null);
        setIsModalOpen(true);
    };

    const handleSave = async (data: any) => {
        if (selectedProduct) {
            return await updateProduct(selectedProduct.id, data);
        } else {
            return await addProduct(data);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`¿Estás seguro de eliminar "${name}"? Esta acción no se puede deshacer.`)) {
            await deleteProduct(id);
        }
    };

    // Stats
    const totalItems = products.length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);

    return (
        <div className="flex flex-col min-h-screen">
            <DashboardHeader />

            <div className="p-8 flex flex-col gap-6 overflow-y-auto">
                {/* Header with Search and Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Inventario de Productos</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Gestiona tu stock, precios y categorías</p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <span className="material-symbols-outlined">add_box</span>
                        Nuevo Producto
                    </button>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
                            <span className="material-symbols-outlined text-primary">inventory_2</span>
                            <span className="text-xs font-black uppercase tracking-widest">Total Productos</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{totalItems}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
                            <span className="material-symbols-outlined text-orange-500">warning</span>
                            <span className="text-xs font-black uppercase tracking-widest">Stock Bajo</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{lowStock}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
                            <span className="material-symbols-outlined text-red-500">error</span>
                            <span className="text-xs font-black uppercase tracking-widest">Agotados</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{outOfStock}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
                            <span className="material-symbols-outlined text-emerald-500">account_balance_wallet</span>
                            <span className="text-xs font-black uppercase tracking-widest">Valor Inventario</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">${totalValue.toLocaleString()}</p>
                    </div>
                </div>

                {/* Search and Table Section */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full max-w-md group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="Buscar por nombre, categoría o código..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm outline-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white shadow-inner font-medium"
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-bold text-sm">
                                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                                Filtros
                            </button>
                            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-bold text-sm">
                                <span className="material-symbols-outlined text-[20px]">download</span>
                                Exportar
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Producto</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Categoría</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Código</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Precio</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Existencias</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                                <span className="text-slate-500 font-medium">Cargando catálogo...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic font-medium">
                                            No se encontraron productos coincidentes.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-all group">
                                            <td className="px-8 py-5">
                                                <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[200px]">{p.name}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider">
                                                    {p.category || 'Sin Categoría'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-slate-500 font-mono text-xs">{p.barcode || '—'}</td>
                                            <td className="px-8 py-5 font-black text-slate-900 dark:text-white">
                                                ${p.price.toLocaleString()}
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-black tracking-widest ${p.stock === 0
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    : p.stock <= 5
                                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    }`}>
                                                    {p.stock} UNID.
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(p)}
                                                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                                        title="Editar"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p.id, p.name)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                product={selectedProduct}
            />
        </div>
    );
}
