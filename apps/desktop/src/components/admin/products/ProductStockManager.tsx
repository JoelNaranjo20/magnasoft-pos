// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { Pagination } from '../../ui/Pagination';
import { IconSelector } from '../../ui/IconSelector';
// import type { Database } from '../../../types/supabase';

type Product = Database['public']['Tables']['products']['Row'];

export const ProductStockManager = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

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
        category: 'Productos',
        icon: 'package'
    });

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
            .select('*')
            .eq('business_id', useBusinessStore.getState().id)
            .order('active', { ascending: false }) // Show active first
            .order('name');
        setProducts(data || []);
        setLoading(false);
    };

    const toggleActive = async (product: Product) => {
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
            category: product.category || 'Productos',
            icon: product.icon || 'package'
        });
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
            category: 'Productos',
            icon: 'package'
        });
        setIsEditing(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            name: formData.name,
            price: parseFloat(formData.price) || 0,
            cost_price: parseFloat(formData.cost_price) || 0,
            stock: parseInt(formData.stock) || 0,
            barcode: formData.barcode || null,
            category: formData.category || 'Productos',
            business_id: useBusinessStore.getState().id,
            updated_by: user?.id,
            icon: formData.icon
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
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error al guardar el producto');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este producto PERMANENTEMENTE?\nEsta acción no se puede deshacer.')) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchProducts();
        } catch (error: any) {
            console.error('Error deleting:', error);
            if (error.code === '23503') {
                alert('No se puede eliminar porque tiene historial. Por favor, solo desactívalo.');
            } else {
                alert('Error al eliminar el producto');
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
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Cargando inventario...</td></tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No se encontraron productos.</td></tr>
                        ) : (
                            filteredProducts
                                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                .map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{product.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md">
                                                {product.category || 'Productos'}
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
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl p-6 animate-in zoom-in-95">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
                            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                        </h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Producto</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary"
                                />
                            </div>

                            {/* Cost, Margin, Price & Profit Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Costo de Compra</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="0.01"
                                                value={formData.cost_price}
                                                onChange={e => setFormData({ ...formData, cost_price: e.target.value })}
                                                className="w-full pl-6 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Margen de Ganancia (%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder="0"
                                                value={(() => {
                                                    const price = parseFloat(formData.price) || 0;
                                                    const cost = parseFloat(formData.cost_price) || 0;
                                                    if (cost === 0) return '';
                                                    return Math.round(((price - cost) / cost) * 100).toString();
                                                })()}
                                                onChange={e => {
                                                    const margin = parseFloat(e.target.value) || 0;
                                                    const cost = parseFloat(formData.cost_price) || 0;
                                                    if (cost > 0) {
                                                        const newPrice = cost + (cost * (margin / 100));
                                                        setFormData({ ...formData, price: newPrice.toFixed(0) });
                                                    }
                                                }}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary font-bold text-emerald-600"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
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
                                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                className="w-full pl-6 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary font-black text-lg"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                        <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-0.5">Ganancia Neta</span>
                                        <span className="block text-xl font-black text-emerald-600 dark:text-emerald-400">
                                            ${((parseFloat(formData.price) || 0) - (parseFloat(formData.cost_price) || 0)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Stock, Category & Barcode Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock Actual</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.stock}
                                        onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                                        <select
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary font-bold"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="Lavado">🧼 Lavado</option>
                                            <option value="Serviteca">🛞 Serviteca</option>
                                            <option value="Mecánica">🔧 Mecánica</option>
                                            <option value="Productos">🛒 Productos</option>
                                        </select>
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
                                                className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};
