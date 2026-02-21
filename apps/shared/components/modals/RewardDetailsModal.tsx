import React from 'react';

export interface RewardDetail {
    id: string;
    sale_id: string;
    name: string;
    original_price: number;
    quantity: number;
    created_at: string;
    customer_name?: string;
}

interface RewardDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    rewards: RewardDetail[];
    title?: string;
    subtitle?: string;
}

export const RewardDetailsModal: React.FC<RewardDetailsModalProps> = ({
    isOpen,
    onClose,
    rewards,
    title = "Detalle de Recompensas",
    subtitle = "Desglose de productos y servicios redimidos por clientes"
}) => {
    if (!isOpen) return null;

    const totalLostRevenue = rewards.reduce((sum, r) => sum + (r.original_price * r.quantity), 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="material-symbols-outlined !text-3xl text-purple-500">redeem</span>
                            {title}
                        </h3>
                        <p className="text-slate-500 font-medium text-sm mt-1">{subtitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-800">
                    {rewards.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined !text-6xl mb-4 opacity-20">inventory_2</span>
                            <p className="font-bold uppercase tracking-widest text-xs">No hay recompensas registradas en este periodo</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <div className="col-span-1">Cant.</div>
                                <div className="col-span-5">Producto / Servicio</div>
                                <div className="col-span-3">Cliente / Fecha</div>
                                <div className="col-span-3 text-right">Valor Original</div>
                            </div>
                            {rewards.map((reward, idx) => (
                                <div
                                    key={`${reward.id}-${idx}`}
                                    className="grid grid-cols-12 items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700/50 hover:border-purple-200 dark:hover:border-purple-900/30 transition-all group"
                                >
                                    <div className="col-span-1">
                                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-500">
                                            {reward.quantity}
                                        </div>
                                    </div>
                                    <div className="col-span-5">
                                        <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs">
                                            {reward.name}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                            Venta: #{reward.sale_id.slice(0, 8)}
                                        </p>
                                    </div>
                                    <div className="col-span-3">
                                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate">
                                            {reward.customer_name || 'Venta Rápida'}
                                        </p>
                                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            {new Date(reward.created_at).toLocaleString('es-ES', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <div className="col-span-3 text-right">
                                        <p className="text-sm font-black text-purple-600 dark:text-purple-400">
                                            ${(reward.original_price * reward.quantity).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest block">Impacto Total Recompensas</span>
                            <span className="text-[10px] text-slate-500 font-bold">(Ingresos no percibidos por programa de lealtad)</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                                ${totalLostRevenue.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
