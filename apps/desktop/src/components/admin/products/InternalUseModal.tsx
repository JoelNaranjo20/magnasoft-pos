// @ts-nocheck
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';

interface Product {
    id: string;
    name: string;
    stock: number;
    price?: number;
    cost_price?: number;
}

interface Props {
    product: Product;
    onClose: () => void;
    onSuccess: () => void;
}

const REASONS = [
    'Mantenimiento del vehículo',
    'Limpieza del local',
    'Mantenimiento de equipos',
    'Consumo de oficina',
    'Uso en servicio propio',
    'Pérdida / Merma',
    'Otro',
];

export const InternalUseModal = ({ product, onClose, onSuccess }: Props) => {
    const user = useSessionStore((state) => state.user);

    const [quantity, setQuantity] = useState('1');
    const [reason, setReason] = useState(REASONS[0]);
    const [customReason, setCustomReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const qty = parseInt(quantity) || 0;
    const finalReason = reason === 'Otro' ? customReason : reason;
    const [registerExpense, setRegisterExpense] = useState(true);
    const cost = (product.price || product.cost_price || 0) * qty;

    const handleConfirm = async () => {
        if (qty <= 0) { alert('Ingresa una cantidad válida.'); return; }
        if (qty > product.stock) { alert(`Stock insuficiente. Disponible: ${product.stock} unid.`); return; }
        if (reason === 'Otro' && !customReason.trim()) { alert('Escribe el motivo del uso.'); return; }

        setLoading(true);
        try {
            // 1. Deduct stock via RPC
            const { error: stockError } = await (supabase as any).rpc('deduct_product_stock', {
                p_id: product.id,
                p_quantity: qty,
            });
            if (stockError) throw stockError;

            // 2. Optionally register as cash expense in the current session
            if (registerExpense && cost > 0) {
                const cashSession = useSessionStore.getState().cashSession;
                const businessId = (await import('@shared/store/useBusinessStore')).useBusinessStore.getState().id;
                const { error: expError } = await supabase.from('cash_movements').insert({
                    session_id: cashSession?.id || null,
                    business_id: businessId,
                    type: 'expense',
                    amount: cost,
                    description: `[USO INTERNO] ${product.name} (x${qty}): ${finalReason}`,
                    payment_method: 'none',
                });
                if (expError) console.error('Error registrando egreso:', expError);
            }

            setDone(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1400);
        } catch (err: any) {
            console.error('Error processing internal use:', err);
            alert(`Error: ${err.message || 'Ocurrió un problema al procesar.'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">

                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined !text-3xl">construction</span>
                            <div>
                                <h3 className="text-lg font-black leading-tight">Uso Interno</h3>
                                <p className="text-[11px] font-medium opacity-80 leading-tight">Consumo sin venta al cliente</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="mt-4 bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 backdrop-blur-sm">
                        <p className="text-sm font-black opacity-90">{product.name}</p>
                        <p className="text-[11px] opacity-70 mt-0.5">Stock actual: <span className="font-bold">{product.stock} unid.</span></p>
                    </div>
                </div>

                {done ? (
                    <div className="p-10 flex flex-col items-center gap-3 text-center">
                        <div className="size-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined !text-3xl text-emerald-500">check_circle</span>
                        </div>
                        <p className="font-black text-slate-800 dark:text-white text-lg">¡Registrado!</p>
                        <p className="text-sm text-slate-500">Stock actualizado correctamente.</p>
                    </div>
                ) : (
                    <div className="p-6 space-y-5">

                        {/* Quantity */}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cantidad a consumir</label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setQuantity(String(Math.max(1, qty - 1)))}
                                    className="size-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
                                >−</button>
                                <input
                                    type="number"
                                    min="1"
                                    max={product.stock}
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="flex-1 text-center text-3xl font-black bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 outline-none focus:border-amber-500 dark:text-white"
                                />
                                <button
                                    onClick={() => setQuantity(String(Math.min(product.stock, qty + 1)))}
                                    className="size-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
                                >+</button>
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Motivo del uso</label>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                {REASONS.map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setReason(r)}
                                        className={`px-3 py-2 rounded-xl text-left text-xs font-bold border transition-all ${reason === r
                                            ? 'bg-amber-50 border-amber-400 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-300'
                                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                        }`}
                                    >{r}</button>
                                ))}
                            </div>
                            {reason === 'Otro' && (
                                <input
                                    type="text"
                                    placeholder="Describe el uso..."
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl outline-none focus:border-amber-500 text-sm dark:text-white font-medium"
                                />
                            )}
                        </div>

                        {/* Expense toggle */}
                        {(product.price || product.cost_price || 0) > 0 && (
                            <div
                                onClick={() => setRegisterExpense(v => !v)}
                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${registerExpense
                                    ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                <div>
                                    <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Registrar como gasto</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        Precio actual: <span className="font-bold">${cost.toLocaleString()}</span> (${(product.price || product.cost_price || 0).toLocaleString()} × {qty})
                                    </p>
                                </div>
                                <div className={`relative w-10 h-6 rounded-full transition-colors ${registerExpense ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                    <div className={`absolute top-1 size-4 bg-white rounded-full shadow transition-transform ${registerExpense ? 'translate-x-5' : 'translate-x-1'}`} />
                                </div>
                            </div>
                        )}

                        {/* Summary chip */}
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-500 uppercase">Stock resultante</span>
                            <span className="font-black text-slate-800 dark:text-white text-lg">{Math.max(0, product.stock - qty)} unid.</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={loading || qty <= 0 || qty > product.stock}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading
                                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <span className="material-symbols-outlined !text-[18px]">construction</span>
                                }
                                {loading ? 'Procesando...' : 'Confirmar Uso'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
