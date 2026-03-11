// @ts-nocheck
import { useState, useEffect } from 'react';
import { useCartStore } from '../../store/useCartStore';
import { useTableStore } from '../../store/useTableStore';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { POSProductGrid } from '../pos/POSProductGrid';
import { CategoryTabs } from '../pos/CategoryTabs';
import { PaymentModal } from './PaymentModal';
import { EditPriceModal } from './EditPriceModal';
import { supabase } from '../../lib/supabase';
import {
    Package, Scissors, Coffee, Shirt,
    Zap, Star, Gift, Tag, ShoppingBag, Briefcase,
    Wrench, Car, PenTool, Smile
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
    package: Package, scissors: Scissors, coffee: Coffee, shirt: Shirt,
    zap: Zap, star: Star, gift: Gift, tag: Tag, bag: ShoppingBag,
    briefcase: Briefcase, wrench: Wrench, car: Car, tool: PenTool, smile: Smile
};

interface TableOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TableOrderModal = ({ isOpen, onClose }: TableOrderModalProps) => {
    const {
        items, total, removeItem, updateQuantity, updatePrice,
        metadata, setMetadata, selectedCustomer, globalWorkerId
    } = useCartStore();
    const setGlobalWorker = useCartStore(s => s.setGlobalWorker);

    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [priceEditModal, setPriceEditModal] = useState<any>(null);
    const [workers, setWorkers] = useState<any[]>([]);
    const [showCustomerToggle, setShowCustomerToggle] = useState(false);

    const businessId = useBusinessStore(state => state.id);

    // Fetch workers
    useEffect(() => {
        if (!isOpen || !businessId) return;
        const fetchWorkers = async () => {
            const { data } = await supabase
                .from('workers')
                .select('*, roles(name)')
                .eq('business_id', businessId)
                .eq('active', true);
            setWorkers(data || []);
        };
        fetchWorkers();
    }, [isOpen, businessId]);

    const handleBackToPatio = () => {
        // Don't clear the table's cart — just close the modal
        useCartStore.getState().setActiveCart('default');
        useTableStore.getState().setSelectedTable(null);
        setMetadata({ table_id: null, table_name: null });
        onClose();
    };

    const handlePayment = () => {
        setIsPaymentOpen(true);
    };

