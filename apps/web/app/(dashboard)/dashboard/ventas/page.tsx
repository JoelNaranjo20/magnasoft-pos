'use client';
import { useState, useMemo } from 'react';
import { useSales, Sale } from '@/app/hooks/useSales';
import { SaleDetailsModal } from '@/app/components/modals/SaleDetailsModal';
import DashboardHeader from '@/app/components/DashboardHeader';
import { format, subDays, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import { useActiveSession } from '@/app/hooks/useActiveSession';

export default function SalesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const { activeSession } = useActiveSession();

    const [dateRange, setDateRange] = useState({
        start: startOfDay(new Date()),
        end: endOfDay(new Date())
    });
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { sales, loading, breakdown, refresh } = useSales({ dateRange });

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            const search = searchTerm.toLowerCase();
            const customerName = (sale.customer_name || '').toLowerCase();
            const vehicleInfo = (sale.vehicle_info || '').toLowerCase();
            const receiptId = sale.id.toLowerCase();

            return customerName.includes(search) ||
                vehicleInfo.includes(search) ||
                receiptId.includes(search);
        });
    }, [sales, searchTerm]);

    const totalRevenue = useMemo(() => {
        return filteredSales.reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
    }, [filteredSales]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const paginatedSales = filteredSales.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const quickDateFilters = [
        { label: 'Hoy / Sesión', get: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
        { label: 'Ayer', get: () => ({ start: startOfDay(subDays(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) }) },
        { label: '7 Días', get: () => ({ start: startOfDay(subDays(new Date(), 6)), end: endOfDay(new Date()) }) },
        { label: 'Este Mes', get: () => ({ start: startOfMonth(new Date()), end: endOfDay(new Date()) }) },
    ];

    const handleDateChange = (field: 'start' | 'end', value: string) => {
        const date = new Date(value + 'T00:00:00');
        setDateRange(prev => ({
            ...prev,
            [field]: field === 'start' ? startOfDay(date) : endOfDay(date)
        }));
        setCurrentPage(1);
    };

    const cashFlowInDrawer = (breakdown.cashSales + breakdown.cashAbonos) - breakdown.expenses;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0a0f14]">
            <DashboardHeader />

            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-12 pb-32 w-full animate-in fade-in duration-700">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20">
                                {activeSession ? '● Sesión Activa' : '○ Caja Cerrada'}
                            </span>
                            {activeSession && (
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">ID: {activeSession.id.slice(0, 8)}</span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                            Historial de <span className="text-primary">Ventas</span>
                        </h1>
                        <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-medium"> Auditoría completa de todas las transacciones generadas en el sistema.</p>
                    </div>

                    <div className="flex flex-wrap items-end gap-4 w-full md:w-auto">
                        {/* Summary Quick Stat - New Cash Flow Card */}
                        <div className="bg-slate-900 dark:bg-slate-800 rounded-[2.5rem] p-7 shadow-2xl shadow-slate-900/20 text-white min-w-[320px] relative overflow-hidden group flex-1 md:flex-none border border-white/5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>

                            <div className="relative z-10 flex justify-between items-start gap-4 mb-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">Caja de Efectivo</p>
                                    <h3 className="text-3xl font-black leading-none">${cashFlowInDrawer.toLocaleString()}</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none mb-1">Total Facturado</p>
                                    <p className="text-sm font-black text-white/40 leading-none">${breakdown.totalRevenue.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5 relative z-10">
                                <div>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1">Ventas Cash</p>
                                    <p className="text-xs font-black text-emerald-400">+${breakdown.cashSales.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1">Abonos Cash</p>
                                    <p className="text-xs font-black text-blue-400">+${breakdown.cashAbonos.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1">Gastos</p>
                                    <p className="text-xs font-black text-rose-400">-${breakdown.expenses.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 flex items-center justify-between border-t border-white/5 relative z-10">
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Digital: ${(breakdown.digitalSales + breakdown.digitalAbonos).toLocaleString()}</p>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Crédito: ${breakdown.creditSales.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search & Filters Glass-Panel */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none border border-white dark:border-slate-700/50 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Search Input */}
                        <div className="lg:col-span-5 relative group">
                            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="Buscar por placa, cliente o recibo..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-[1.5rem] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
                            />
                        </div>

                        {/* Date Picker Group */}
                        <div className="lg:col-span-7 flex flex-col md:flex-row gap-4">
                            <div className="flex-1 flex gap-3">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Inicio</label>
                                    <input
                                        type="date"
                                        value={format(dateRange.start, 'yyyy-MM-dd')}
                                        onChange={(e) => handleDateChange('start', e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-slate-900 dark:text-white text-xs uppercase"
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Final</label>
                                    <input
                                        type="date"
                                        value={format(dateRange.end, 'yyyy-MM-dd')}
                                        onChange={(e) => handleDateChange('end', e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-slate-900 dark:text-white text-xs uppercase"
                                    />
                                </div>
                            </div>

                            {/* Preset Select Buttons */}
                            <div className="flex gap-2 items-end">
                                {quickDateFilters.map((f) => (
                                    <button
                                        key={f.label}
                                        onClick={() => {
                                            setDateRange(f.get());
                                            setCurrentPage(1);
                                        }}
                                        className={`px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${format(dateRange.start, 'yyyy-MM-dd') === format(f.get().start, 'yyyy-MM-dd') &&
                                            format(dateRange.end, 'yyyy-MM-dd') === format(f.get().end, 'yyyy-MM-dd')
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sales Table - High Contrast Table */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-10 py-6">Recibo</th>
                                        <th className="px-8 py-6 text-center">Identificación</th>
                                        <th className="px-6 py-6">Servicios / Productos</th>
                                        <th className="px-8 py-6">Valor Operación</th>
                                        <th className="px-10 py-6 text-right">Cronología</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-40 bg-slate-50/20 dark:bg-slate-900/10">
                                                <div className="flex flex-col items-center gap-6">
                                                    <div className="w-14 h-14 border-[6px] border-primary/10 border-t-primary rounded-full animate-spin"></div>
                                                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Analizando Registros</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedSales.length > 0 ? (
                                        paginatedSales.map((sale) => (
                                            <tr
                                                key={sale.id}
                                                onClick={() => setSelectedSale(sale)}
                                                className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-all group cursor-pointer"
                                            >
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-inner group-hover:shadow-primary/20">
                                                            <span className="material-symbols-outlined !text-[20px]">receipt</span>
                                                        </div>
                                                        <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm">#{sale.id.slice(0, 8)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className="font-black text-slate-700 dark:text-slate-200 uppercase text-center block max-w-[150px] truncate">{sale.customer_name || 'Mostrador'}</span>
                                                        {sale.vehicle_info && (
                                                            <div className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-black text-white relative flex items-center gap-1 shadow-sm uppercase">
                                                                <span className="w-full h-0.5 bg-yellow-400 absolute top-0 left-0 right-0"></span>
                                                                {sale.vehicle_info.split(' ')[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="space-y-1.5 max-w-[300px]">
                                                        <span className="text-slate-900 dark:text-white font-black line-clamp-1 uppercase text-[10px] leading-tight group-hover:text-primary transition-colors">
                                                            {sale.items?.map(i => i.name).join(', ')}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            {sale.total_amount === 0 && (
                                                                <span className="inline-flex items-center gap-1 text-[8px] font-black text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full uppercase border border-purple-100 dark:border-purple-800">
                                                                    <span className="material-symbols-outlined !text-[12px]">redeem</span>
                                                                    Loyalty Reward
                                                                </span>
                                                            )}
                                                            <span className="text-[8px] font-black text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full uppercase border border-slate-200 dark:border-slate-700">
                                                                {sale.payment_method === 'cash' ? '💵 Efectivo' : '🏦 Transf.'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`text-xl font-black tabular-nums ${sale.total_amount === 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                                        ${sale.total_amount?.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="text-slate-900 dark:text-white font-black uppercase text-[10px] leading-none mb-1">{format(new Date(sale.created_at), 'dd MMM, yyyy')}</span>
                                                        <span className="text-slate-400 text-[10px] font-bold opacity-60 uppercase">{format(new Date(sale.created_at), 'hh:mm a')}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="text-center py-40 bg-slate-50/10 dark:bg-slate-900/5">
                                                <div className="flex flex-col items-center gap-4 text-slate-400 opacity-30">
                                                    <span className="material-symbols-outlined !text-[64px]">database_off</span>
                                                    <p className="text-sm font-black uppercase tracking-[0.2em]">Criterio sin coincidencias</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Premium Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-10 py-8 bg-white/50 dark:bg-slate-800/30 rounded-[2rem] border border-white/50 dark:border-slate-700/30">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                Mostrando <span className="text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredSales.length)}</span> de <span className="text-slate-900 dark:text-white tabular-nums">{filteredSales.length}</span> auditorías
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="size-12 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:grayscale transition-all hover:bg-primary hover:border-primary hover:text-white group"
                                >
                                    <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform font-black">arrow_back_ios_new</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`size-12 flex items-center justify-center rounded-2xl text-[10px] font-black transition-all ${currentPage === i + 1
                                                ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-110 !border-primary'
                                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:border-primary hover:text-primary'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="size-12 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:grayscale transition-all hover:bg-primary hover:border-primary hover:text-white group"
                                >
                                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform font-black">arrow_forward_ios</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modals */}
                <SaleDetailsModal
                    isOpen={!!selectedSale}
                    onClose={() => setSelectedSale(null)}
                    sale={selectedSale}
                />
            </div>
        </div>
    );
}
