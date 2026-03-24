'use client';

import { useState, useEffect, useMemo } from 'react';
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

    // Data handling
    const initialMetadata = product?.metadata || {};
    
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        stock: '',
        barcode: '',
        category: 'Productos'
    });

    const [margin, setMargin] = useState<string>('');
    const [purchaseHistory, setPurchaseHistory] = useState<{ date: string; cost: number }[]>([]);
    
    const [newCostInput, setNewCostInput] = useState('');
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
            const meta = product.metadata || {};
            setMargin(meta.margin ? meta.margin.toString() : '');
            setPurchaseHistory(meta.purchase_history || []);
        } else {
            setFormData({
                name: '',
                price: '',
                stock: '0',
                barcode: '',
                category: categories.length > 0 ? categories[0].name : 'Productos'
            });
            setMargin('');
            setPurchaseHistory([]);
        }
    }, [product, isOpen, categories]);

    // Calcular el promedio del costo de manera automatica
    const averageCost = useMemo(() => {
        if (purchaseHistory.length === 0) return 0;
        const total = purchaseHistory.reduce((acc, curr) => acc + curr.cost, 0);
        return total / purchaseHistory.length;
    }, [purchaseHistory]);

    // Recalcular el final price cuando el margin o el averageCost cambian
    useEffect(() => {
        if (margin && averageCost > 0) {
            const marginValue = parseFloat(margin) || 0;
            const computedPrice = averageCost * (1 + marginValue / 100);
            
            // Only update if mathematically correct to avoid cursor jump while typing manual price
            setFormData((prev) => ({
                ...prev,
                price: computedPrice.toFixed(0) // Redondear a sin decimales para POS (o 2 decs si aplica)
            }));
        }
    }, [margin, averageCost]);

    if (!isOpen) return null;

    const handleAddPurchase = () => {
        const costValue = parseFloat(newCostInput);
        if (!isNaN(costValue) && costValue > 0) {
            const newEntry = {
                date: new Date().toISOString().split('T')[0],
                cost: costValue
            };
            setPurchaseHistory((prev) => [newEntry, ...prev]);
            setNewCostInput('');
        }
    };

    const handleRemovePurchase = (index: number) => {
        setPurchaseHistory((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const marginValue = parseFloat(margin) || 0;
        
        // Mantener otros campos del metadata intactos si existieran
        const finalMetadata = {
            ...(product?.metadata || {}),
            margin: marginValue,
            purchase_history: purchaseHistory
        };

        const payload = {
            name: formData.name,
            price: parseFloat(formData.price) || 0,
            stock: parseInt(formData.stock) || 0,
            barcode: formData.barcode || null,
            category: formData.category,
            cost_price: averageCost,
            metadata: finalMetadata
        };

        const { error } = await onSave(payload);
        setLoading(false);
        if (!error) onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10 flex-none">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {product ? 'Editar Producto o Servicio' : 'Nuevo Producto / Servicio'}
                    </h3>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-slate-400">close</span>
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <form id="product-form" onSubmit={handleSubmit} className="p-6 space-y-5">
                        
                        {/* Información Básica */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-wider">Nombre</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white font-medium"
                                placeholder="Ej. Aceite 10W40"
                            />
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

                        <div className="border-t border-slate-200 dark:border-slate-700 my-4" />

                        {/* Estratégia de Precios */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-blue-500">price_change</span>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200">Estrategia de Precios / Costos</h4>
                            </div>

                            {/* Historial de Compras para Costo Promedio */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Historial de Costos de Compra</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCostInput}
                                            onChange={(e) => setNewCostInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddPurchase();
                                                }
                                            }}
                                            className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm text-slate-900 dark:text-white"
                                            placeholder="Costo de nueva mercancía..."
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddPurchase}
                                        className="px-3 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 font-bold text-sm transition-colors flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">add</span>
                                        Añadir
                                    </button>
                                </div>

                                {/* Lista de Costos Promediada */}
                                {purchaseHistory.length > 0 && (
                                    <div className="mt-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <div className="max-h-32 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                            {purchaseHistory.map((entry, idx) => (
                                                <div key={idx} className="flex justify-between items-center py-1.5 px-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-slate-400 text-xs font-mono">{entry.date}</span>
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">${entry.cost.toLocaleString()}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePurchase(idx)}
                                                        className="text-red-400 hover:text-red-600"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-slate-100 dark:bg-slate-900/50 p-2.5 px-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-700">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Costo Promedio (Base):</span>
                                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                                ${averageCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Calculadora Precio Final */}
                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-wider">Margen de Ganancia</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={margin}
                                            onChange={e => setMargin(e.target.value)}
                                            className="w-full pl-4 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white"
                                            placeholder="Ej. 30"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1 tracking-wider flex items-center gap-1">
                                        Precio Final
                                        {margin && purchaseHistory.length > 0 && (
                                            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                        )}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 font-bold">$</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                                            className="w-full pl-8 pr-4 py-2.5 bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-green-700 dark:text-green-400 font-black text-lg"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stock Input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-wider">Stock Físico Actual</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white font-bold max-w-[200px]"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Al facturar, este número bajará automáticamente.
                            </p>
                        </div>
                    </form>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-3 flex-none">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl font-bold transition-colors border border-transparent"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="product-form"
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-blue-600 font-bold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:scale-95"
                    >
                        {loading ? 'Guardando...' : product ? 'Actualizar Cambios' : 'Guardar Producto'}
                    </button>
                </div>
            </div>
        </div>
    );
}
