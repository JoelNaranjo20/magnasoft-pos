import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useCartStore } from '../../store/useCartStore';

interface ManualRewardModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: {
        id: string;
        name: string;
        loyalty_points: number;
    } | null;
    onSuccess: (newPoints: number) => void;
}

export const ManualRewardModal = ({ isOpen, onClose, customer, onSuccess }: ManualRewardModalProps) => {
    const businessId = useBusinessStore(state => state.id);
    const [loading, setLoading] = useState(false);
    const [pointsThreshold, setPointsThreshold] = useState(50);
    const [paperPoints, setPaperPoints] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    // Reward services
    const [rewardServices, setRewardServices] = useState<any[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');

    useEffect(() => {
        if (isOpen && businessId) {
            setPaperPoints('');
            setError(null);
            setSelectedServiceId('');
            fetchThresholdAndRewards();
        }
    }, [isOpen, businessId]);

    const fetchThresholdAndRewards = async () => {
        if (!businessId) return;
        try {
            const { data } = await supabase
                .from('business_settings')
                .select('value')
                .eq('business_id', businessId)
                .eq('setting_type', 'loyalty')
                .maybeSingle();

            const value = data?.value as any;
            if (value) {
                if (value.points_threshold) {
                    setPointsThreshold(value.points_threshold);
                }
                
                if (value.reward_service_ids && Array.isArray(value.reward_service_ids) && value.reward_service_ids.length > 0) {
                    const { data: servicesData } = await supabase
                        .from('services')
                        .select('*')
                        .in('id', value.reward_service_ids);
                        
                    if (servicesData) {
                        setRewardServices(servicesData);
                        if (servicesData.length > 0) {
                            setSelectedServiceId(servicesData[0].id); // Auto-select first option
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching loyalty settings:', err);
        }
    };

    if (!isOpen || !customer) return null;

    const systemPoints = customer.loyalty_points || 0;
    const additionalPoints = parseInt(paperPoints || '0', 10);
    const totalPoints = systemPoints + additionalPoints;
    const isEligible = totalPoints >= pointsThreshold;

    const handleRedeem = async () => {
        if (!isEligible) {
            setError('Faltan puntos para redimir recompensa.');
            return;
        }

        if (!selectedServiceId) {
            setError('Debes seleccionar un servicio de recompensa.');
            return;
        }

        const targetService = rewardServices.find(s => s.id === selectedServiceId);
        if (!targetService) return;

        setLoading(true);
        setError(null);

        // Deduct exactly one threshold from the combined total
        const newBalance = Math.max(0, totalPoints - pointsThreshold);

        try {
            const { error: updateError } = await supabase
                .from('customers')
                .update({ loyalty_points: newBalance })
                .eq('id', customer.id);

            if (updateError) throw updateError;
            
            // Replicate PaymentModal behavior: if they already have the normal-priced item in the cart, 
            // decrement it so it doesn't duplicate but rather "discounts" the existing one.
            const cartItems = useCartStore.getState().items;
            const existingNormalItem = cartItems.find(i => 
                (i.id === targetService.id || i.name.toLowerCase().trim() === targetService.name.toLowerCase().trim()) && i.price > 0
            );
            
            if (existingNormalItem) {
                useCartStore.getState().updateQuantity(existingNormalItem.cartId, -1);
            }

            // INJECT THE REWARD TO THE CART AT $0
            // Since it's a reward, we pass customPrice = 0
            useCartStore.getState().addItem(targetService, 'service', 0);

            setLoading(false);
            onSuccess(newBalance);
        } catch (err: any) {
            console.error('Error updating loyalty points:', err);
            setError(err.message || 'Error al canjear la recompensa');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-white relative overflow-hidden">
                    <span className="material-symbols-outlined !text-9xl absolute -right-6 -bottom-6 opacity-10 rotate-12 pointer-events-none">redeem</span>
                    <div className="relative z-10">
                        <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border border-white/30">
                            <span className="material-symbols-outlined !text-3xl">add_task</span>
                        </div>
                        <h2 className="text-2xl font-black tracking-tight leading-tight">Unificar y Canjear</h2>
                        <p className="text-purple-100 mt-1 font-medium italic opacity-90 text-sm">
                            Combina los puntos en papel con el sistema para {customer.name}.
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Puntos en Sistema</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{systemPoints}</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined !text-[16px]">add</span>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Puntos en Papel</p>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={paperPoints}
                                onChange={(e) => setPaperPoints(e.target.value)}
                                className="w-20 bg-white dark:bg-slate-900 border-2 border-primary/30 rounded-xl px-3 py-1 text-xl font-black text-center text-primary focus:outline-none focus:border-primary transition-colors shadow-inner"
                            />
                        </div>
                    </div>

                    <div className={`p-5 rounded-2xl border-2 transition-colors flex items-center justify-between ${isEligible ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50'}`}>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                Total Unificado
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-black ${isEligible ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                    {totalPoints}
                                </span>
                                <span className={`text-sm font-bold ${isEligible ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    / {pointsThreshold} req.
                                </span>
                            </div>
                        </div>
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${isEligible ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-rose-200 text-rose-500 dark:bg-rose-800/50 dark:text-rose-400'}`}>
                            <span className="material-symbols-outlined !text-3xl">
                                {isEligible ? 'task_alt' : 'block'}
                            </span>
                        </div>
                    </div>

                    {isEligible && rewardServices.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                Selecciona el Premio:
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none">redeem</span>
                                <select
                                    value={selectedServiceId}
                                    onChange={(e) => setSelectedServiceId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800/50 text-purple-700 dark:text-purple-300 font-bold rounded-xl appearance-none outline-none focus:border-purple-400 transition-colors cursor-pointer"
                                >
                                    <option value="" disabled>Elige el servicio gratis...</option>
                                    {rewardServices.map(service => (
                                        <option key={service.id} value={service.id}>
                                            {service.name} (Gratis)
                                        </option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined !text-[16px]">error</span>
                            {error}
                        </div>
                    )}

                    <div className="pt-2 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase text-xs tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleRedeem}
                            disabled={!isEligible || loading || !selectedServiceId}
                            className="flex-[2] py-3 px-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all disabled:opacity-50 disabled:grayscale uppercase text-xs tracking-widest flex justify-center items-center gap-2 group"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined !text-[18px] group-hover:scale-110 transition-transform">redeem</span>
                                    Aplicar Premio
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
