// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase, ensureSession } from '../../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { Pagination } from '../../ui/Pagination';
import { IconSelector } from '../../ui/IconSelector';
import { InternalUseModal } from './InternalUseModal';

type Product = Database['public']['Tables']['products']['Row'];

export const ProductStockManager = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [internalUseProduct, setInternalUseProduct] = useState<Product | null>(null);

    // Business & Categories
    const businessId = useBusinessStore((state) => state.id);
    const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
    const [subcategories, setSubcategories] = useState<{id: string, name: string, parent_id: string}[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    useEffect(() => {
        if (businessId) {
            const fetchCats = async () => {
                const { data } = await supabase
                    .from('categories')
                    .select('id, name, parent_id')
                    .eq('business_id', businessId)
                    .order('name');
                if (data) {
                    setCategories(data.filter(c => !c.parent_id));
                    setSubcategories(data.filter(c => c.parent_id));
                }
                setLoadingCategories(false);
            };
            fetchCats();
        }
    }, [businessId]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    // Form states
    const user = useSessionStore((state) => state.user);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        cost_price: '',
        stock: '',
        barcode: '',
        category_id: '',
        subcategory_id: '',
        commission_percentage: '',
        commission_type: 'percentage' as 'percentage' | 'fixed',
        commission_amount: '',
        icon: 'package'
    });

    const [margin, setMargin] = useState<string>('');
    const [purchaseHistory, setPurchaseHistory] = useState<{ date: string; cost: number; quantity?: number }[]>([]);
    const [newCostInput, setNewCostInput] = useState('');
    const [newQuantityInput, setNewQuantityInput] = useState('');

    // Barcode scanner logic
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    // Focus input on load for scanner
    useEffect(() => {
        if (inputRef.current && !isEditing) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const fetchProducts = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('products')
            .select('id, name, price, cost_price, stock, barcode, category_id, category, commission_percentage, commission_type, commission_amount, icon, active, metadata, business_id, created_at')
            .eq('business_id', useBusinessStore.getState().id)
            .order('active', { ascending: false }) // Show active first
            .order('name');
        setProducts(data || []);
        setLoading(false);
    };

    const toggleActive = async (product: Product) => {
        await ensureSession();
        const { error } = await supabase
            .from('products')
            .update({ active: !product.active })
            .eq('id', product.id);

        if (error) {
            alert('Error al actualizar el estado');
        } else {
            fetchProducts();
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };

    // Detect Barcode Scanner "Enter"
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && search) {
            const product = products.find(p => p.barcode === search);
            if (product) {
                // If found, open edit/stock modal for this product
                handleEdit(product);
                setSearch(''); // Clear search after scan
            }
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search))
    );

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price.toString(),
            cost_price: (product.cost_price || 0).toString(),
            stock: (product.stock || 0).toString(),
            barcode: product.barcode || '',
            category_id: product.category_id || '',
            subcategory_id: product.metadata?.subcategory_id || '',
            commission_percentage: product.commission_percentage !== null && product.commission_percentage !== undefined 
                ? product.commission_percentage.toString() 
                : '',
            commission_type: (product as any).commission_type || 'percentage',
            commission_amount: (product as any).commission_amount !== null && (product as any).commission_amount !== undefined
                ? (product as any).commission_amount.toString()
                : '',
            icon: product.icon || 'package'
        });
        const meta = product.metadata || {};
        let initialMargin = meta.margin !== undefined && meta.margin !== null ? meta.margin.toString() : '';
        if (initialMargin === '' && product.price > 0 && product.cost_price > 0) {
            initialMargin = (((product.price - product.cost_price) / product.cost_price) * 100).toFixed(1).replace(/\.0$/, '');
        }
        setMargin(initialMargin);
        setPurchaseHistory(meta.purchase_history || []);
        setIsEditing(true);
    };

    const handleAddNew = () => {
        setEditingProduct(null);
        setFormData({
            name: '',
            price: '',
            cost_price: '0',
            stock: '0',
            barcode: search,
            category_id: '',
            subcategory_id: '',
            commission_percentage: '',
            commission_type: 'percentage',
            commission_amount: '',
            icon: 'package'
        });
        setMargin('');
        setPurchaseHistory([]);
        setIsEditing(true);
    };

    const handleAddPurchase = () => {
        const costValue = parseFloat(newCostInput);
        const qtyValue = parseFloat(newQuantityInput) || 1;
        
        if (!isNaN(costValue) && costValue > 0) {
            const newEntry = {
                date: new Date().toISOString().split('T')[0],
                cost: costValue,
                quantity: qtyValue
            };
            setPurchaseHistory((prev) => [newEntry, ...prev]);
            
            setFormData(prev => {
                const currentCost = parseFloat(prev.cost_price) || 0;
                const currentStock = parseInt(prev.stock || '0') || 0;
                
                let newAverageCost = costValue;
                const denominator = currentStock + qtyValue;
                
                // Average between current global cost and the new incoming items
                if (denominator > 0) {
                    newAverageCost = ((currentCost * currentStock) + (costValue * qtyValue)) / denominator;
                } else if (currentCost > 0) {
                    // Fallback only if denominator is 0 (impossible due to qtyValue defaulting off 1, but safe)
                    newAverageCost = (currentCost + costValue) / 2;
                }

                // Recalculate and show the new profit margin based on this new cost
                const pVal = parseFloat(prev.price) || 0;
                if (newAverageCost > 0) {
                    const compMargin = (((pVal - newAverageCost) / newAverageCost) * 100).toFixed(1).replace(/\.0$/, '');
                    setTimeout(() => setMargin(compMargin), 0);
                }

                return {
                    ...prev,
                    cost_price: newAverageCost.toFixed(2),
                    stock: (currentStock + Math.round(qtyValue)).toString()
                };
            });

            setNewCostInput('');
            setNewQuantityInput('');
        }
    };

    const handleRemovePurchase = (index: number) => {
        setPurchaseHistory((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await ensureSession();

        const marginValue = parseFloat(margin) || 0;
        const finalMetadata = {
            ...(editingProduct?.metadata || {}),
            margin: marginValue,
            purchase_history: purchaseHistory,
            subcategory_id: formData.subcategory_id || null
        };

        const payload = {
            name: formData.name,
            price: parseFloat(formData.price) || 0,
            cost_price: parseFloat(formData.cost_price) || 0,
            stock: parseInt(formData.stock) || 0,
            barcode: formData.barcode || null,
            category_id: formData.category_id || null,
            commission_percentage: formData.commission_type === 'percentage' && formData.commission_percentage !== '' && formData.commission_percentage !== null
                ? parseFloat(formData.commission_percentage)
                : null,
            commission_type: formData.commission_type,
            commission_amount: formData.commission_type === 'fixed' && formData.commission_amount !== '' && formData.commission_amount !== null
                ? parseFloat(formData.commission_amount)
                : null,
            business_id: useBusinessStore.getState().id,
            updated_by: user?.id,
            icon: formData.icon,
            metadata: finalMetadata
        };

        try {
            if (editingProduct?.id) {
                const { error } = await supabase
                    .from('products')
                    .update(payload as any)
                    .eq('id', editingProduct.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([payload] as any);
                if (error) throw error;
            }

            await fetchProducts();
            setIsEditing(false);
            setSearch(''); // Clear search/scan
        } catch (error: any) {
            console.error('Error saving product:', error);
            alert('Error al guardar el producto: ' + (error?.message || error?.code || JSON.stringify(error)));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este producto PERMANENTEMENTE?\nEsta acción no se puede deshacer.')) return;
        setLoading(true);
        await ensureSession();
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchProducts();
        } catch (error: any) {
            console.error('Error deleting:', error);
            if (error.code === '23503' || error.code === '409' || error?.status === 409 || error?.message?.includes('409') || error?.message?.toLowerCase()?.includes('conflict')) {
                alert('No se puede eliminar porque tiene historial de ventas u otros registros asociados. Por favor, solo desactívalo.');
            } else {
                alert('Error al eliminar el producto: ' + (error.message || 'Error desconocido'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex-1 max-w-md relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">qr_code_scanner</span>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Escanear código o buscar..."
                        value={search}
                        onChange={handleSearch}
                        onKeyDown={handleKeyDown}
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
                >
                    <span className="material-symbols-outlined">add</span>
                    Nuevo Producto
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Producto</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Categoría</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Código</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Precio</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Stock</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading && products.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-500">Cargando inventario...</td></tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-500">No se encontraron productos.</td></tr>
                        ) : (
                            filteredProducts
                                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                .map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{product.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md">
                                                {categories.find(c => c.id === product.category_id)?.name || product.category || 'Productos'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{product.barcode || '-'}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">${product.price.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${(product.stock || 0) <= 5
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                }`}>
                                                {product.stock || 0} unid.
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleActive(product)}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${product.active
                                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20'
                                                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20'
                                                    }`}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full ${product.active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                                {product.active ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => setInternalUseProduct(product)}
                                                    title="Uso Interno"
                                                    className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">construction</span>
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
            </div >

            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredProducts.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                totalItems={filteredProducts.length}
                itemsPerPage={itemsPerPage}
            />

            {/* Edit/Create Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
                        
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10 rounded-t-2xl">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button type="button" onClick={() => setIsEditing(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <form id="desktop-product-form" onSubmit={handleSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Producto</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary dark:text-white"
                                    />
                                </div>

                                <div className="border-t border-slate-200 dark:border-slate-700 my-4" />

                                {/* Cost, Margin, Price & Profit Grid */}
                                <div className="grid grid-cols-2 gap-4 auto-rows-max">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                                Costo de Compra
                                                {purchaseHistory.length > 0 && <span className="material-symbols-outlined text-[12px] text-blue-500" title="Autocalculado por promedio de historial">auto_awesome</span>}
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.cost_price}
                                                    onChange={e => {
                                                        const newCostStr = e.target.value;
                                                        const cVal = parseFloat(newCostStr) || 0;
                                                        const mVal = parseFloat(margin);
                                                        let newPrice = formData.price;
                                                        
                                                        // Update price to keep margin consistent when cost changes
                                                        if (cVal > 0 && !isNaN(mVal)) {
                                                            const computedPrice = cVal + (cVal * (mVal / 100));
                                                            newPrice = computedPrice.toFixed(0);
                                                        }
                                                        
                                                        setFormData({ ...formData, cost_price: newCostStr, price: newPrice });
                                                    }}
                                                    className="w-full pl-6 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary font-bold dark:text-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Margen de Ganancia (%)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                    placeholder="0"
                                                    value={margin}
                                                    onChange={e => {
                                                        const newMarginStr = e.target.value;
                                                        setMargin(newMarginStr);
                                                        
                                                        const mVal = parseFloat(newMarginStr);
                                                        const cVal = parseFloat(formData.cost_price) || 0;
                                                        if (cVal > 0 && !isNaN(mVal)) {
                                                            const computedPrice = cVal + (cVal * (mVal / 100));
                                                            setFormData(prev => ({ ...prev, price: computedPrice.toFixed(0) }));
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary font-bold text-blue-600 dark:text-blue-400"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio de Venta</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.price}
                                                    onChange={e => {
                                                        const newPriceStr = e.target.value;
                                                        setFormData(prev => ({ ...prev, price: newPriceStr }));
                                                        
                                                        const pVal = parseFloat(newPriceStr) || 0;
                                                        const cVal = parseFloat(formData.cost_price) || 0;
                                                        if (cVal > 0) {
                                                            const compMargin = (((pVal - cVal) / cVal) * 100).toFixed(1).replace(/\.0$/, '');
                                                            setMargin(compMargin);
                                                        } else {
                                                            setMargin('');
                                                        }
                                                    }}
                                                    className="w-full pl-6 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary font-black text-lg dark:text-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800 max-h-[70px]">
                                            <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-0.5">Ganancia Neta</span>
                                            <span className="block text-xl font-black text-emerald-600 dark:text-emerald-400">
                                                ${((parseFloat(formData.price) || 0) - (parseFloat(formData.cost_price) || 0)).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Cost History Expandable Section */}
                                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Historial de Compras</label>
                                        <span className="text-[10px] text-slate-400">Agrega para promediar costo y añadir stock</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={newCostInput}
                                                onChange={(e) => setNewCostInput(e.target.value)}
                                                className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded outline-none focus:border-blue-500 text-sm dark:text-white"
                                                placeholder="Costo u/total"
                                            />
                                        </div>
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={newQuantityInput}
                                                onChange={(e) => setNewQuantityInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddPurchase();
                                                    }
                                                }}
                                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded outline-none focus:border-blue-500 text-sm dark:text-white"
                                                placeholder="Cantidad que entró"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddPurchase}
                                            className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded font-bold text-sm hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                                        >
                                            Añadir
                                        </button>
                                    </div>
                                    {purchaseHistory.length > 0 && (
                                        <div className="mt-2 max-h-24 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900">
                                            {purchaseHistory.map((entry, idx) => (
                                                <div key={idx} className="flex justify-between items-center py-1.5 px-3 border-b border-slate-100 dark:border-slate-800 last:border-0 text-xs">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-slate-400 font-mono">{entry.date}</span>
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">
                                                            ${entry.cost.toLocaleString()} <span className="text-slate-400 font-normal">x {entry.quantity || 1} und</span>
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePurchase(idx)}
                                                        className="text-red-400 hover:text-red-600 focus:outline-none"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-slate-200 dark:border-slate-700 my-4" />

                                {/* Organización & Comisión */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Organización y Comisión</h4>

                                    {/* Row 1: Stock + Barcode */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock Actual</label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                value={formData.stock}
                                                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código de Barras</label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">barcode_scanner</span>
                                                <input
                                                    type="text"
                                                    value={formData.barcode}
                                                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                                    placeholder="Escanea..."
                                                    className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary font-mono dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2: Categoría + Subcategoría */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">folder</span>
                                                <select
                                                    className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary font-bold dark:text-white appearance-none text-sm"
                                                    value={formData.category_id}
                                                    onChange={e => setFormData({ ...formData, category_id: e.target.value, subcategory_id: '' })}
                                                >
                                                    <option value="">Ninguna</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subcategoría</label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">account_tree</span>
                                                <select
                                                    className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary font-bold dark:text-white appearance-none disabled:opacity-40 text-sm"
                                                    value={formData.subcategory_id}
                                                    onChange={e => setFormData({ ...formData, subcategory_id: e.target.value })}
                                                    disabled={!formData.category_id}
                                                >
                                                    <option value="">Ninguna</option>
                                                    {subcategories
                                                        .filter(sub => sub.parent_id === formData.category_id)
                                                        .map(sub => (
                                                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                                                        ))}
                                                </select>
                                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 3: Comisión — single row */}
                                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                                        {/* Label */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="material-symbols-outlined text-slate-400 !text-base">payments</span>
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Comisión</span>
                                        </div>

                                        {/* Toggle pills */}
                                        <div className="flex gap-0.5 p-0.5 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, commission_type: 'percentage' })}
                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all duration-200 ${
                                                    formData.commission_type === 'percentage'
                                                        ? 'bg-indigo-500 text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined !text-xs">percent</span>
                                                %
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, commission_type: 'fixed' })}
                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all duration-200 ${
                                                    formData.commission_type === 'fixed'
                                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined !text-xs">attach_money</span>
                                                Fijo
                                            </button>
                                        </div>

                                        {/* Input — inline */}
                                        {formData.commission_type === 'percentage' ? (
                                            <div className="relative flex-1">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={formData.commission_percentage}
                                                    onChange={e => setFormData({ ...formData, commission_percentage: e.target.value })}
                                                    placeholder="Heredar..."
                                                    className="w-full pl-3 pr-8 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg outline-none focus:border-indigo-400 font-mono text-indigo-700 dark:text-indigo-300 font-bold text-sm"
                                                />
                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 font-black text-sm">%</span>
                                            </div>
                                        ) : (
                                            <div className="relative flex-1">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-sm">$</span>
                                                <input
                                                    type="number"
                                                    step="100"
                                                    min="0"
                                                    value={formData.commission_amount}
                                                    onChange={e => setFormData({ ...formData, commission_amount: e.target.value })}
                                                    placeholder="5000"
                                                    className="w-full pl-6 pr-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg outline-none focus:border-emerald-400 font-mono text-emerald-700 dark:text-emerald-300 font-bold text-sm"
                                                />
                                            </div>
                                        )}

                                        {/* Hint (only for fixed with value) */}
                                        {formData.commission_type === 'fixed' && formData.commission_amount && (
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0 whitespace-nowrap">
                                                💰 ${parseFloat(formData.commission_amount || '0').toLocaleString()} / und.
                                            </p>
                                        )}
                                    </div>
                                </div>

                            </form>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-3 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg font-bold transition-colors border border-transparent"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="desktop-product-form"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
                            >
                                {loading ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear Producto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {internalUseProduct && (
                <InternalUseModal
                    product={internalUseProduct}
                    onClose={() => setInternalUseProduct(null)}
                    onSuccess={fetchProducts}
                />
            )}
        </div>
    );
};