    const handlePriceEditSave = (newPrice: number) => {
        if (priceEditModal) {
            updatePrice(priceEditModal.itemId, newPrice);
            setPriceEditModal(null);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={handleBackToPatio} />

            {/* Modal */}
            <div className="fixed inset-4 z-50 flex flex-col bg-slate-50 dark:bg-[#0f172a] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200/50 dark:border-slate-700/50">

                {/* ── Header ── */}
                <div className="flex-none flex items-center justify-between px-6 py-3 bg-primary text-white">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBackToPatio}
                            className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-black transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined !text-[20px]">arrow_back</span>
                            Volver al Patio
                        </button>
                        <div className="h-8 w-px bg-white/30" />
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined !text-[24px]">table_restaurant</span>
                            <div className="flex flex-col leading-tight">
                                <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-75">Cuenta de</span>
                                <span className="text-lg font-black">{metadata?.table_name || 'Mesa'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <span className="text-[10px] uppercase tracking-wider opacity-75 block">Total</span>
                            <span className="text-2xl font-black">${total.toLocaleString()}</span>
                        </div>
                        <div className="text-sm font-bold bg-white/20 px-3 py-1.5 rounded-lg">
                            {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                        </div>
                    </div>
                </div>

                {/* ── Two-Column Body ── */}
                <div className="flex-1 flex overflow-hidden">

                    {/* LEFT: Menu (Categories + Product Grid) */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden border-r border-slate-200 dark:border-slate-800">
                        <CategoryTabs />
                        <div className="flex-1 overflow-hidden relative">
                            <POSProductGrid />
                        </div>
                    </div>

                    {/* RIGHT: Ticket / Cart */}
                    <div className="w-[380px] xl:w-[420px] flex flex-col bg-surface-light dark:bg-surface-dark">

                        {/* Optional Customer Toggle */}
                        <button
                            onClick={() => setShowCustomerToggle(v => !v)}
                            className="flex-none flex items-center justify-between px-5 py-2 border-b border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {selectedCustomer ? `🧑 ${selectedCustomer.name}` : 'Vincular Cliente (Opcional)'}
                            </span>
                            <span className={`material-symbols-outlined !text-[18px] transition-transform ${showCustomerToggle ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                        {showCustomerToggle && (
                            <div className="flex-none px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                                <p className="text-xs text-slate-400 italic">
                                    La selección de cliente se puede hacer desde la vista general del POS.
                                </p>
                            </div>
                        )}

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl m-2 bg-slate-50/50 dark:bg-slate-900/20">
                                    <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                        <span className="material-symbols-outlined !text-[32px] opacity-50">restaurant</span>
                                    </div>
                                    <p className="font-medium text-sm">Sin ítems</p>
                                    <p className="text-xs opacity-75 mt-1">Selecciona productos del menú</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.cartId} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:border-primary/30 transition-all group relative overflow-hidden">
                                        {/* Color Strip */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.type === 'product' ? 'bg-amber-400' : 'bg-blue-500'}`} />

                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2 ${item.type === 'product'
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                            : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                                            }`}>
                                            {(() => {
                                                const iconName = item.originalItem?.icon;
                                                const IconComponent = ICON_MAP[iconName || ''] || (item.type === 'product' ? Package : Scissors);
                                                return <IconComponent size={20} strokeWidth={1.5} />;
                                            })()}
                                        </div>

                                        <div className="flex-1 min-w-0 pt-0.5 pr-7">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight truncate pr-2">{item.name}</h4>
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">${(item.price * item.quantity).toLocaleString()}</span>
                                                    {item.originalPrice && item.price !== item.originalPrice && (
                                                        <span className="text-[10px] text-slate-400 line-through">${(item.originalPrice * item.quantity).toLocaleString()}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                                                        {item.quantity} x ${(item.price).toLocaleString()}
                                                    </div>
                                                    <button
                                                        onClick={() => setPriceEditModal({
                                                            isOpen: true,
                                                            itemId: item.cartId,
                                                            currentPrice: item.price,
                                                            originalPrice: item.originalPrice || item.price,
                                                            name: item.name
                                                        })}
                                                        className="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                                        title="Modificar precio"
                                                    >
                                                        <span className="material-symbols-outlined !text-[14px]">edit</span>
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                                                    <button
                                                        onClick={() => updateQuantity(item.cartId, -1)}
                                                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-all shadow-sm"
                                                    >
                                                        <span className="material-symbols-outlined !text-[14px]">remove</span>
                                                    </button>
                                                    <span className="text-xs font-bold w-6 text-center text-slate-700 dark:text-slate-300">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.cartId, 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-all shadow-sm"
                                                    >
                                                        <span className="material-symbols-outlined !text-[14px]">add</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover Actions */}
                                        <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            <button
                                                onClick={() => removeItem(item.cartId)}
                                                className="p-1.5 text-rose-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <span className="material-symbols-outlined !text-[18px]">delete</span>
                                            </button>
                                            <button
                                                onClick={() => useCartStore.getState().toggleCommission(item.cartId)}
                                                className={`p-1.5 rounded-lg transition-all ${item.commissionEnabled
                                                    ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-inner'
                                                    : 'text-slate-300 hover:text-slate-400'
                                                    }`}
                                                title={item.commissionEnabled ? 'Comisión ON' : 'Comisión OFF'}
                                            >
                                                <span className="material-symbols-outlined !text-[18px]">
                                                    {item.commissionEnabled ? 'monetization_on' : 'money_off'}
                                                </span>
                                            </button>
                                        </div>

                                        {item.commissionEnabled && (
                                            <div className="absolute top-0 right-7 bg-emerald-500 w-2 h-2 rounded-full border-2 border-white dark:border-slate-800" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* ── Footer: Worker + Total + Cobrar ── */}
                        <div className="flex-none p-4 bg-white dark:bg-[#1e293b] border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-40 space-y-3">

                            {/* Worker Selector */}
                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">
                                    Mesero / Responsable
                                </label>
                                <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800 border rounded-xl transition-all ${globalWorkerId
                                    ? 'border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10'
                                    : 'border-slate-200 dark:border-slate-700'
                                    }`}>
                                    <span className={`material-symbols-outlined absolute left-3 !text-[20px] ${globalWorkerId ? 'text-blue-500' : 'text-slate-400'}`}>badge</span>
                                    <select
                                        className="w-full h-10 pl-10 pr-4 bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer"
                                        value={globalWorkerId || ''}
                                        onChange={(e) => setGlobalWorker(e.target.value || null)}
                                    >
                                        <option value="">(Sin asignar)</option>
                                        {workers.map(w => (
                                            <option key={w.id} value={w.id}>
                                                {w.name} ({w.roles?.name || w.role || 'Sin Rol'})
                                            </option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 !text-[20px] text-slate-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            {/* Total */}
                            <div className="flex justify-between items-end py-2">
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</span>
                                </div>
                                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">${total.toLocaleString()}</span>
                            </div>

                            {/* Cobrar Button */}
                            <button
                                onClick={handlePayment}
                                disabled={items.length === 0}
                                className="w-full h-14 rounded-xl bg-primary hover:bg-primary-hover text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 font-black text-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                <span className="material-symbols-outlined !text-[28px]">payments</span>
                                Cobrar ${total.toLocaleString()}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={isPaymentOpen}
                onClose={() => {
                    setIsPaymentOpen(false);
                    // After a successful payment, the cart is cleared and we return to patio
                    if (useCartStore.getState().items.length === 0) {
                        handleBackToPatio();
                    }
                }}
                customer={selectedCustomer}
                vehicle={null}
                workers={workers}
            />

            {/* Price Edit Modal */}
            {priceEditModal && (
                <EditPriceModal
                    isOpen={priceEditModal.isOpen}
                    onClose={() => setPriceEditModal(null)}
                    currentPrice={priceEditModal.currentPrice}
                    originalPrice={priceEditModal.originalPrice}
                    itemName={priceEditModal.name}
                    onSave={handlePriceEditSave}
                />
            )}
        </>
    );
};
