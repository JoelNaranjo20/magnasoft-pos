'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/app/hooks/useInventory';
import { useCategories } from '@/app/hooks/useCategories';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: any) => Promise<any>;
    product?: Product | null;
}

export default function ProductModal({ isOpen, onClose, onSave, product }: ProductModalProps) {
    const { categories, loading: categoriesLoading } = useCategories('product');
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        stock: '',
        barcode: '',
        category: 'Productos'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                price: product.price.toString(),
                stock: product.stock.toString(),
                barcode: product.barcode || '',
                category: product.category || 'Productos'
            });
        } else {
            setFormData({
                name: '',
                price: '',
                stock: '0',
                barcode: '',
                category: categories.length > 0 ? categories[0].name : 'Productos'
            });
        }
    }, [product, isOpen, categories]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const payload = {
            ...formData,
            price: parseFloat(formData.price) || 0,
            stock: parseInt(formData.stock) || 0,
            barcode: formData.barcode || null
        };

        const { error } = await onSave(payload);
        setLoading(false);
        if (!error) onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {product ? 'Editar Producto' : 'Nuevo Producto'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-slate-400">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-wider">Nombre del Producto</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white"
                            placeholder="Ej. Aceite 10W40"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-wider">Precio</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white font-bold"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-wider">Stock Actual</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white font-bold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-wider">Categoría</label>
                            <select
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white font-medium appearance-none"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                disabled={categoriesLoading}
                            >
                                {categories.length === 0 ? (
                                    <option value="Productos">Productos</option>
                                ) : (
                                    categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-wider">Código de Barras</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">barcode_scanner</span>
                                <input
                                    type="text"
                                    value={formData.barcode}
                                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white font-mono"
                                    placeholder="Escanea..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-blue-600 font-bold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:scale-95"
                        >
                            {loading ? 'Guardando...' : product ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
