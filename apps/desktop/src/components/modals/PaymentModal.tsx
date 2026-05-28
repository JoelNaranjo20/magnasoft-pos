// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../store/useCartStore';
import { useTableStore } from '../../store/useTableStore';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useAuthStore } from '@shared/store/useAuthStore';
import { useModule } from '../../hooks/useModule';
import { useProductCommission } from '../../hooks/useProductCommission';
import { ManualRewardModal } from './ManualRewardModal';
import type { SaleMetadata } from '../../types/pos';

declare global {
    interface Window {
        electron: {
            ipcRenderer: {
                invoke: (channel: string, ...args: any[]) => Promise<any>;
            };
        };
    }
}

interface Customer {
    id: string;
    name: string;
    phone: string | null;
    loyalty_points?: number;
    total_visits?: number;
}

interface Vehicle {
    id: string;
    type: 'car' | 'motorcycle' | 'truck';
    license_plate: string;
}

interface Worker {
    id: string;
    name: string;
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer?: Customer | null;
    workers: Worker[]; // Received from parent
    quickSaleReference?: string;
}

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit' | 'mixed';

const detectServiceType = (item: any, vehicleType?: string | null): string => {
    if (item.type === 'product') return 'producto';
    if (vehicleType) return vehicleType === 'motorcycle' ? 'moto' : 'carro';
    
    // Fallback: tratar de deducirlo del nombre
    const name = item.name?.toLowerCase() || '';
    if (name.includes('moto')) return 'moto';
    if (name.includes('auto') || name.includes('carro')) return 'carro';
    
    return 'servicio';
};

