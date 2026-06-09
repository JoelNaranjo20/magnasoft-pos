
// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface ServiceQueueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onItemSelect: (item: any) => void;
}

export const ServiceQueueModal = ({ isOpen, onClose, onItemSelect }: ServiceQueueModalProps) => {
    // Queue entry states
    const [queue, setQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [workers, setWorkers] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [newArrival, setNewArrival] = useState({ license_plate: '', worker_id: '' });
    const [basket, setBasket] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    // Search for item selector
    const [itemSearch, setItemSearch] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const itemSearchRef = useRef<HTMLInputElement>(null);

    // Edit mode for queue entries
    const [editingEntry, setEditingEntry] = useState<any | null>(null);
    const [editData, setEditData] = useState({ license_plate: '', worker_id: '' });
    const [editBasket, setEditBasket] = useState<any[]>([]);
    const [editItemSearch, setEditItemSearch] = useState('');
    const [showEditDropdown, setShowEditDropdown] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchQueue();
            fetchWorkers();
            fetchServices();
            fetchProducts();
        }
    }, [isOpen]);

    const fetchWorkers = async () => {
        const { data } = await supabase
            .from('workers')
            .select('id, name, roles(name)')
            .eq('business_id', useBusinessStore.getState().id)
            .eq('active', true);
        setWorkers(data || []);
    };

    const fetchServices = async () => {
        const { data } = await supabase
            .from('services')
            .select('*')
            .eq('business_id', useBusinessStore.getState().id)
            .eq('active', true)
            .order('name');
        setServices(data || []);
    };

    const fetchProducts = async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', useBusinessStore.getState().id)
            .eq('active', true)
            .order('name');
        setProducts(data || []);
    };

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('service_queue')
                .select(`
                    *,
                    worker:workers(name),
                    items:service_queue_items(
                        *,
                        service:services(*),
                        product:products(*)
                    )
                `)
                .eq('business_id', useBusinessStore.getState().id)
                .eq('status', 'waiting')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setQueue(data || []);
        } catch (error) {
            console.error('Error fetching queue:', error);
        } finally {
            setLoading(false);
        }
    };

    // ----- Searchable item list -----
    const allItems = [
        ...services.map(s => ({ ...s, type: 'service', label: s.name, icon: 'local_car_wash', badge: 'Servicio' })),
        ...products.map(p => ({ ...p, type: 'product', label: p.name, icon: 'shopping_bag', badge: 'Producto' })),
    ];

    const filteredItems = itemSearch.trim()
        ? allItems.filter(i => i.label.toLowerCase().includes(itemSearch.toLowerCase()))
        : allItems;

    const filteredEditItems = editItemSearch.trim()
        ? allItems.filter(i => i.label.toLowerCase().includes(editItemSearch.toLowerCase()))
        : allItems;

    const addItemToBasket = (item: any) => {
        if (basket.some(b => b.id === item.id && b.type === item.type)) return; // no duplicates
        setBasket(prev => [...prev, item]);
        setItemSearch('');
        setShowItemDropdown(false);
    };

    const addItemToEditBasket = (item: any) => {
        if (editBasket.some(b => b.id === item.id && b.type === item.type)) return;
        setEditBasket(prev => [...prev, item]);
        setEditItemSearch('');
        setShowEditDropdown(false);
    };

    // ----- Proceed to queue insertion -----
    const finalizeAddToQueue = async () => {
        const businessId = useBusinessStore.getState().id;
        if (!businessId) return;

        setSaving(true);
        try {
            const { data: queueData, error: queueError } = await supabase
                .from('service_queue')
                .insert([{
                    business_id: businessId,
                    reference_info: newArrival.license_plate.toUpperCase().trim(),
                    worker_id: newArrival.worker_id || null,
                    status: 'waiting'
                }])
                .select()
                .single();

            if (queueError) throw queueError;

            if (basket.length > 0) {
                const items = basket.map(item => ({
                    business_id: businessId,
                    queue_id: queueData.id,
                    service_id: item.type === 'service' ? item.id : null,
                    product_id: item.type === 'product' ? item.id : null,
                    quantity: 1
                }));
                await supabase.from('service_queue_items').insert(items);
            }

            setNewArrival({ license_plate: '', worker_id: '' });
            setBasket([]);
            setItemSearch('');
            fetchQueue();
        } catch (error: any) {
            console.error('🔥 FULL ERROR adding to queue:', JSON.stringify(error, null, 2));
            console.error('Error adding to queue:', error);
            alert(error.code === '42501'
                ? 'Error de seguridad (RLS). Verifica permisos.'
                : `Error al agregar a la cola: ${error.message || JSON.stringify(error)}`);
        } finally {
            setSaving(false);
        }
    };

    // ----- Check before adding to queue -----
    const addToQueue = async (e: React.FormEvent) => {
        e.preventDefault();
        const plate = newArrival.license_plate.trim().toUpperCase();
        if (!plate) return;
        await finalizeAddToQueue();
    };

    const handleCheckout = async (item: any) => {
        try {
            await supabase
                .from('service_queue')
                .update({ status: 'completed' })
                .eq('id', item.id)
                .eq('business_id', useBusinessStore.getState().id);
            onItemSelect(item);
            onClose();
        } catch (error) {
            console.error('Error in checkout:', error);
        }
    };

    const removeArrival = async (id: string) => {
        if (!confirm('¿Eliminar de la cola?')) return;
        try {
            await supabase.from('service_queue').update({ status: 'cancelled' }).eq('id', id);
            fetchQueue();
        } catch (error) {
            console.error('Error removing arrival:', error);
        }
    };

    const clearQueue = async () => {
        if (!confirm('¿Deseas limpiar todos los vehículos en espera?')) return;
        setSaving(true);
        try {
            await supabase
                .from('service_queue')
                .update({ status: 'cancelled' })
                .eq('business_id', useBusinessStore.getState().id)
                .eq('status', 'waiting');
            window.dispatchEvent(new Event('queue-force-refresh'));
            fetchQueue();
        } catch (error) {
            console.error('Error clearing queue:', error);
            alert('Error al limpiar la cola');
        } finally {
            setSaving(false);
        }
    };

    // ----- Edit queue entry -----
    const openEdit = (entry: any) => {
        setEditingEntry(entry);
        setEditData({ license_plate: entry.reference_info, worker_id: entry.worker_id || '' });
        // Pre-fill basket from current items
        const currentItems = (entry.items || []).map((si: any) => {
            if (si.service) return { ...si.service, type: 'service', _queue_item_id: si.id };
            if (si.product) return { ...si.product, type: 'product', _queue_item_id: si.id };
            return null;
        }).filter(Boolean);
        setEditBasket(currentItems);
        setEditItemSearch('');
    };

    const saveEdit = async () => {
        if (!editingEntry || !editData.license_plate.trim()) return;
        setSavingEdit(true);
        const businessId = useBusinessStore.getState().id;
        try {
            // 1. Update main entry
            await supabase
                .from('service_queue')
                .update({
                    reference_info: editData.license_plate.toUpperCase().trim(),
                    worker_id: editData.worker_id || null,
                })
                .eq('id', editingEntry.id);

            // 2. Delete all old items
            await supabase
                .from('service_queue_items')
                .delete()
                .eq('queue_id', editingEntry.id);

            // 3. Insert new items from editBasket
            if (editBasket.length > 0) {
                const items = editBasket.map(item => ({
                    business_id: businessId,
                    queue_id: editingEntry.id,
                    service_id: item.type === 'service' ? item.id : null,
                    product_id: item.type === 'product' ? item.id : null,
                    quantity: 1,
                }));
                await supabase.from('service_queue_items').insert(items);
            }

            setEditingEntry(null);
            fetchQueue();
        } catch (err: any) {
            console.error('Error saving edit:', err);
            alert('Error al guardar cambios');
        } finally {
            setSavingEdit(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-11 w-11 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined !text-[26px]">car_repair</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Cola de Espera</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Ingreso y gestión de vehículos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Add New Form */}
                <div className="px-8 py-5 bg-slate-50/50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 space-y-4 shrink-0">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end">
                        {/* Plate */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Placa</label>
                            <input
                                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-lg font-black uppercase focus:border-primary outline-none transition-all placeholder:text-slate-300 shadow-sm"
                                placeholder="AAA-000"
                                value={newArrival.license_plate}
                                onChange={(e) => setNewArrival({ ...newArrival, license_plate: e.target.value })}
                                autoFocus
                            />
                        </div>
                        {/* Worker */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Trabajador</label>
                            <select
                                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all shadow-sm appearance-none"
                                value={newArrival.worker_id}
                                onChange={(e) => setNewArrival({ ...newArrival, worker_id: e.target.value })}
                            >
                                <option value="">(Sin asignar)</option>
                                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        {/* Add button */}
                        <button
                            onClick={addToQueue}
                            disabled={saving || !newArrival.license_plate}
                            className="h-[52px] px-7 bg-primary hover:bg-primary-hover text-white font-black rounded-2xl shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined">add_circle</span>
                            INGRESAR
                        </button>
                    </div>

                    {/* Searchable service/product picker */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                            Agregar Servicio o Producto
                        </label>
                        <div className="relative">
                            <div className="flex items-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 gap-3 focus-within:border-primary transition-all shadow-sm">
                                <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">search</span>
                                <input
                                    ref={itemSearchRef}
                                    type="text"
                                    placeholder="Escribe para buscar servicio o producto..."
                                    value={itemSearch}
                                    onFocus={() => setShowItemDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowItemDropdown(false), 150)}
                                    onChange={(e) => { setItemSearch(e.target.value); setShowItemDropdown(true); }}
                                    className="flex-1 outline-none bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 placeholder:font-normal"
                                />
                                {itemSearch && (
                                    <button onClick={() => { setItemSearch(''); setShowItemDropdown(false); }} className="text-slate-400 hover:text-slate-600">
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                )}
                            </div>

                            {showItemDropdown && filteredItems.length > 0 && (
                                <div className="absolute z-50 top-[calc(100%+6px)] left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar">
                                    {/* Services group */}
                                    {filteredItems.filter(i => i.type === 'service').length > 0 && (
                                        <div>
                                            <p className="px-4 pt-3 pb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Servicios</p>
                                            {filteredItems.filter(i => i.type === 'service').map(item => (
                                                <button
                                                    key={`s-${item.id}`}
                                                    onMouseDown={() => addItemToBasket(item)}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                                                >
                                                    <span className="material-symbols-outlined text-primary !text-[18px] shrink-0">local_car_wash</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.name}</p>
                                                    </div>
                                                    <span className="text-xs font-black text-emerald-600 shrink-0">${item.price?.toLocaleString()}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {/* Products group */}
                                    {filteredItems.filter(i => i.type === 'product').length > 0 && (
                                        <div>
                                            <p className="px-4 pt-3 pb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Productos</p>
                                            {filteredItems.filter(i => i.type === 'product').map(item => (
                                                <button
                                                    key={`p-${item.id}`}
                                                    onMouseDown={() => addItemToBasket(item)}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                                                >
                                                    <span className="material-symbols-outlined text-amber-500 !text-[18px] shrink-0">shopping_bag</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.name}</p>
                                                    </div>
                                                    <span className="text-xs font-black text-emerald-600 shrink-0">${item.price?.toLocaleString()}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {filteredItems.length === 0 && (
                                        <p className="px-4 py-4 text-sm text-slate-400 text-center">Sin resultados para "{itemSearch}"</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Basket chips */}
                        {basket.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {basket.map((item, idx) => (
                                    <span key={idx} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm border ${item.type === 'service' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700/50 dark:text-amber-400'}`}>
                                        <span className="material-symbols-outlined !text-[14px]">{item.type === 'service' ? 'local_car_wash' : 'shopping_bag'}</span>
                                        {item.name}
                                        <button type="button" onClick={() => setBasket(basket.filter((_, i) => i !== idx))} className="opacity-50 hover:opacity-100 ml-0.5 transition-opacity">
                                            <span className="material-symbols-outlined !text-[14px]">close</span>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Queue List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-4">
                            <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></span>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando cola...</span>
                        </div>
                    ) : queue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] bg-slate-50/30 dark:bg-slate-800/20 gap-3">
                            <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center opacity-50">
                                <span className="material-symbols-outlined !text-5xl">pending_actions</span>
                            </div>
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No hay vehículos en espera</p>
                            <p className="text-xs text-slate-400 opacity-60">Los nuevos ingresos aparecerán aquí.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {queue.map((item) => (
                                <div key={item.id} className="group bg-white dark:bg-slate-800 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-700/50 hover:border-primary/30 transition-all shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                                    <div className="p-5 flex items-center justify-between gap-4">
                                        {/* Plate badge */}
                                        <div className="h-14 w-14 bg-slate-900 border-4 border-slate-800 rounded-2xl flex items-center justify-center text-white font-black text-[11px] shadow-xl tracking-tighter shrink-0 text-center leading-tight">
                                            {item.reference_info}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-slate-900 dark:text-white text-base tracking-tight uppercase flex items-center gap-2">
                                                {item.reference_info}
                                                {/* Visual tag for Publico General check (in this case, just rely on standard reference_info) */}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                {item.items?.map((si: any, idx: number) => (
                                                    <span key={idx} className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 px-2 py-1 rounded-lg shrink-0 ${si.service_id ? 'text-primary bg-primary/5 border border-primary/10' : 'text-amber-600 bg-amber-50 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/50'}`}>
                                                        <span className="material-symbols-outlined !text-[13px]">{si.service_id ? 'local_car_wash' : 'shopping_bag'}</span>
                                                        {si.service?.name || si.product?.name}
                                                    </span>
                                                ))}
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0">
                                                    <span className="material-symbols-outlined !text-[13px]">person</span>
                                                    {item.worker?.name || 'Sin asignar'}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => openEdit(item)}
                                                title="Editar"
                                                className="p-2.5 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                            >
                                                <span className="material-symbols-outlined !text-[20px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => removeArrival(item.id)}
                                                title="Eliminar"
                                                className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"
                                            >
                                                <span className="material-symbols-outlined !text-[20px]">delete</span>
                                            </button>
                                            <button
                                                onClick={() => handleCheckout(item)}
                                                className="px-5 h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined !text-[20px]">shopping_cart_checkout</span>
                                                <span className="hidden sm:inline text-sm">COBRAR</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-5">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            {queue.length} VEHÍCULO{queue.length !== 1 ? 'S' : ''} EN FILA
                        </p>
                        {queue.length > 0 && (
                            <button onClick={clearQueue} disabled={saving} className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest flex items-center gap-1 transition-colors">
                                <span className="material-symbols-outlined !text-[16px]">delete_sweep</span>
                                Limpiar Todo
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Sincronización Activa</span>
                    </div>
                </div>
            </div>

            {/* Edit Entry Modal */}
            {editingEntry && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary !text-[22px]">edit</span>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white">Editar Vehículo</h3>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{editingEntry.reference_info}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingEntry(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Plate */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Placa</label>
                                <input
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-lg font-black uppercase focus:border-primary outline-none transition-all"
                                    value={editData.license_plate}
                                    onChange={(e) => setEditData({ ...editData, license_plate: e.target.value })}
                                />
                            </div>
                            {/* Worker */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Trabajador</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all appearance-none"
                                    value={editData.worker_id}
                                    onChange={(e) => setEditData({ ...editData, worker_id: e.target.value })}
                                >
                                    <option value="">(Sin asignar)</option>
                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            {/* Services / Products with search */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Servicios y Productos</label>
                                <div className="relative">
                                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 gap-3 focus-within:border-primary transition-all">
                                        <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0">search</span>
                                        <input
                                            type="text"
                                            placeholder="Buscar servicio o producto..."
                                            value={editItemSearch}
                                            onFocus={() => setShowEditDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowEditDropdown(false), 150)}
                                            onChange={(e) => { setEditItemSearch(e.target.value); setShowEditDropdown(true); }}
                                            className="flex-1 outline-none bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 placeholder:font-normal"
                                        />
                                    </div>
                                    {showEditDropdown && (
                                        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                                            {filteredEditItems.filter(i => i.type === 'service').length > 0 && (
                                                <div>
                                                    <p className="px-4 pt-3 pb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Servicios</p>
                                                    {filteredEditItems.filter(i => i.type === 'service').map(item => (
                                                        <button key={`es-${item.id}`} onMouseDown={() => addItemToEditBasket(item)}
                                                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left">
                                                            <span className="material-symbols-outlined text-primary !text-[16px]">local_car_wash</span>
                                                            <span className="text-sm font-bold flex-1 truncate">{item.name}</span>
                                                            <span className="text-xs text-emerald-600 font-black">${item.price?.toLocaleString()}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {filteredEditItems.filter(i => i.type === 'product').length > 0 && (
                                                <div>
                                                    <p className="px-4 pt-3 pb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Productos</p>
                                                    {filteredEditItems.filter(i => i.type === 'product').map(item => (
                                                        <button key={`ep-${item.id}`} onMouseDown={() => addItemToEditBasket(item)}
                                                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left">
                                                            <span className="material-symbols-outlined text-amber-500 !text-[16px]">shopping_bag</span>
                                                            <span className="text-sm font-bold flex-1 truncate">{item.name}</span>
                                                            <span className="text-xs text-emerald-600 font-black">${item.price?.toLocaleString()}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Edit basket chips */}
                                {editBasket.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {editBasket.map((item, idx) => (
                                            <span key={idx} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${item.type === 'service' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                                <span className="material-symbols-outlined !text-[13px]">{item.type === 'service' ? 'local_car_wash' : 'shopping_bag'}</span>
                                                {item.name}
                                                <button type="button" onClick={() => setEditBasket(editBasket.filter((_, i) => i !== idx))} className="opacity-60 hover:opacity-100 ml-0.5">
                                                    <span className="material-symbols-outlined !text-[13px]">close</span>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setEditingEntry(null)} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={saveEdit} disabled={savingEdit || !editData.license_plate.trim()} className="flex-1 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-black shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {savingEdit ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined !text-[18px]">save</span>}
                                    {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
