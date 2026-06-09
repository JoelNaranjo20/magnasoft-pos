// @ts-nocheck
import React from 'react';

interface SaleDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: any | null;
}

export const SaleDetailsModal = ({ isOpen, onClose, sale }: SaleDetailsModalProps) => {
    if (!isOpen || !sale) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">receipt</span>
                            Venta #{sale.id.slice(0, 8)}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">
                            {new Date(sale.created_at).toLocaleString()}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={async () => {
                                const receiptData = {
                                    businessName: "NEGOCIO", // Will be overridden or set via store
                                    date: new Date(sale.created_at).toLocaleString(),
                                    saleId: sale.id.slice(0, 8),
                                    customer: sale.customer?.name || 'Cliente General',
                                    vehicle: sale.vehicle ? `${sale.vehicle.license_plate}` : null,
                                    items: sale.items?.map(i => ({
                                        name: i.name,
                                        qty: i.quantity,
                                        price: i.unit_price,
                                        total: i.total_price,
                                        worker: i.worker?.name
                                    })),
                                    total: sale.total_amount,
                                    method: sale.payment_method,
                                };

                                if (window.electronAPI) {
                                    const printerName = await window.electronAPI.storageGet('selected-printer');
                                    window.electronAPI.printReceipt({
                                        ...receiptData,
                                        printerName: printerName || undefined,
                                        silent: !!printerName
                                    }).catch(console.error);
                                } else {
                                    window.print();
                                }
                            }}
                            className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 transition-colors flex items-center justify-center"
                            title="Imprimir Ticket"
                        >
                            <span className="material-symbols-outlined">print</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 transition-colors flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Customer & Vehicle Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                                <span className="material-symbols-outlined !text-[20px] text-slate-400">person</span>
                                {sale.customer?.name || 'Cliente General'}
                            </div>
                        </div>
                        {sale.vehicle && (
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehículo</p>
                                <div className="flex items-center gap-2">
                                    <div className="px-2 py-1 bg-slate-900 border-2 border-slate-700 rounded-lg text-xs font-black text-white flex flex-col items-center justify-center relative overflow-hidden min-w-[70px]">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-400"></div>
                                        {sale.vehicle.license_plate}
                                    </div>
                                    <span className="text-slate-500 text-xs font-medium uppercase">
                                        {sale.vehicle.type === 'motorcycle' ? 'Moto' : 'Carro'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Items List */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle de Productos y Servicios</p>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden text-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100/50 dark:bg-slate-800 font-bold text-slate-500 border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3 text-center">Cant.</th>
                                        <th className="px-4 py-3 text-right">Precio</th>
                                        <th className="px-4 py-3 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {sale.items?.map((item, idx) => (
                                        <tr key={idx} className="text-slate-700 dark:text-slate-300">
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{item.service_type || 'Ítem'}</p>
                                                    {item.worker?.name && (
                                                        <p className="text-[10px] text-primary font-bold flex items-center gap-1">
                                                            <span className="material-symbols-outlined !text-[12px]">engineering</span>
                                                            {item.worker.name}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold">{item.quantity}</td>
                                            <td className="px-4 py-4 text-right">${item.unit_price.toLocaleString()}</td>
                                            <td className="px-4 py-4 text-right font-black text-slate-900 dark:text-white">
                                                ${item.total_price.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="flex flex-col items-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between w-full max-w-[200px] text-slate-500 font-bold">
                            <span>Subtotal</span>
                            <span>${sale.total_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between w-full max-w-[200px] text-xl font-black text-slate-900 dark:text-white">
                            <span>Total</span>
                            <span className={sale.total_amount === 0 ? 'text-emerald-500' : ''}>
                                ${sale.total_amount.toLocaleString()}
                            </span>
                        </div>
                        {sale.total_amount === 0 && (
                            <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 animate-bounce mt-2 shadow-lg shadow-purple-500/10 border border-purple-200/50">
                                <span className="material-symbols-outlined !text-[16px]">redeem</span>
                                Premio Redimido (Costo $0)
                            </div>
                        )}
                    </div>
                </div>

                {/* Cross-change & Tips badges */}
                {(sale.metadata?.cross_change || sale.metadata?.tip_amount > 0) && (
                    <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                        {sale.metadata?.cross_change && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                <span className="material-symbols-outlined text-sky-500 text-sm">swap_horiz</span>
                                <span className="text-sky-600 dark:text-sky-400">
                                    Cambio: ${sale.metadata.cross_change.amount.toLocaleString()} devuelto en {
                                        sale.metadata.cross_change.to_method === 'cash' ? 'efectivo' : 'transferencia'
                                    }
                                </span>
                            </div>
                        )}
                        {sale.metadata?.tip_amount > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                <span className="material-symbols-outlined text-amber-500 text-sm">volunteer_activism</span>
                                <span className="text-amber-600 dark:text-amber-400">
                                    Propina: ${sale.metadata.tip_amount.toLocaleString()}
                                    {sale.metadata.tip_percentage ? ` (${sale.metadata.tip_percentage}%)` : ''}
                                    {sale.metadata.tip_distribution
                                        ? ` → ${sale.metadata.tip_distribution.length} trabajadores`
                                        : sale.metadata.tip_worker_id ? ' → trabajador asignado' : ''}
                                </span>
                            </div>
                        )}
                        {sale.metadata?.tip_payment_method && sale.metadata.tip_payment_method !== sale.payment_method && (
                            <div className="text-[10px] text-slate-400 font-medium ml-6">
                                Propina pagada en {sale.metadata.tip_payment_method === 'cash' ? 'efectivo' : sale.metadata.tip_payment_method}
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Info */}
                <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                    {/* Payment method badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        sale.payment_method === 'cash'
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30'
                            : sale.payment_method === 'card'
                            ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30'
                            : sale.payment_method === 'transfer'
                            ? 'text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/30'
                            : sale.payment_method === 'credit'
                            ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30'
                            : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700'
                    }`}>
                        <span className="material-symbols-outlined !text-[14px]">
                            {sale.payment_method === 'cash' ? 'payments' :
                                sale.payment_method === 'card' ? 'credit_card' :
                                    sale.payment_method === 'transfer' ? 'swap_horiz' :
                                        sale.payment_method === 'credit' ? 'schedule' : 'help'}
                        </span>
                        {sale.payment_method === 'cash' ? 'Efectivo' :
                            sale.payment_method === 'card' ? 'Tarjeta' :
                                sale.payment_method === 'transfer' ? 'Transferencia' :
                                    sale.payment_method === 'credit' ? 'Crédito' :
                                        sale.payment_method?.toUpperCase()}
                    </span>

                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        sale.status === 'completed'
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30'
                            : sale.status === 'pending'
                            ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30'
                            : sale.status === 'cancelled'
                            ? 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/30'
                            : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700'
                    }`}>
                        <span className="w-1.5 h-1.5 rounded-full ${
                            sale.status === 'completed' ? 'bg-emerald-500' :
                                sale.status === 'pending' ? 'bg-amber-500' :
                                    sale.status === 'cancelled' ? 'bg-rose-500' : 'bg-slate-400'
                        }"></span>
                        {sale.status === 'completed' ? 'Completado' :
                            sale.status === 'pending' ? 'Pendiente' :
                                sale.status === 'cancelled' ? 'Cancelado' :
                                    sale.status?.toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
    );
};
