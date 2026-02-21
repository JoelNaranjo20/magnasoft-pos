
// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface ServiceQueueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onItemSelect: (item: any) => void;
}

export const ServiceQueueModal = ({ isOpen, onClose, onItemSelect }: ServiceQueueModalProps) => {
    const [queue, setQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [workers, setWorkers] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [newArrival, setNewArrival] = useState({ license_plate: '', worker_id: '' });
    const [basket, setBasket] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

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
        console.log('🔍 AUDITORÍA ROLES (ServiceQueueModal):', data);
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

    const addToQueue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newArrival.license_plate) return;
        const businessId = useBusinessStore.getState().id;
        if (!businessId) {
            alert('Error: No se ha detectado el ID del negocio. Por favor, reinicie la sesión.');
            return;
        }

        setSaving(true);
        try {
            console.log('Adding to queue for business:', businessId);
            // 1. Create Queue Entry
            const { data: queueData, error: queueError } = await supabase
                .from('service_queue')
                .insert([{
                    business_id: useBusinessStore.getState().id,
                    reference_info: newArrival.license_plate.toUpperCase().trim(),
                    worker_id: newArrival.worker_id || null,
                    status: 'waiting'
                }])
                .select()
                .single();

            if (queueError) throw queueError;

            // 2. Create items
            const items = basket.map(item => ({
                business_id: businessId,
                queue_id: queueData.id,
                service_id: item.type === 'service' ? item.id : null,
                product_id: item.type === 'product' ? item.id : null,
                quantity: 1
            }));

            const { error: itemsError } = await supabase
                .from('service_queue_items')
                .insert(items);

            if (itemsError) throw itemsError;

            setNewArrival({ license_plate: '', worker_id: '' });
            setBasket([]);
            fetchQueue();
        } catch (error: any) {
            console.error('Error adding to queue:', error);
            const msg = error.code === '42501'
                ? 'Error de seguridad (RLS): No tienes permisos para esta operación o el ID de negocio no coincide.'
                : 'Error al agregar a la cola';
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleCheckout = async (item: any) => {
        try {
            const businessId = useBusinessStore.getState().id;

            // Mark as completed in queue
            await supabase
                .from('service_queue')
                .update({ status: 'completed' })
                .eq('id', item.id)
                .eq('business_id', businessId);

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
        if (!confirm('¿Deseas limpiar todos los vehículos en espera? Esta acción marcará todos como cancelados.')) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('service_queue')
                .update({ status: 'cancelled' })
                .eq('business_id', useBusinessStore.getState().id)
                .eq('status', 'waiting');

            // Force refresh of queue count immediately in other components if possible
            // But subscription should handle it. Let's ensure we fetch queue here.
            if (error) throw error;

            // Dispatch event to force update topbar if subscription lags
            window.dispatchEvent(new Event('queue-force-refresh'));

            if (error) throw error;
            fetchQueue();
        } catch (error) {
            console.error('Error clearing queue:', error);
            alert('Error al limpiar la cola');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined !text-3xl">car_repair</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Cola de Espera</h3>
                            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Ingreso de Vehículos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Add New Form */}
                <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Placa</label>
                            <input
                                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-lg font-black uppercase focus:border-primary outline-none transition-all placeholder:text-slate-300 shadow-sm"
                                placeholder="AAA-000"
                                value={newArrival.license_plate}
                                onChange={(e) => setNewArrival({ ...newArrival, license_plate: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Trabajador</label>
                            <select
                                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all shadow-sm appearance-none"
                                value={newArrival.worker_id}
                                onChange={(e) => setNewArrival({ ...newArrival, worker_id: e.target.value })}
                            >
                                <option value="">(Sin asignar)</option>
                                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <button
                            onClick={addToQueue}
                            disabled={saving || !newArrival.license_plate || basket.length === 0}
                            className="h-[52px] px-8 bg-primary hover:bg-primary-hover text-white font-black rounded-2xl shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">add_circle</span>
                            <span>INGRESAR</span>
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Agregar Servicio o Producto</label>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold focus:border-primary outline-none"
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        const [type, id] = e.target.value.split(':');
                                        const source = type === 'service' ? services : products;
                                        const item = source.find(i => i.id === id);
                                        if (item) {
                                            setBasket([...basket, { ...item, type }]);
                                        }
                                        e.target.value = '';
                                    }}
                                >
                                    <option value="">Servicios...</option>
                                    {services.map(s => <option key={s.id} value={`service:${s.id}`}>{s.name} (${s.price.toLocaleString()})</option>)}
                                </select>
                                <select
                                    className="flex-1 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold focus:border-primary outline-none"
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        const [type, id] = e.target.value.split(':');
                                        const source = type === 'service' ? services : products;
                                        const item = source.find(i => i.id === id);
                                        if (item) {
                                            setBasket([...basket, { ...item, type }]);
                                        }
                                        e.target.value = '';
                                    }}
                                >
                                    <option value="">Productos...</option>
                                    {products.map(p => <option key={p.id} value={`product:${p.id}`}>{p.name} (${p.price.toLocaleString()})</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {basket.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {basket.map((item, idx) => (
                                <span key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-sm">
                                    <span className="material-symbols-outlined !text-[16px] text-slate-400">
                                        {item.type === 'service' ? 'local_car_wash' : 'shopping_bag'}
                                    </span>
                                    {item.name}
                                    <button
                                        type="button"
                                        onClick={() => setBasket(basket.filter((_, i) => i !== idx))}
                                        className="text-slate-300 hover:text-rose-500 transition-colors"
                                    >
                                        <span className="material-symbols-outlined !text-[16px]">close</span>
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto p-8 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-4">
                            <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></span>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando cola...</span>
                        </div>
                    ) : queue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] bg-slate-50/30 dark:bg-slate-800/20">
                            <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 opacity-50">
                                <span className="material-symbols-outlined !text-5xl">pending_actions</span>
                            </div>
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No hay vehículos en espera</p>
                            <p className="text-xs text-slate-400 mt-2 opacity-60">Los nuevos ingresos aparecerán aquí arriba.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {queue.map((item) => (
                                <div key={item.id} className="group bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-700/50 hover:border-primary/40 transition-all shadow-sm flex items-center justify-between animate-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex items-center gap-5">
                                        <div className="h-16 w-16 bg-slate-900 border-4 border-slate-800 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-xl tracking-tighter shrink-0">
                                            {item.reference_info}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-slate-900 dark:text-white text-lg tracking-tight uppercase truncate">{item.reference_info}</h4>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {item.items?.map((subItem, idx) => (
                                                    <span key={idx} className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg shrink-0 border border-slate-200/50 dark:border-slate-800/50">
                                                        <span className="material-symbols-outlined !text-[14px] opacity-70">
                                                            {subItem.service_id ? 'local_car_wash' : 'shopping_bag'}
                                                        </span>
                                                        {subItem.service?.name || subItem.product?.name}
                                                    </span>
                                                ))}
                                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 px-2 py-1 bg-primary/5 rounded-lg shrink-0 border border-primary/10">
                                                    <span className="material-symbols-outlined !text-[14px]">person</span>
                                                    {item.worker?.name || 'Pestaña Libre'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            onClick={() => removeArrival(item.id)}
                                            className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"
                                            title="Eliminar de la cola"
                                        >
                                            <span className="material-symbols-outlined !text-[24px]">delete</span>
                                        </button>
                                        <button
                                            onClick={() => handleCheckout(item)}
                                            className="px-6 h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-3 group/btn"
                                        >
                                            <span className="material-symbols-outlined !text-[22px] group-hover/btn:translate-x-1 transition-transform">shopping_cart_checkout</span>
                                            <span className="hidden sm:inline">COBRAR</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Status */}
                <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            {queue.length} VEHÍCULO{queue.length !== 1 ? 'S' : ''} EN FILA
                        </p>
                        {queue.length > 0 && (
                            <button
                                onClick={clearQueue}
                                disabled={saving}
                                className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
                            >
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
        </div>
    );
};