export const PaymentModal = ({ isOpen, onClose, customer, vehicle, workers, quickSaleReference }: PaymentModalProps) => {
    const { items, total, clearCart, globalWorkerId, metadata: cartMetadata } = useCartStore();
    const clearTableCart = useCartStore(state => state.clearTableCart);
    const { cashSession, user } = useSessionStore();
    const { business } = useAuthStore();
    const businessType = business?.business_type || 'retail'; // Kept for analytics metadata
    // Module-based feature flags — replaces hardcoded business_type checks
    const hasVehicles = useModule('vehicles');
    const hasCommissions = useModule('commissions');

    const [method, setMethod] = useState<PaymentMethod>('cash');
    const [amountTendered, setAmountTendered] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
    const [isManualRewardModalOpen, setIsManualRewardModalOpen] = useState(false);

    // Split (Mixto) payment amounts
    const [splitAmounts, setSplitAmounts] = useState({ cash: '', transfer: '', card: '', credit: '' });

    // Settings state
    const [assignmentMode, setAssignmentMode] = useState<'general' | 'individual'>('general');
    const [generalWorkerId, setGeneralWorkerId] = useState<string>('');
    const [itemWorkers, setItemWorkers] = useState<Record<string, string>>({});
    const [loyaltySettings, setLoyaltySettings] = useState<any>({ points_per_visit: 10, points_threshold: 50 });
    const [rewardServices, setRewardServices] = useState<any[]>([]); // multiple rewards
    const [redeemedServiceIds, setRedeemedServiceIds] = useState<Set<string>>(new Set()); // which services have been redeemed
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [showCommissionWarnings, setShowCommissionWarnings] = useState(false);

    // Tips (Propinas)
    const [tipAmount, setTipAmount] = useState<string>('');
    const [tipWorkerId, setTipWorkerId] = useState<string>('');
    const [showTip, setShowTip] = useState(false);

    // Transfer: editable received amount (may include tip)
    const [transferAmount, setTransferAmount] = useState<string>('');
    // Card: editable received amount
    const [cardAmount, setCardAmount] = useState<string>('');

    // Reactive businessId — re-fetches commissions if store loads after mount
    const businessId = useBusinessStore(state => state.id);
    // Product Commission Hook (uses Inventory hierarchy: product → subcategory → category)
    const { calculateCommission: getProductCommission, refetch: refetchProductCommissions } = useProductCommission(businessId);

    useEffect(() => {
        if (isOpen) {
            setAmountTendered('');
            setProcessing(false);
            setError(null);
            setSuccess(false);
            setMethod('cash');
            setRedeemedServiceIds(new Set());
            setSettingsLoaded(false);
            setShowCommissionWarnings(false);
            setTipAmount('');
            setTipWorkerId('');
            setShowTip(false);
            setSplitAmounts({ cash: '', transfer: '', card: '', credit: '' });
            setTransferAmount(String(total));
            setCardAmount(String(total));

            // Initialize worker assignments from cart
            const initialAssignments: Record<string, string> = {};
            let allSameWorker = items.length > 0;
            let firstWorkerId = '';

            items.forEach((item, index) => {
                if (item.workerId) {
                    initialAssignments[item.cartId] = item.workerId;
                    if (index === 0) firstWorkerId = item.workerId;
                    else if (firstWorkerId !== item.workerId) allSameWorker = false;
                } else {
                    allSameWorker = false;
                }
            });

            setItemWorkers(initialAssignments);

            // CHANGED: Prioritize Global Worker from Store (New Flow)
            if (globalWorkerId) {
                setAssignmentMode('general');
                setGeneralWorkerId(globalWorkerId);
            }
            // Fallback: Legacy flow (deduce from items)
            else if (allSameWorker && firstWorkerId) {
                setAssignmentMode('general');
                setGeneralWorkerId(firstWorkerId);
            } else if (Object.keys(initialAssignments).length > 0) {
                setAssignmentMode('individual');
            } else {
                setAssignmentMode('general');
                setGeneralWorkerId('');
            }

            setShowPaymentConfirmation(false);
            fetchCommissionSettings();
            
            // Force refetch of product category commissions in case they were updated in Inventory
            if (hasCommissions) {
                refetchProductCommissions();
            }
        }
    }, [isOpen]);


    const fetchCommissionSettings = async () => {
        try {
            const businessId = useBusinessStore.getState().id;
            const { data } = await supabase
                .from('business_settings')
                .select('value')
                .eq('business_id', businessId)
                .eq('setting_type', 'loyalty')
                .maybeSingle();

            if (data && data.value) {
                setLoyaltySettings(data.value);

                // Resolve reward_service_ids (new) or fallback to legacy reward_service_id
                const ids: string[] = data.value.reward_service_ids?.length
                    ? data.value.reward_service_ids
                    : data.value.reward_service_id
                        ? [data.value.reward_service_id]
                        : [];

                if (ids.length > 0) {
                    const { data: services } = await (supabase as any)
                        .from('services')
                        .select('*')
                        .in('id', ids);
                    setRewardServices(services || []);
                } else {
                    setRewardServices([]);
                }
            }
        } catch (error) {
            console.error('Error fetching loyalty settings:', error);
        } finally {
            setSettingsLoaded(true);
        }
    };

    const handleRedeem = (service: any) => {
        if (!service) return;
        const alreadyRedeemed = redeemedServiceIds.has(service.id);

        if (alreadyRedeemed) {
            // Un-redeem: remove the free item from cart
            const freeItem = items.find(i => i.id === service.id && i.price === 0);
            if (freeItem) {
                useCartStore.getState().removeItem(freeItem.cartId);
            }
            setRedeemedServiceIds(prev => {
                const next = new Set(prev);
                next.delete(service.id);
                return next;
            });
        } else {
            // Redeem: optionally decrement normal-price version
            const existingNormalItem = items.find(i => 
                (i.id === service.id || i.name.toLowerCase().trim() === service.name.toLowerCase().trim()) && i.price > 0
            );
            if (existingNormalItem) {
                useCartStore.getState().updateQuantity(existingNormalItem.cartId, -1);
            }
            useCartStore.getState().addItem(service, 'service', 0);
            setRedeemedServiceIds(prev => new Set([...prev, service.id]));
        }
    };

    // Points deducted = one threshold per redeemed service
    const isRedeeming = redeemedServiceIds.size > 0;




    const getWorkerForItem = (itemId: string): string => {
        if (assignmentMode === 'general') {
            return generalWorkerId;
        }
        return itemWorkers[itemId] || '';
    };

    const getTotalCommissions = (): number => {
        return items.reduce((sum, item) => {
            const workerId = getWorkerForItem(item.cartId);
            if (!workerId) return sum;

            if (item.type === 'service' && !item.commissionEnabled) return sum;
            
            const { commissionAmount } = getProductCommission(item.originalItem || item, item.quantity);
            return sum + commissionAmount;
        }, 0);
    };

    const getItemsRequiringWorker = () => {
        if (!settingsLoaded) return [];

        return items.filter(item => {
            if (!item.commissionEnabled) return false; // Not mandatory if commission is disabled

            const hasWorker = !!getWorkerForItem(item.cartId);
            if (hasWorker) return false;

            const serviceType = detectServiceType(item, vehicle?.type);

            const { appliedPercentage, commissionAmount } = getProductCommission(item.originalItem || item, item.quantity);
            return appliedPercentage > 0 || commissionAmount > 0;
        });
    };

    const itemsMissingWorker = getItemsRequiringWorker();

    const numericAmount = parseFloat(amountTendered.replace(/\./g, '')) || 0;
    const numericTip = parseFloat(tipAmount) || 0;
    const change = method === 'cash' ? numericAmount - total - numericTip : 0;
    const mixedTotal = (parseFloat(splitAmounts.cash) || 0) + (parseFloat(splitAmounts.transfer) || 0) + (parseFloat(splitAmounts.card) || 0) + (parseFloat(splitAmounts.credit) || 0);
    const mixedValid = method === 'mixed' ? Math.abs(mixedTotal - total) < 1 : true;
    const canConfirm = method === 'cash' ? numericAmount >= total : method === 'credit' ? !!customer : method === 'mixed' ? mixedValid : true;

    const handleNumpad = (num: string) => {
        if (num === 'backspace') {
            setAmountTendered(prev => prev.slice(0, -1));
        } else if (num === 'clear') {
            setAmountTendered('');
        } else if (num === '00') {
            setAmountTendered(prev => prev + '00');
        } else {
            setAmountTendered(prev => prev + num);
        }
    };

    // Keyboard support for calculator
    useEffect(() => {
        if (!isOpen) return; // Only register when modal is actually open

        const handleKeyDown = (e: KeyboardEvent) => {
            if (method !== 'cash') return;

            // Let editable inputs and textareas handle their own key events
            const tag = (e.target as HTMLElement).tagName;
            const isEditable = (e.target as HTMLInputElement).readOnly === false;

            if ((tag === 'INPUT' && isEditable) || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
            if (tag === 'SELECT') return;

            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleNumpad(e.key);
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handleNumpad('backspace');
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (canConfirm && !processing) {
                    handleConfirm();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, method, canConfirm, processing, amountTendered]);

    if (!isOpen) return null;

    const handleConfirm = async (bypassConfirmation = false) => {
        if (itemsMissingWorker.length > 0) {
            setShowCommissionWarnings(true);
            setError('Faltan trabajadores por asignar en items con comisión obligatoria.');
            setProcessing(false);
            return;
        }

        // Intentar obtener del store
        let currentUser = user;

        // FALLBACK DE SEGURIDAD: Si no está en el store, pedirlo directo a Supabase
        if (!currentUser) {
            const { data } = await supabase.auth.getUser();
            currentUser = data.user;
        }

        // 0. Pre-flight Session Validation
        if (!cashSession) {
            setError('Error: No hay un turno de caja activo. Abre un turno antes de cobrar.');
            setProcessing(false);
            return;
        }

        // Validación final de usuario
        if (!currentUser) {
            setError('No se pudo identificar al usuario cajero.');
            setProcessing(false);
            return;
        }

        // Vehicles module: Require vehicle selection ONLY if selling services and not public client
        const hasServices = items.some(i => i.type === 'service');
        if (hasVehicles && hasServices && customer?.name !== 'Público General' && !vehicle?.id) {
            setError('Debes seleccionar un vehículo para registrar servicios automotrices.');
            setProcessing(false);
            return;
        }

        // Commissions module: Require worker assignment depending on current mode
        if (hasCommissions) {
            const serviceItemsWithCommission = items.filter(item =>
                item.commissionEnabled && item.type === 'service'
            );

            if (assignmentMode === 'general') {
                // En modo general: debe haber un trabajador global seleccionado
                if (!generalWorkerId) {
                    setError('Debes asignar un Profesional/Responsable para completar la venta.');
                    setProcessing(false);
                    return;
                }
            } else {
                // En modo individual: cada servicio con comisión habilitada debe tener su trabajador
                const missingWorker = serviceItemsWithCommission.some(
                    item => !itemWorkers[item.cartId]
                );
                if (missingWorker && serviceItemsWithCommission.length > 0) {
                    setError('Debes asignar un trabajador a cada servicio para completar la venta.');
                    setProcessing(false);
                    return;
                }
            }
        }

        if (!bypassConfirmation && method !== 'cash' && !showPaymentConfirmation) {
            setShowPaymentConfirmation(true);
            return;
        }

        setProcessing(true);
        setError(null);
        setShowPaymentConfirmation(false);

        try {

            // 1. Insert Sale
            const businessId = useBusinessStore.getState().id;

            // Allocate tips for mixed payments
            let mixedCash = parseFloat(splitAmounts.cash) || 0;
            let mixedTransfer = parseFloat(splitAmounts.transfer) || 0;
            let mixedCard = parseFloat(splitAmounts.card) || 0;
            
            if (method === 'mixed' && numericTip > 0) {
                if (mixedCash > 0) mixedCash += numericTip;
                else if (mixedTransfer > 0) mixedTransfer += numericTip;
                else if (mixedCard > 0) mixedCard += numericTip;
                else mixedCash += numericTip;
            }

            const salePayload = {
                session_id: cashSession.id,
                business_id: businessId,
                user_id: currentUser.id, // Usuario autenticado (cajero que procesa la venta)
                customer_id: customer?.id === 'anonymous' ? null : (customer?.id || null),
                vehicle_id: hasVehicles ? (vehicle?.id || null) : null,
                total_amount: total,
                total_discount: items.reduce((sum, i) => sum + (i.originalPrice ? (i.originalPrice - i.price) * i.quantity : 0), 0),
                payment_method: method,
                cash_amount: method === 'cash' ? (total + numericTip) : method === 'mixed' ? mixedCash : 0,
                transfer_amount: method === 'transfer' ? Math.max(parseFloat(transferAmount) || 0, total + numericTip) : method === 'mixed' ? mixedTransfer : 0,
                card_amount: method === 'card' ? Math.max(parseFloat(cardAmount) || 0, total + numericTip) : method === 'mixed' ? mixedCard : 0,
                credit_amount: method === 'credit' ? total : method === 'mixed' ? (parseFloat(splitAmounts.credit) || 0) : 0,
                status: 'completed',
                metadata: {
                    business_type: businessType,
                    created_from: 'desktop_pos',
                    tip_amount: parseFloat(tipAmount) || 0,
                    tip_worker_id: tipWorkerId || null,

                    ...(hasVehicles ? {
                        mileage: null,
                        vehicle_notes: null
                    } : {}),

                    // Commissions module: include stylist/worker metadata
                    ...(hasCommissions ? {
                        stylist_id: globalWorkerId
                    } : {}),

                    // Restaurant-specific (table module)
                    ...(businessType === 'restaurant' || cartMetadata?.table_id ? {
                        table_id: cartMetadata?.table_id,
                        table_name: cartMetadata?.table_name
                    } : {}),

                    // Quick sale (anonymous customer) or manually typed reference
                    ...(customer?.name === 'Público General' || quickSaleReference ? {
                        quick_sale_name: customer?.name === 'Público General' ? 'Público General' : undefined,
                        quick_sale_reference: quickSaleReference
                    } : {})
                } satisfies SaleMetadata
            };

            console.log('📦 PAYLOAD VENTA:', salePayload);

            const { data: sale, error: saleError } = await (supabase as any)
                .from('sales')
                .insert(salePayload as any)
                .select()
                .single();

            if (saleError) throw saleError;
            if (!sale) throw new Error('No se pudo crear la venta');

            // 2. Insert Sale Items with worker assignment
            const saleItemsData = items.map(item => {
                const workerId = getWorkerForItem(item.cartId);
                const serviceType = detectServiceType(item, vehicle?.type);

                return {
                    sale_id: sale.id,
                    product_id: item.type === 'product' ? item.id : null,
                    service_id: item.type === 'service' ? item.id : null,
                    quantity: item.quantity,
                    unit_price: item.price,
                    original_price: item.originalPrice || item.price,
                    discount_amount: item.originalPrice ? (item.originalPrice - item.price) * item.quantity : 0,
                    total_price: item.price * item.quantity,
                    name: item.name,
                    worker_id: workerId || null,
                    service_type: serviceType
                };
            });

            const { data: saleItems, error: itemsError } = await (supabase as any)
                .from('sale_items')
                .insert(saleItemsData)
                .select();

            if (itemsError) throw itemsError;

            // 3. Create Worker Commissions
            const commissionsData = saleItems
                .filter((item: any) => {
                    const cartItem = items.find(i => i.id === item.product_id || i.id === item.service_id);
                    return item.worker_id && cartItem?.commissionEnabled;
                })
                .map((item: any) => {
                    // Find the original cart item by matching ID and Price to be 100% sure we have the right one (especially for discounts)
                    const cartItem = items.find(i =>
                        (i.id === item.product_id || i.id === item.service_id) &&
                        i.price === item.unit_price
                    ) || items.find(i => (i.id === item.product_id || i.id === item.service_id)); // Fallback if price matching fails

                    const baseAmount = (cartItem?.originalPrice || cartItem?.originalItem?.price || item.unit_price) * item.quantity;

                    const result = getProductCommission(cartItem?.originalItem || cartItem, item.quantity);
                    const percentage = result.appliedPercentage;
                    const commission = result.commissionAmount;

                    return {
                        sale_id: sale.id,
                        sale_item_id: item.id,
                        worker_id: item.worker_id,
                        service_type: item.service_type,
                        base_amount: baseAmount,
                        commission_percentage: percentage,
                        commission_amount: commission,
                        business_id: useBusinessStore.getState().id,
                        status: 'pending'
                    };
                });

            if (commissionsData.length > 0) {
                const { error: commissionsError } = await (supabase as any)
                    .from('worker_commissions')
                    .insert(commissionsData);

                if (commissionsError) console.error('Error creating commissions:', commissionsError);
            }

            // 3.5 Save Tip as worker commission (if any)
            // Fallback: if no explicit tip worker was selected, use the general worker
            const resolvedTipWorkerId = tipWorkerId || generalWorkerId;
            if (numericTip > 0 && resolvedTipWorkerId) {
                const { error: tipError } = await (supabase as any)
                    .from('worker_commissions')
                    .insert({
                        sale_id: sale.id,
                        worker_id: resolvedTipWorkerId,
                        service_type: 'tip',
                        base_amount: numericTip,
                        commission_percentage: 100,
                        commission_amount: numericTip,
                        business_id: useBusinessStore.getState().id,
                        status: 'pending'
                    });
                if (tipError) console.error('Error saving tip:', tipError);
                else console.log(`✅ Tip saved: $${numericTip} → worker ${resolvedTipWorkerId}`);
            } else if (numericTip > 0) {
                console.warn('⚠️ Tip NOT saved: no worker assigned for the tip.');
            }

            // 4. Update Stock (for products) - Using atomic RPC
            console.log(`📦 CHECKING STOCK DEDUCTION - Total items in cart: ${items.length}`);
            console.log('📦 Items breakdown:', items.map(i => ({ name: i.name, type: i.type, id: i.id, qty: i.quantity })));

            for (const item of items) {
                if (item.type === 'product') {
                    console.log(`🔍 Deducting stock for product: ${item.name}, ID: ${item.id}, Quantity: ${item.quantity}`);
                    const { data, error: stockError } = await (supabase as any).rpc('deduct_product_stock', {
                        p_id: item.id,
                        p_quantity: item.quantity
                    });
                    if (stockError) {
                        console.error(`❌ Error updating stock for ${item.name}:`, stockError);
                    } else {
                        console.log(`✅ Stock deducted successfully for ${item.name}`, data);
                    }
                } else {
                    console.log(`⏭️ Skipping ${item.name} (type: ${item.type}) - not a product`);
                }
            }

            // 4.5. Update Customer Loyalty (Skip for Quick Client, "Público General", or explicitly opted out)
            const customerMetadata = (customer as any)?.metadata || {};
            if (customer && customer.id !== 'anonymous' && customer.name !== 'Público General' && customer.id !== '00000000-0000-0000-0000-000000000000' && !customerMetadata.loyalty_opt_out) {
                const { data: currentCustomer } = await (supabase as any)
                    .from('customers')
                    .select('loyalty_points, total_visits')
                    .eq('id', customer.id)
                    .single();

                const currentPoints = currentCustomer?.loyalty_points || 0;
                const currentVisits = currentCustomer?.total_visits || 0;

                // Restrict point accumulation rules:
                // 1. If claiming a reward (digital or manual $0 inject), NO points are earned for this visit.
                // 2. Only transactions containing a "car wash" ("lavado") are eligible for points.
                const includesReward = isRedeeming || items.some(i => i.price === 0 && (i.originalPrice || 0) > 0);
                const includesCarWash = items.some(i => {
                    const name = (i.name || '').toLowerCase();
                    const cat = (i.originalItem?.category || '').toLowerCase();
                    return name.includes('lavado') || cat.includes('lavado') || (i as any).service_type === 'car_wash';
                });

                let pointsChange = 0;

                if (includesReward) {
                    // Deduct digital points if applicable. No visit points awarded.
                    if (isRedeeming) {
                        pointsChange = -(loyaltySettings.points_threshold || 50) * redeemedServiceIds.size;
                    }
                } else if (includesCarWash) {
                    // Standard visit earning points
                    pointsChange = (loyaltySettings.points_per_visit || 10);
                }

                await (supabase as any).from('customers').update({
                    loyalty_points: Math.max(0, currentPoints + pointsChange),
                    total_visits: currentVisits + 1,
                    last_visit: new Date().toISOString()
                }).eq('id', customer.id);
            }

            // 4.6. If payment method is Credit, create customer_debts record (Disabled for anonymous)
            if (method === 'credit' && customer && customer.id !== 'anonymous') {
                console.log('💳 Attempting to create debt record for sale:', sale.id);
                try {
                    const { data: debtData, error: debtError } = await (supabase as any)
                        .from('customer_debts')
                        .insert({
                            customer_id: customer.id,
                            sale_id: sale.id,
                            amount: total,
                            remaining_amount: total,
                            business_id: useBusinessStore.getState().id,
                            status: 'pending',
                            notes: 'Venta a crédito desde POS'
                        })
                        .select()
                        .single();

                    if (debtError) {
                        console.error('❌ Error creating customer debt record:', debtError);
                        // We DON'T throw here to not block the whole sale, but we log it heavily
                        setError('Venta guardada, pero hubo un error al registrar la deuda en cartera. Por favor infórmelo.');
                    } else {
                        console.log('✅ Debt record created successfully:', debtData);
                    }
                } catch (debtCatch) {
                    console.error('💥 Unexpected exception during debt insertion:', debtCatch);
                }
            }

            // 5. Print Receipt
            const receiptData = {
                businessName: useBusinessStore.getState().name || "NEGOCIO",
                date: new Date().toLocaleString(),
                saleId: sale.id.slice(0, 8),
                cashier: currentUser.full_name || 'Admin',
                customer: customer?.name || 'Cliente General',
                vehicle: vehicle ? `${vehicle.license_plate} (${vehicle.type === 'motorcycle' ? 'Moto' : 'Carro'})` : (quickSaleReference ? `${quickSaleReference}` : null),
                items: items.map(i => {
                    const workerId = getWorkerForItem(i.cartId);
                    const worker = workers.find(w => w.id === workerId);
                    return {
                        name: i.name,
                        qty: i.quantity,
                        price: i.price,
                        total: i.price * i.quantity,
                        worker: worker?.name
                    };
                }),
                total: total,
                tip: parseFloat(tipAmount) || 0,
                tipWorker: tipWorkerId ? workers.find(w => w.id === tipWorkerId)?.name : null,
                method: method,
                received: method === 'cash' ? numericAmount : total,
                change: change,
                table: cartMetadata?.table_name
            };

            if (window.electronAPI) {
                const printerName = await window.electronAPI.storageGet('selected-printer');
                window.electronAPI.printReceipt({
                    ...receiptData,
                    printerName: printerName || undefined,
                    silent: !!printerName
                }).catch(console.error);
            }

            // 6. Release Table if applicable
            if (cartMetadata?.table_id) {
                await (supabase as any).rpc('update_table_status', {
                    p_table_id: cartMetadata.table_id,
                    p_status: 'available'
                });
                // Ensure visual selection is cleared
                useTableStore.getState().setSelectedTable(null);
            }

            setSuccess(true);

            // Dispatch event to refresh product grid with updated stock
            window.dispatchEvent(new Event('saleCompleted'));

            setTimeout(() => {
                // For table carts: remove the table's cart entry and switch back to default.
                // For default cart (Carwash / Walk-in): just reset the default cart.
                if (cartMetadata?.table_id) {
                    clearTableCart(cartMetadata.table_id);
                } else {
                    clearCart();
                }
                onClose();
            }, 2000);

        } catch (err: any) {
            console.error('Checkout error:', err);

            // Core Fix: Handle Stale Session (Foreign Key Constraint 23503)
            if (err.code === '23503' && (err.message?.includes('session_id') || err.message?.includes('cash_session_id'))) {
                setError('Tu turno de caja ha expirado o es inválido. Por seguridad, la venta fue cancelada. La sesión local ha sido reiniciada.');

                // Force clear stale session in store
                useSessionStore.getState().setCashSession(null);
            } else {
                setError(err.message || 'Error al procesar la venta');
            }
        } finally {
            setProcessing(false);
        }
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[80vh] relative">

                {/* Confirm Overlay for Electronic Payments */}
                {showPaymentConfirmation && (
                    <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-300">
                            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <span className="material-symbols-outlined !text-4xl text-primary">{method === 'card' ? 'credit_card' : 'account_balance'}</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white text-center mb-3">¿Confirmas el Pago?</h3>
                            <p className="text-slate-500 text-center font-medium leading-relaxed mb-8">
                                {method === 'credit'
                                    ? '¿Estás seguro que quieres abrir crédito a este cliente?'
                                    : <>Asegúrate de haber recibido los <span className="font-bold text-slate-800 dark:text-white">${method === 'transfer' ? (parseFloat(transferAmount) || total).toLocaleString() : total.toLocaleString()}</span> mediante {method === 'card' ? 'Tarjeta' : 'Transferencia'} antes de finalizar.</>
                                }
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowPaymentConfirmation(false)}
                                    className="h-14 font-black text-slate-400 hover:text-slate-600 transition-colors uppercase text-xs tracking-widest"
                                >
                                    No, volver
                                </button>
                                <button
                                    onClick={() => handleConfirm(true)}
                                    className="h-14 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-xs tracking-widest"
                                >
                                    Sí, Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Left: Summary & Workers */}
                <div className="flex-1 p-6 flex flex-col border-r border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="flex-none">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Caja / Cobro</h2>
                            {customer && rewardServices.length > 0 && (customer.loyalty_points || 0) >= (loyaltySettings.points_threshold || 50) && !isRedeeming && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/30 animate-pulse">
                                    <span className="material-symbols-outlined !text-[14px]">redeem</span>
                                    ¡PREMIO DISPONIBLE!
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 mb-6 font-medium">Asigna responsables y procesa el pago</p>

                        {/* Assignment Mode Tabs */}
                        <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl mb-3 relative">
                            <button
                                onClick={() => setAssignmentMode('general')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all relative z-10 ${assignmentMode === 'general' ? 'text-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined !text-[18px]">person</span>
                                General
                            </button>
                            <button
                                onClick={() => setAssignmentMode('individual')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all relative z-10 ${assignmentMode === 'individual' ? 'text-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined !text-[18px]">group</span>
                                Por Ítem
                            </button>
                            <div
                                className={`absolute inset-y-0.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-all duration-300 ease-out p-1 no-pointer-events ${assignmentMode === 'general' ? 'left-0.5 w-[calc(50%-4px)]' : 'left-[calc(50%+2px)] w-[calc(50%-4px)]'}`}
                            />
                        </div>

                        {/* Customer Manual Points Sync Button */}
                        {customer && customer.id !== 'anonymous' && customer.name !== 'Público General' && (
                            <div className="mb-4">
                                <button
                                    onClick={() => setIsManualRewardModalOpen(true)}
                                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50"
                                >
                                    <span className="material-symbols-outlined !text-[18px]">note_add</span>
                                    Unificar Puntos Físicos en Papel
                                </button>
                            </div>
                        )}

                        {/* Loyalty Redemption — Multi-reward */}
                        {customer && (customer.loyalty_points || 0) >= (loyaltySettings.points_threshold || 50) && (
                            <div className="mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                {rewardServices.length > 0 ? (
                                    <div className="rounded-2xl border-2 border-purple-200 dark:border-purple-800/50 overflow-hidden">
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-b border-purple-100 dark:border-purple-800/30">
                                            <span className="material-symbols-outlined !text-[18px] text-purple-600 dark:text-purple-400 animate-bounce">redeem</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">¡Recompensa Disponible!</span>
                                            <span className="ml-auto text-[10px] font-black text-purple-500 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full">{customer.loyalty_points} Pts</span>
                                        </div>
                                        <div className="divide-y divide-purple-100 dark:divide-purple-900/30 bg-white dark:bg-slate-800/50">
                                            {rewardServices.map(service => {
                                                const redeemed = redeemedServiceIds.has(service.id);
                                                return (
                                                    <button
                                                        key={service.id}
                                                        onClick={() => handleRedeem(service)}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 transition-all group ${ redeemed
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                                            : 'hover:bg-purple-50/60 dark:hover:bg-purple-900/10'
                                                        }`}
                                                    >
                                                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                                                            redeemed
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                                        }`}>
                                                            <span className="material-symbols-outlined !text-xl">{redeemed ? 'check_circle' : 'redeem'}</span>
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">{service.name}</p>
                                                            <p className="text-[10px] font-medium text-slate-400">{redeemed ? 'Canjeado — toca para deshacer' : `Gratis por ${loyaltySettings.points_threshold} Pts`}</p>
                                                        </div>
                                                        <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-xl border ${
                                                            redeemed
                                                                ? 'bg-emerald-500 text-white border-emerald-500'
                                                                : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                                        }`}>
                                                            {redeemed ? 'GRATIS ✓' : `${loyaltySettings.points_threshold} PTS`}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {redeemedServiceIds.size > 0 && (
                                            <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-100 dark:border-emerald-800/30 flex items-center gap-2">
                                                <span className="material-symbols-outlined !text-[14px] text-emerald-600">savings</span>
                                                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                                                    {redeemedServiceIds.size} recompensa{redeemedServiceIds.size !== 1 ? 's' : ''} canjeada{redeemedServiceIds.size !== 1 ? 's' : ''} — se descontarán {(loyaltySettings.points_threshold || 50) * redeemedServiceIds.size} Pts
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/50 text-amber-800 dark:text-amber-200">
                                        <div className="h-11 w-11 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined !text-2xl text-amber-600 dark:text-amber-400">warning</span>
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-600 dark:text-amber-400">ACCIÓN REQUERIDA</span>
                                            </div>
                                            <div className="font-bold text-sm leading-tight">Falta configurar premio</div>
                                            <p className="text-[10px] opacity-80 leading-tight mt-0.5">
                                                El cliente tiene puntos ({customer?.loyalty_points}) pero no has elegido qué servicio regalar. Ve a Configuración &gt; Fidelidad.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Payment Methods */}
                        <div className="grid grid-cols-5 gap-2 mb-4">
                            {[
                                { id: 'cash', label: 'Efectivo', icon: 'payments' },
                                { id: 'card', label: 'Tarjeta', icon: 'credit_card' },
                                { id: 'transfer', label: 'Transf.', icon: 'account_balance' },
                                { id: 'credit', label: 'Crédito', icon: 'assignment_return' },
                                { id: 'mixed', label: 'Mixto', icon: 'shuffle' },
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setMethod(m.id as PaymentMethod)}
                                    className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl border-2 transition-all ${method === m.id
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:border-primary/50'
                                        }`}
                                >
                                    <span className="material-symbols-outlined !text-xl">{m.icon}</span>
                                    <span className="font-bold text-[10px]">{m.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Split payment inputs for 'Mixto' */}
                        {method === 'mixed' && (
                            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Desglose de pago — Total: <span className="text-primary">${total.toLocaleString()}</span></p>
                                {[
                                    { key: 'cash', label: 'Efectivo', icon: 'payments', color: 'text-emerald-600' },
                                    { key: 'transfer', label: 'Transferencia', icon: 'account_balance', color: 'text-blue-600' },
                                    { key: 'card', label: 'Tarjeta', icon: 'credit_card', color: 'text-violet-600' },
                                    { key: 'credit', label: 'Crédito / Fiado', icon: 'assignment_return', color: 'text-amber-600' },
                                ].map(({ key, label, icon, color }) => (
                                    <div key={key} className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined !text-[18px] shrink-0 ${color}`}>{icon}</span>
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-28 shrink-0">{label}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={splitAmounts[key as keyof typeof splitAmounts]}
                                            onChange={e => setSplitAmounts(prev => ({ ...prev, [key]: e.target.value }))}
                                            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                ))}
                                <div className={`flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-black ${Math.abs(mixedTotal - total) < 1 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    <span>Suma total:</span>
                                    <span>${mixedTotal.toLocaleString()} {Math.abs(mixedTotal - total) < 1 ? '✓' : `(faltan $${(total - mixedTotal).toLocaleString()})`}</span>
                                </div>
                            </div>
                        )}

                        {/* Mandatory Commission Warning */}
                        {showCommissionWarnings && itemsMissingWorker.length > 0 && (
                            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="h-8 w-8 bg-rose-100 dark:bg-rose-900 flex items-center justify-center rounded-lg shrink-0">
                                    <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 !text-xl">warning</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase leading-none mb-1">Responsable Obligatorio</p>
                                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Asigna un trabajador a los ítems marcados para continuar.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Workers list / selector */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {assignmentMode === 'general' ? (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                    <label className="block text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined !text-[16px]">person_check</span>
                                        Responsable Principal
                                    </label>
                                    <select
                                        value={generalWorkerId}
                                        onChange={(e) => setGeneralWorkerId(e.target.value)}
                                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-900/50 rounded-xl outline-none focus:border-primary font-bold text-sm text-slate-800 dark:text-white transition-all shadow-sm"
                                    >
                                        <option value="">Selecciona trabajador...</option>
                                        {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                    <p className="mt-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-medium italic">
                                        * Este trabajador recibirá la comisión de todos los items.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Detalle de Items</h3>
                                    {items.map((item) => {
                                        const originalItem = item.originalItem as any;
                                        const predefinedPercentage = originalItem?.commission_percentage;
                                        const commType = originalItem?.commission_type || 'percentage';
                                        
                                        const basePrice = item.originalPrice || item.price;
                                        let percentage = 0;
                                        let commission = 0;
                                        let isFixed = false;

                                        if (item.type === 'product') {
                                            const res = getProductCommission(item.originalItem || item, item.quantity);
                                            percentage = res.appliedPercentage;
                                            isFixed = (res.appliedPercentage === 0 && res.commissionAmount > 0);
                                            commission = generalWorkerId ? res.commissionAmount : 0;
                                        } else {
                                            if (commType === 'fixed') {
                                                const fixedAmount = originalItem?.commission_amount || 0;
                                                commission = generalWorkerId ? (fixedAmount * item.quantity) : 0;
                                                isFixed = true;
                                            } else {
                                                percentage = predefinedPercentage !== undefined && predefinedPercentage > 0
                                                    ? predefinedPercentage
                                                    : 0;
                                                commission = generalWorkerId ? (basePrice * item.quantity * percentage) / 100 : 0;
                                            }
                                        }

                                        const hasActiveCommissionConfig = isFixed ? (commission > 0 || (originalItem?.commission_amount || 0) > 0) : percentage > 0;

                                        return (
                                            <div key={item.cartId} className="p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group hover:border-blue-200 transition-colors">
                                                <div>
                                                    <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">{item.name}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{item.quantity} x ${item.price.toLocaleString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black text-slate-800 dark:text-white mb-1">
                                                        ${(item.price * item.quantity).toLocaleString()}
                                                    </div>
                                                    {generalWorkerId && commission > 0 && (
                                                        <div className="flex items-center justify-end gap-1.5 animate-in fade-in zoom-in duration-300">
                                                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                                                +${commission.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {item.type === 'service' && !item.commissionEnabled && (
                                                        <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded flex items-center gap-1 justify-end">
                                                            <span className="material-symbols-outlined !text-[12px]">money_off</span>
                                                            SIN COMISIÓN
                                                        </span>
                                                    )}
                                                    {showCommissionWarnings && settingsLoaded && !generalWorkerId && hasActiveCommissionConfig && item.commissionEnabled !== false && (
                                                        <span className="text-[9px] font-black text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded flex items-center gap-1 justify-end animate-pulse">
                                                            <span className="material-symbols-outlined !text-[12px]">warning</span>
                                                            FALTA TRABAJADOR
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Tip / Propina — Collapsible (al final) */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => { const next = !showTip; setShowTip(next); if (!next) { setTipAmount(''); setTipWorkerId(''); } else if (!tipWorkerId && generalWorkerId) { setTipWorkerId(generalWorkerId); } }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold ${
                                            parseFloat(tipAmount) > 0
                                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined !text-[16px]">volunteer_activism</span>
                                        {parseFloat(tipAmount) > 0
                                            ? `Propina: $${parseFloat(tipAmount).toLocaleString()}${tipWorkerId ? ` → ${workers.find(w => w.id === tipWorkerId)?.name}` : ''}`
                                            : 'Agregar Propina'
                                        }
                                        <span className="material-symbols-outlined !text-[14px] ml-auto">{showTip ? 'expand_less' : 'expand_more'}</span>
                                    </button>

                                    {showTip && (
                                        <div className="mt-2 p-3 bg-amber-50/60 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/40 animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-black text-sm pointer-events-none">$</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="100"
                                                        placeholder="0"
                                                        autoFocus
                                                        value={tipAmount}
                                                        onChange={(e) => setTipAmount(e.target.value)}
                                                        className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-800/50 rounded-xl outline-none focus:border-amber-400 font-bold text-slate-800 dark:text-white text-sm transition-all"
                                                    />
                                                </div>
                                                <select
                                                    value={tipWorkerId}
                                                    onChange={(e) => setTipWorkerId(e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-800/50 rounded-xl outline-none focus:border-amber-400 font-bold text-sm text-slate-700 dark:text-slate-200 transition-all"
                                                >
                                                    <option value="">¿Para quién?</option>
                                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 animate-in slide-in-from-left-4 duration-300">
                                {items.map((item) => {
                                    const workerId = itemWorkers[item.cartId] || '';
                                    const serviceType = detectServiceType(item, vehicle?.type);
                                    
                                    const originalItem = item.originalItem as any;
                                    const predefinedPercentage = originalItem?.commission_percentage;
                                    const commType = originalItem?.commission_type || 'percentage';
                                    const basePrice = item.originalPrice || item.price;

                                    let percentage = 0;
                                    let commission = 0;
                                    let isFixed = false;

                                    if (item.type === 'product') {
                                        const res = getProductCommission(item.originalItem || item, item.quantity);
                                        percentage = res.appliedPercentage;
                                        isFixed = (res.appliedPercentage === 0 && res.commissionAmount > 0);
                                        commission = workerId ? res.commissionAmount : 0;
                                    } else {
                                        if (commType === 'fixed') {
                                            const fixedAmount = originalItem?.commission_amount || 0;
                                            commission = workerId ? (fixedAmount * item.quantity) : 0;
                                            isFixed = true;
                                        } else {
                                            percentage = predefinedPercentage !== undefined && predefinedPercentage > 0
                                                ? predefinedPercentage
                                                : 0;
                                            commission = workerId ? (basePrice * item.quantity * percentage) / 100 : 0;
                                        }
                                    }

                                    const hasActiveCommissionConfig = isFixed ? (commission > 0 || (originalItem?.commission_amount || 0) > 0) : percentage > 0;

                                    return (
                                        <div key={item.cartId} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary/30 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{item.name}</h4>
                                                    <p className="text-xs font-medium text-slate-500 mt-1">
                                                        {item.quantity} x ${item.price.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-black text-slate-900 dark:text-white">
                                                        ${(item.price * item.quantity).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <select
                                                        value={workerId}
                                                        onChange={(e) => setItemWorkers(prev => ({ ...prev, [item.cartId]: e.target.value }))}
                                                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none focus:border-primary font-bold shadow-inner"
                                                    >
                                                        <option value="">Asignar trabajador...</option>
                                                        {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                                    </select>
                                                </div>
                                                {workerId && commission > 0 && (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">Ganancia</span>
                                                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                            ${commission.toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 leading-none">
                                                            {isFixed ? '(Fijo)' : `(${percentage}%)`}
                                                        </span>
                                                    </div>
                                                )}
                                                {item.type === 'service' && !item.commissionEnabled && (
                                                    <div className="flex flex-col items-end opacity-60">
                                                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-tighter flex items-center gap-1">
                                                            <span className="material-symbols-outlined !text-[12px]">money_off</span>
                                                            Bonificación Desactivada
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 leading-none">No genera comisión</span>
                                                    </div>
                                                )}
                                                {showCommissionWarnings && settingsLoaded && !workerId && hasActiveCommissionConfig && item.commissionEnabled !== false && (
                                                    <div className="flex flex-col items-end animate-pulse">
                                                        <span className="text-[9px] uppercase font-black text-rose-500 tracking-tighter flex items-center gap-1">
                                                            <span className="material-symbols-outlined !text-[12px]">warning</span>
                                                            Obligatorio
                                                        </span>
                                                        <span className="text-[10px] font-bold text-rose-400 leading-none">
                                                            {isFixed ? 'Monto Fijo' : `Comisión ${percentage}%`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Overall Summary */}
                    <div className="flex-none mt-2 p-3 bg-slate-900 dark:bg-slate-800 rounded-2xl text-white shadow-xl shadow-slate-200 dark:shadow-none">
                        <div className="flex justify-between items-center mb-1.5 opacity-70">
                            <span className="text-xs font-bold uppercase tracking-widest">Total Comisiones</span>
                            <span className="text-sm font-black text-emerald-400">+ ${getTotalCommissions().toLocaleString()}</span>
                        </div>
                        {parseFloat(tipAmount) > 0 && (
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined !text-[14px]">volunteer_activism</span>
                                    Propina
                                </span>
                                <span className="text-sm font-black text-amber-400">
                                    + ${parseFloat(tipAmount).toLocaleString()}
                                    {tipWorkerId && (
                                        <span className="text-[10px] font-bold opacity-70 ml-1">→ {workers.find(w => w.id === tipWorkerId)?.name}</span>
                                    )}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-end pt-2 border-t border-white/10">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-primary tracking-widest uppercase mb-0.5">Total Venta</span>
                                <span className="text-2xl font-black leading-none">${total.toLocaleString()}</span>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-[9px] font-bold opacity-50 mb-0.5 uppercase tracking-widest">Items</span>
                                <span className="text-lg font-black opacity-80">{items.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Payment Input */}
                <div className="flex-1 p-8 bg-slate-50 dark:bg-[#101922] flex flex-col relative overflow-hidden">
                    {success && (
                        <div className="absolute inset-0 z-20 bg-emerald-500 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300">
                            <div className="h-24 w-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border-4 border-white/50 scale-110">
                                <span className="material-symbols-outlined !text-6xl animate-pulse">check_circle</span>
                            </div>
                            <h3 className="text-4xl font-black tracking-tight">¡Venta Exitosa!</h3>
                            <p className="font-bold opacity-80 mt-2 tracking-wide uppercase text-xs">Generando comprobante...</p>
                        </div>
                    )}

                    {method === 'cash' ? (
                        <>
                            <div className="mb-8">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Monto Recibido</label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 font-black text-3xl transition-colors group-focus-within:text-primary">$</span>
                                    <input
                                        type="text"
                                        readOnly
                                        value={numericAmount > 0 ? numericAmount.toLocaleString() : ''}
                                        className="w-full bg-white dark:bg-slate-900/50 border-4 border-slate-100 dark:border-slate-800 rounded-3xl py-6 pl-14 pr-6 text-5xl font-black text-right outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="mt-4 flex flex-col gap-1 items-end">
                                    <span className={`text-xs font-black uppercase tracking-widest transition-colors ${change < 0 ? 'text-rose-500' : 'text-emerald-500 opacity-60'}`}>Cambio</span>
                                    <div className={`px-4 py-2 rounded-2xl font-black text-3xl transition-all ${change < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600 scale-110 shadow-lg shadow-emerald-500/10'}`}>
                                        ${change.toLocaleString()}
                                    </div>
                                    {change > 0 && (
                                        <button
                                            onClick={() => {
                                                setTipAmount(change.toString());
                                                setShowTip(true);
                                                if (!tipWorkerId && generalWorkerId) setTipWorkerId(generalWorkerId);
                                            }}
                                            className="mt-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined !text-[14px]">volunteer_activism</span>
                                            Dejar como Propina
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Premium Numpad */}
                            <div className="grid grid-cols-3 gap-4 flex-1">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'backspace'].map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => handleNumpad(key)}
                                        className={`group relative overflow-hidden rounded-2xl transition-all active:scale-95 ${key === 'backspace' ? 'bg-rose-50 dark:bg-rose-900/10 text-rose-500' : 'bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-b-4 border-slate-200 dark:border-slate-900 shadow-md hover:shadow-lg'}`}
                                    >
                                        <span className="relative z-10 text-2xl font-black uppercase">
                                            {key === 'backspace' ? <span className="material-symbols-outlined !text-3xl">backspace</span> : key}
                                        </span>
                                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (method === 'transfer' || method === 'card') ? (
                        <div className="flex-1 flex flex-col gap-6 justify-center">
                            {/* Amount input */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                                    {method === 'transfer' ? 'Monto Recibido por Transferencia' : 'Monto Cobrado con Tarjeta'}
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 font-black text-3xl transition-colors group-focus-within:text-primary">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={method === 'transfer' ? transferAmount : cardAmount}
                                        onChange={(e) => method === 'transfer' ? setTransferAmount(e.target.value) : setCardAmount(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900/50 border-4 border-slate-100 dark:border-slate-800 rounded-3xl py-6 pl-14 pr-6 text-4xl font-black text-right outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                                        placeholder={String(total)}
                                    />
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400">Total de la venta: <span className="font-black text-slate-700 dark:text-slate-200">${total.toLocaleString()}</span></span>
                                    {((method === 'transfer' ? parseFloat(transferAmount) : parseFloat(cardAmount)) || 0) > total && (
                                        <button
                                            onClick={() => {
                                                const diff = ((method === 'transfer' ? parseFloat(transferAmount) : parseFloat(cardAmount)) || 0) - total;
                                                setTipAmount(String(diff));
                                                setShowTip(true);
                                                if (!tipWorkerId && generalWorkerId) setTipWorkerId(generalWorkerId);
                                            }}
                                            className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-400 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined !text-[14px]">volunteer_activism</span>
                                            Diferencia ${(((method === 'transfer' ? parseFloat(transferAmount) : parseFloat(cardAmount)) || 0) - total).toLocaleString()} como Propina
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Quick tip section for transfer */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => { const next = !showTip; setShowTip(next); if (!next) { setTipAmount(''); setTipWorkerId(''); } else if (!tipWorkerId && generalWorkerId) { setTipWorkerId(generalWorkerId); } }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold ${
                                        parseFloat(tipAmount) > 0
                                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    <span className="material-symbols-outlined !text-[16px]">volunteer_activism</span>
                                    {parseFloat(tipAmount) > 0
                                        ? `Propina: $${parseFloat(tipAmount).toLocaleString()}${tipWorkerId ? ` → ${workers.find(w => w.id === tipWorkerId)?.name}` : ''}`
                                        : 'Agregar Propina'
                                    }
                                    <span className="material-symbols-outlined !text-[14px] ml-auto">{showTip ? 'expand_less' : 'expand_more'}</span>
                                </button>
                                {showTip && (
                                    <div className="mt-2 p-3 bg-amber-50/60 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/40 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-black text-sm pointer-events-none">$</span>
                                                <input
                                                    type="number" min="0" step="100" placeholder="0" autoFocus
                                                    value={tipAmount}
                                                    onChange={(e) => setTipAmount(e.target.value)}
                                                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-800/50 rounded-xl outline-none focus:border-amber-400 font-bold text-slate-800 dark:text-white text-sm transition-all"
                                                />
                                            </div>
                                            <select
                                                value={tipWorkerId}
                                                onChange={(e) => setTipWorkerId(e.target.value)}
                                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-800/50 rounded-xl outline-none focus:border-amber-400 font-bold text-sm text-slate-700 dark:text-slate-200 transition-all"
                                            >
                                                <option value="">¿Para quién?</option>
                                                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="text-center">
                                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="material-symbols-outlined !text-5xl text-primary">{method === 'card' ? 'credit_card' : 'account_balance'}</span>
                                </div>
                                <p className="text-slate-400 text-xs font-medium italic">{method === 'card' ? 'Verifica que el datáfono haya aprobado el cobro antes de confirmar.' : 'Verifica el comprobante o notificación antes de confirmar.'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="h-32 w-32 bg-primary/10 rounded-full flex items-center justify-center mb-8 animate-bounce duration-1000">
                                <span className="material-symbols-outlined !text-6xl text-primary">{method === 'card' ? 'credit_card' : 'account_balance'}</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">
                                {method === 'credit' ? 'Venta a Crédito' : 'Esperando Confirmación'}
                            </h3>
                            <p className="text-slate-500 max-w-xs font-medium leading-relaxed italic">
                                {method === 'credit'
                                    ? `Se registrará una deuda de $${total.toLocaleString()} para ${customer?.name || 'el cliente'}.`
                                    : `"${method === 'card' ? 'Desliza o inserta la tarjeta en el terminal de pago para continuar.' : 'Verifica el comprobante o notificación de la transferencia bancaria.'}"`
                                }
                            </p>
                            {method === 'credit' && !customer && (
                                <p className="mt-4 text-rose-500 font-bold text-xs uppercase tracking-widest">
                                    * Debes seleccionar un cliente para fiar.
                                </p>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 animate-in slide-in-from-top-4">
                            <span className="material-symbols-outlined !text-[18px]">error</span>
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4 mt-8 flex-none">
                        <button
                            onClick={onClose}
                            className="h-16 px-8 rounded-2xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-widest text-xs"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => handleConfirm()}
                            disabled={!canConfirm || processing}
                            className="flex-1 h-16 bg-primary text-white rounded-3xl font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-3 group px-6"
                        >
                            {processing ? (
                                <span className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span>CONFIRMAR PAGO</span>
                                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">send</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <ManualRewardModal
                isOpen={isManualRewardModalOpen}
                onClose={() => setIsManualRewardModalOpen(false)}
                customer={customer}
                onSuccess={(newBalance) => {
                    setIsManualRewardModalOpen(false);
                    // Update local customer object to reflect new balance
                    if (customer) {
                        customer.loyalty_points = newBalance;
                    }
                }}
            />
        </div >
    );
};
