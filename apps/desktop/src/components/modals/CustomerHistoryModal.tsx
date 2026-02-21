
// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { version } from '../../../package.json';

interface CustomerHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: {
        id: string;
        name: string;
        phone: string | null;
        loyalty_points: number;
    } | null;
    vehicle: {
        id: string;
        license_plate: string;
        brand: string | null;
        model: string | null;
        type?: string;
    } | null;
    initialTab?: 'ventas' | 'clinico';
}

export const CustomerHistoryModal = ({ isOpen, onClose, customer, vehicle, initialTab = 'ventas' }: CustomerHistoryModalProps) => {
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'ventas' | 'clinico'>(initialTab);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    useEffect(() => {
        if (isOpen && (customer || vehicle)) {
            fetchHistory();
        }
    }, [isOpen, customer, vehicle]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('sales')
                .select(`
                    id,
                    created_at,
                    total_amount,
                    payment_method,
                    customer_id,
                    vehicle_id,
                    sale_items (
                        id,
                        name,
                        quantity,
                        unit_price,
                        service_type,
                        worker_id,
                        workers:workers(name)
                    )
                `)
                .order('created_at', { ascending: false });

            if (vehicle) {
                query = query.eq('vehicle_id', vehicle.id);
            } else if (customer) {
                query = query.eq('customer_id', customer.id);
            }

            const { data, error } = await query.limit(50); // Increased limit for clinical record
            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const isTechnicalService = (item: any) => {
        if (!item.service_type || item.service_type === 'inventory_sales') return false;

        const type = item.service_type;
        const name = item.name.toLowerCase();

        // Exclude cosmetic/wash services
        if (
            type === 'car_wash' ||
            type === 'motorcycle_wash' ||
            name.includes('lavado') ||
            name.includes('brillado') ||
            name.includes('polichado')
        ) {
            return false;
        }

        return true;
    };

    const stats = useMemo(() => {
        const totalVisits = sales.length;

        // Extract all technical services (no wash)
        const allItems = sales.flatMap(s => (s.sale_items || []));
        const technicalServices = allItems.filter(i => isTechnicalService(i));

        // Find most frequent service
        const frequency: Record<string, number> = {};
        technicalServices.forEach(s => {
            frequency[s.name] = (frequency[s.name] || 0) + 1;
        });

        const mostFrequent = Object.entries(frequency).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        return { totalVisits, mostFrequent, servicesCount: technicalServices.length };
    }, [sales]);

    const getServiceIcon = (name: string, type?: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('lavado')) return 'local_car_wash';
        if (lowerName.includes('aceite')) return 'oil_barrel';
        if (lowerName.includes('alineacion') || lowerName.includes('alineación')) return 'build_circle';
        if (lowerName.includes('frenos')) return 'settings_input_component';
        if (lowerName.includes('motor')) return 'engine';
        if (lowerName.includes('llanta') || lowerName.includes('neumatico')) return 'tire_repair';

        // Default by type
        if (type === 'car_wash' || type === 'motorcycle_wash') return 'local_car_wash';
        if (type === 'alignment') return 'build_circle';
        if (type === 'mechanics') return 'home_repair_service';

        return 'handyman';
    };

    const handlePrint = async () => {
        if (window.electronAPI) {
            const printerName = await window.electronAPI.storageGet('selected-printer');
            window.electronAPI.printReceipt({
                title: activeTab === 'ventas' ? 'Historial de Ventas' : 'Récord Clínico',
                customer: customer?.name || 'Cliente General',
                vehicle: vehicle?.license_plate || 'N/A',
                items: activeTab === 'ventas'
                    ? sales.map(s => ({ date: new Date(s.created_at).toLocaleDateString(), total: s.total_amount }))
                    : sales.flatMap(s => s.sale_items?.filter(i => isTechnicalService(i)) || []).map(i => ({ name: i.name })),
                printerName: printerName || undefined,
                silent: !!printerName
            }).catch(() => window.print());
        } else {
            window.print();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-6 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-5">
                            <div className="h-16 w-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary shadow-inner">
                                <span className="material-symbols-outlined !text-4xl">
                                    {activeTab === 'ventas' ? 'history' : 'medical_services'}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight flex items-center gap-3">
                                    {activeTab === 'ventas' ? 'Historial de Visitas' : 'Récord Clínico Automotriz'}
                                    {vehicle && (
                                        <div className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-black text-white relative flex items-center gap-1 shadow-sm h-fit">
                                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-yellow-400"></div>
                                            {vehicle.license_plate}
                                        </div>
                                    )}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium tracking-wide flex items-center gap-4 mt-1">
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined !text-[16px] text-primary">person</span>
                                        {customer?.name || 'Cliente General'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined !text-[16px] text-amber-500">stars</span>
                                        {customer?.loyalty_points || 0} Puntos
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlePrint}
                                className="h-12 w-12 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                                title="Imprimir"
                            >
                                <span className="material-symbols-outlined">print</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="h-12 w-12 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats Blocks */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visitas Totales</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{stats.totalVisits}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Servicios Técnicos</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{stats.servicesCount}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Servicio Frecuente</p>
                            <p className="text-sm font-black text-primary uppercase truncate mt-2">{stats.mostFrequent}</p>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex p-1 bg-slate-200/50 dark:bg-slate-900/50 rounded-2xl w-fit">
                        <button
                            onClick={() => setActiveTab('ventas')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'ventas' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <span className="material-symbols-outlined !text-[18px]">receipt_long</span>
                            HISTORIAL DE VENTAS
                        </button>
                        <button
                            onClick={() => setActiveTab('clinico')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'clinico' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <span className="material-symbols-outlined !text-[18px]">assignment</span>
                            RÉCORD CLÍNICO
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <span className="w-12 h-12 border-[5px] border-primary/20 border-t-primary rounded-full animate-spin"></span>
                            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs animate-pulse">Consultando el archivo...</p>
                        </div>
                    ) : sales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50 dark:bg-slate-800/20 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined !text-7xl mb-4 opacity-10">history_toggle_off</span>
                            <p className="text-xl font-black uppercase tracking-widest opacity-30">Sin actividad registrada</p>
                            <p className="text-sm font-medium opacity-40 mt-1">Los nuevos servicios y ventas se archivarán aquí.</p>
                        </div>
                    ) : activeTab === 'ventas' ? (
                        <div className="space-y-4">
                            {sales.map((sale) => (
                                <div key={sale.id} className="group p-6 rounded-[2rem] bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/50 hover:border-primary/40 transition-all shadow-sm hover:shadow-xl hover:shadow-primary/5">
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-1 flex bg-primary/20 rounded-full group-hover:bg-primary transition-colors"></div>
                                            <div>
                                                <span className="text-lg font-black text-slate-900 dark:text-white block uppercase tracking-tight">
                                                    {new Date(sale.created_at).toLocaleDateString('es-ES', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[11px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                                                        <span className="material-symbols-outlined !text-sm">schedule</span>
                                                        {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className="text-[11px] text-slate-300 dark:text-slate-600 font-black tracking-widest">#{sale.id.slice(0, 8).toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className="block text-2xl font-black text-slate-900 dark:text-white tabular-nums">${sale.total_amount.toLocaleString()}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${sale.payment_method === 'credit'
                                                    ? 'bg-rose-500 text-white animate-pulse'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                                    }`}>
                                                    {sale.payment_method === 'credit' ? 'Crédito / Fiado' :
                                                        sale.payment_method === 'cash' ? 'Efectivo' :
                                                            sale.payment_method === 'card' ? 'Tarjeta' : 'Transf.'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        {sale.sale_items?.map((item: any) => (
                                            <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 group/item hover:bg-white dark:hover:bg-slate-800 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover/item:text-primary transition-colors">
                                                        <span className="material-symbols-outlined !text-xl">{getServiceIcon(item.name, item.service_type)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{item.name}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                            {item.quantity} UNIDAD(ES) · {item.workers?.name || 'Venta Rápida'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-black text-slate-900 dark:text-white">${(item.unit_price * item.quantity).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-12 relative">
                            {/* Timeline line */}
                            <div className="absolute left-[27px] top-4 bottom-4 w-1 bg-slate-100 dark:bg-slate-800 rounded-full"></div>

                            {sales.filter(s => s.sale_items?.some(i => isTechnicalService(i))).map((sale, idx) => (
                                <div key={sale.id} className="relative pl-16">
                                    {/* Timeline dot */}
                                    <div className="absolute left-[19px] top-6 size-[18px] rounded-full bg-white dark:bg-slate-900 border-4 border-primary z-10"></div>

                                    <div className="mb-6 flex items-center gap-4">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                                            {new Date(sale.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800/50"></div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {sale.sale_items?.filter(i => isTechnicalService(i)).map((item: any) => (
                                            <div key={item.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center gap-6 group hover:border-primary/40 transition-all shadow-sm">
                                                <div className="flex-none flex items-center gap-4 min-w-[200px]">
                                                    <div className="w-16 h-16 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                                                        <span className="material-symbols-outlined !text-3xl">{getServiceIcon(item.name, item.service_type)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{item.name}</p>
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">
                                                            {item.service_type?.replace('_', ' ') || 'SERVICIO TÉCNICO'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 md:pt-0 md:border-l border-slate-100 dark:border-slate-700 md:pl-8">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Técnico/Operario</p>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                            <span className="material-symbols-outlined !text-[16px] text-slate-400">person_check</span>
                                                            {item.workers?.name || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Frecuencia Est.</p>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                            <span className="material-symbols-outlined !text-[16px] text-slate-400">update</span>
                                                            {idx === 0 ? 'Servicio Reciente' : 'Aprox. 30 días'}
                                                        </p>
                                                    </div>

                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Archivo Maestro de Clientes</span>
                        <div className="h-1 w-1 bg-slate-300 rounded-full"></div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Últimos 50 registros</span>
                    </div>
                    <div className="text-[9px] font-black text-primary/50 uppercase tracking-widest">Certificado de Servicios v{version}</div>
                </div>
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body * { visibility: hidden; }
                    .max-w-5xl, .max-w-5xl * { visibility: visible; }
                    .max-w-5xl { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        height: auto !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                    }
                    button { display: none !important; }
                    .overflow-y-auto { overflow: visible !important; height: auto !important; }
                    .rounded-[2.5rem], .rounded-3xl, .rounded-full { border-radius: 4px !important; }
                    .bg-slate-50, .bg-slate-200, .bg-primary/10 { background-color: transparent !important; }
                    .shadow-2xl, .shadow-xl, .shadow-md, .shadow-sm { box-shadow: none !important; }
                }
            `}} />
        </div>
    );
};
