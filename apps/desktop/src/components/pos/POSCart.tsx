// @ts-nocheck

import { useState, useEffect } from 'react';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore, selectIsAdmin } from '@shared/store/useAuthStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useModule } from '../../hooks/useModule';
import { PaymentModal } from '../modals/PaymentModal';
import { CashMovementModal } from '../modals/CashMovementModal';
import { CustomerVehicleModal } from '../modals/CustomerVehicleModal';
import { CustomerHistoryModal } from '../modals/CustomerHistoryModal';
import { EditPriceModal } from '../modals/EditPriceModal';
import { SimpleCustomerModal } from '../modals/SimpleCustomerModal';
import { SecurityPinModal } from '../modals/SecurityPinModal';
import { POSCustomerSection } from './POSCustomerSection';
import { supabase } from '../../lib/supabase';
import { useTableStore } from '../../store/useTableStore';
import {
    Package, Scissors, Coffee, Shirt,
    Zap, Star, Gift, Tag, ShoppingBag, Briefcase,
    Wrench, Car, PenTool, Smile
} from 'lucide-react';

interface Worker {
    id: string;
    name: string;
}

interface Customer {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    loyalty_points?: number;
    total_visits?: number;
}

interface Vehicle {
    id: string;
    customer_id: string;
    license_plate: string;
    type: 'car' | 'motorcycle' | 'truck';
    brand: string | null;
    model: string | null;
    color: string | null;
}

// Icon map matching POSProductGrid
const ICON_MAP: Record<string, React.ElementType> = {
    package: Package,
    scissors: Scissors,
    coffee: Coffee,
    shirt: Shirt,
    zap: Zap,
    star: Star,
    gift: Gift,
    tag: Tag,
    bag: ShoppingBag,
    briefcase: Briefcase,
    wrench: Wrench,
    car: Car,
    tool: PenTool,
    smile: Smile
};

export const POSCart = () => {
    const {
        items,
        total,
        removeItem,
        updateQuantity,
        updatePrice,
        selectedCustomer,
        selectedVehicle,
        customerSelectionSource,
        setCustomer,
        metadata,
        setMetadata,
        activeCartId
    } = useCartStore();
    const { business, profile } = useAuthStore();
    const isAdmin = useAuthStore(selectIsAdmin);
    const protectedModules = useBusinessStore(state => state.protectedModules);
    const isRestaurant = business?.business_type === 'restaurant';
    // Module-based feature flags — replaces hardcoded business_type checks
    const hasVehicles = useModule('vehicles');
    const hasCommissions = useModule('commissions');

    // Restaurant: customer section collapsed by default, toggled via 'Opciones Avanzadas'
    const [showCustomerSection, setShowCustomerSection] = useState(false);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyTab, setHistoryTab] = useState<'ventas' | 'clinico'>('ventas');

    // Worker Logic
    const [workers, setWorkers] = useState<Worker[]>([]);
    const { globalWorkerId, setGlobalWorker } = useCartStore();

    const businessId = useBusinessStore(state => state.id);

    useEffect(() => {
        if (!businessId) return;

        const fetchWorkers = async () => {
            console.log("🔍 FETCH TRABAJADORES POS - Business ID:", businessId);
            const { data, error } = await supabase
                .from('workers')
                .select('id, name, roles(name)')
                .eq('business_id', businessId)
                .eq('active', true)
                .order('name');

            console.log("🔍 RESULTADO TRABAJADORES POS:", { data, error });

            if (data) {
                setWorkers(data);
            }
        };
        fetchWorkers();
    }, [businessId]);

    // Price Edit Modal State
    const [priceEditModal, setPriceEditModal] = useState<{ isOpen: boolean; itemId: string; currentPrice: number; originalPrice: number; name: string } | null>(null);
    const [isSecurityPinOpen, setIsSecurityPinOpen] = useState(false);
    // Track which cart item the PIN modal is being requested for deletion
    const [pendingDeleteCartId, setPendingDeleteCartId] = useState<string | null>(null);

    // Customer & Vehicle State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Frequent Customer Logic
    const [last30DaysVisits, setLast30DaysVisits] = useState(0);

    // State for Cash Movements
    const [movementModal, setMovementModal] = useState<{ isOpen: boolean; type: 'income' | 'expense' | 'favor' }>({
        isOpen: false,
        type: 'income'
    });

    // Loyalty settings in Cart
    const [loyaltySettings, setLoyaltySettings] = useState<any>({ points_per_visit: 10, points_threshold: 50 });

    useEffect(() => {
        const fetchLoyalty = async () => {
            const businessId = useBusinessStore.getState().id;
            const { data } = await supabase
                .from('business_settings')
                .select('value')
                .eq('business_id', businessId)
                .eq('setting_type', 'loyalty')
                .maybeSingle();
            if (data?.value) setLoyaltySettings(data.value);
        };
        fetchLoyalty();
    }, []);

    // Fetch visits in last 30 days
    useEffect(() => {
        const fetchVisits = async () => {
            if (!selectedCustomer) {
                setLast30DaysVisits(0);
                return;
            }
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const businessId = useBusinessStore.getState().id;
            const { count } = await supabase
                .from('sales')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', businessId)
                .eq('customer_id', selectedCustomer.id)
                .gte('created_at', thirtyDaysAgo.toISOString());

            setLast30DaysVisits(count || 0);
        };
        fetchVisits();
    }, [selectedCustomer]);

    // Search as user types
    useEffect(() => {
        if (searchQuery.length > 2) {
            handleQuickSearch();
        }
    }, [searchQuery]);

    useEffect(() => {
        const handleSearchPlate = (e: CustomEvent) => {
            const plate = e.detail;
            if (plate) {
                setSearchQuery(plate);
                // Trigger immediate search for the plate from queue
                handleQuickSearch(plate);
            }
        };

        const handleAddToCartFromQueue = (e: CustomEvent) => {
            const { plate, workerId, items, service } = e.detail;

            // Handle multiple items (new system)
            if (items && Array.isArray(items)) {
                items.forEach(item => {
                    const type = item.service_id ? 'service' : 'product';
                    const rawData = item.service || item.product;
                    // PostgREST might return an array or single object
                    const data = Array.isArray(rawData) ? rawData[0] : rawData;

                    if (data) {
                        useCartStore.getState().addItem(data, type, data.price, workerId);
                    }
                });
            }
            // Fallback for single service (old system or legacy data)
            else if (service) {
                const data = Array.isArray(service) ? service[0] : service;
                useCartStore.getState().addItem(data, 'service', data.price, workerId);
            }

            if (plate) {
                setSearchQuery(plate);
                handleQuickSearch(plate);
            }
        };

        const handleSelectTable = (e: CustomEvent) => {
            const { table } = e.detail;
            if (table) {
                // Belt-and-suspenders: ensure cart is switched to this table's cart
                useCartStore.getState().setActiveCart(table.id);
                setMetadata({
                    table_id: table.id,
                    table_name: table.name
                });
            }
        };

        window.addEventListener('pos-search-plate', handleSearchPlate as EventListener);
        window.addEventListener('pos-add-to-cart-from-queue', handleAddToCartFromQueue as EventListener);
        window.addEventListener('pos-select-table', handleSelectTable as EventListener);
        return () => {
            window.removeEventListener('pos-search-plate', handleSearchPlate as EventListener);
            window.removeEventListener('pos-add-to-cart-from-queue', handleAddToCartFromQueue as EventListener);
            window.removeEventListener('pos-select-table', handleSelectTable as EventListener);
        };
    }, []);

    const handleQuickSearch = async (overrideQuery?: string) => {
        const query = overrideQuery || searchQuery;
        if (!query || query.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        setIsSearching(true);
        try {
            const normalizedQuery = query.toUpperCase().replace(/[^A-Z0-9]/g, '');

            // Search customers and vehicles concurrently
            const businessId = useBusinessStore.getState().id;

            const promises = [
                supabase
                    .from('customers')
                    .select('*')
                    .eq('business_id', businessId)
                    .is('metadata->>merged_into_id', null)
                    .or(`phone.ilike.%${query}%,name.ilike.%${query}%`)
                    .limit(5)
            ];

            if (hasVehicles) {
                promises.push(
                    supabase
                        .from('vehicles')
                        .select('*, customer:customers!inner(*)')
                        .eq('business_id', businessId)
                        .or(`license_plate.ilike.%${query}%,license_plate.ilike.%${normalizedQuery}%`)
                        .limit(10)
                );
            }

            const results = await Promise.all(promises);
            const customerRes = results[0];
            const vehicleRes = hasVehicles ? results[1] : { data: [] };

            const customers = customerRes.data || [];
            const vehicles = vehicleRes.data || [];

            let combinedResults: any[] = [];

            // 1. Process vehicles (Prioritizing plate matches)
            const plateMatches = vehicles.filter(v => {
                const vPlateNorm = v.license_plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
                return vPlateNorm.includes(normalizedQuery) || v.license_plate.toUpperCase().includes(query.toUpperCase());
            });

            combinedResults.push(...plateMatches.map(v => ({ type: 'vehicle', data: v })));

            // 2. Add other vehicles (matched by owner)
            const otherVehicles = vehicles.filter(v => !plateMatches.find(pm => pm.id === v.id));
            combinedResults.push(...otherVehicles.map(v => ({ type: 'vehicle', data: v })));

            // 3. Add customers (deduplicate)
            customers.forEach(c => {
                const alreadyFound = combinedResults.find(r =>
                    (r.type === 'vehicle' && r.data.customer_id === c.id) ||
                    (r.type === 'customer' && r.data.id === c.id)
                );
                if (!alreadyFound) {
                    combinedResults.push({ type: 'customer', data: c });
                }
            });

            setSearchResults(combinedResults.slice(0, 10));
            setShowResults(combinedResults.length > 0);
        } catch (error) {
            console.error('Quick search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && showResults && searchResults.length > 0) {
            const firstResult = searchResults[0];
            if (firstResult.type === 'customer') {
                handleCustomerSelect(firstResult.data, null, 'quick_search');
            } else {
                handleCustomerSelect(firstResult.data.customer, firstResult.data, 'quick_search');
            }
            setShowResults(false);
            setSearchResults([]);
            setSearchResults([]);
        }
    };

    const handleCustomerSelect = async (customer: Customer | null, vehicle: Vehicle | null, source: 'quick_search' | 'modal' = 'modal') => {
        // If the user clicked "Continuar sin registrar" in the modal, it returns null for both
        if (!customer) {
            handleQuickClient();
            // Do NOT clear searchQuery here, we might need it as quickSaleReference
            setShowResults(false);
            setSearchResults([]);
            return;
        }

        let finalVehicle = vehicle;

        // Auto-fetch vehicle if they selected the customer by name instead of plate
        if (hasVehicles && !vehicle && customer && customer.id !== 'anonymous') {
            try {
                const { data } = await supabase
                    .from('vehicles')
                    .select('*')
                    .eq('customer_id', customer.id);

                if (data && data.length === 1) {
                    // Only one vehicle? Auto-select it
                    finalVehicle = data[0];
                } else if (data && data.length > 1) {
                    // Multiple vehicles? We must ask the user which one they want
                    // Set the customer but keep vehicle null, and open the vehicle selection modal
                    setCustomer(customer, null, source);
                    setSearchQuery('');
                    setShowResults(false);
                    setSearchResults([]);
                    setIsCustomerModalOpen(true);
                    return;
                }
            } catch (err) {
                console.error("Error auto-fetching vehicle for customer:", err);
            }
        }

        setCustomer(customer, finalVehicle, source);
        
        // Only clear the search query if this is a REAL customer with a REAL vehicle.
        // If it's Público General, we want to keep the query as the quick sale reference (like a plate).
        if (customer.name !== 'Público General') {
            setSearchQuery('');
        }
        
        setShowResults(false);
        setSearchResults([]);
    };

    const handleClearCustomer = () => {
        setCustomer(null, null, null);
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
    };

    const handlePayment = () => {
        // Restaurant: no customer required — go straight to payment
        if (isRestaurant) {
            setIsPaymentModalOpen(true);
            return;
        }

        const hasServices = useCartStore.getState().items.some(i => i.type === 'service');
        const needsVehicle = hasVehicles && hasServices && selectedCustomer?.name !== 'Público General' && !selectedVehicle;

        // If no customer selected, OR missing vehicle for services, open customer modal first
        if (!selectedCustomer || needsVehicle) {
            setIsCustomerModalOpen(true);
        } else {
            setIsPaymentModalOpen(true);
        }
    };

    const handleQuickClient = async () => {
        // Safe DB-backed "Público General" customer
        try {
            const businessId = useBusinessStore.getState().id;
            const publicName = 'Público General';

            // 1. Try to find existing "Público General" customer
            const { data: existingCustomer, error: searchError } = await supabase
                .from('customers')
                .select('*')
                .eq('business_id', businessId)
                .eq('name', publicName)
                .maybeSingle();

            if (searchError) {
                console.error('Error searching for public customer:', searchError);
                // Fallback: Create without checking
            }

            let publicCustomer = existingCustomer;

            // 2. If not found, create it
            if (!publicCustomer) {
                const { data: newCustomer, error: insertError } = await supabase
                    .from('customers')
                    .insert({
                        business_id: businessId,
                        name: publicName,
                        phone: null,
                        email: null,
                        loyalty_points: 0,
                        total_visits: 0
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error('Error creating public customer:', insertError);
                    alert('Error al crear cliente Público General. Por favor, intenta nuevamente.');
                    return;
                }

                publicCustomer = newCustomer;
            }

            // 3. Select the customer (now with real UUID)
            if (publicCustomer) {
                handleCustomerSelect(publicCustomer, null, 'modal');
            }
        } catch (err) {
            console.error('Unexpected error in handleQuickClient:', err);
            alert('Error al seleccionar Público General.');
        }
    };

    const handleCustomerModalClose = () => {
        setIsCustomerModalOpen(false);
        // If customer was selected, proceed to payment
        if (selectedCustomer) {
            setIsPaymentModalOpen(true);
        }
    };

    const isFrequentCustomer = last30DaysVisits >= 3; // 3 or more visits in 30 days

    const handlePriceEditSave = (newPrice: number) => {
        if (priceEditModal) {
            if (priceEditModal.itemId === 'global') {
                useCartStore.getState().applyGlobalDiscount(newPrice);
            } else {
                updatePrice(priceEditModal.itemId, newPrice);
            }
            setPriceEditModal(null);
        }
    };

    // Worker label derived from active modules (not business type string)
    const workerLabel = hasVehicles
        ? 'Mecánico / Técnico'
        : hasCommissions
            ? 'Barbero / Estilista'
            : 'Vendedor / Responsable';

    return (
        <aside className="w-[350px] lg:w-[400px] xl:w-[450px] flex-none flex flex-col bg-white dark:bg-[#080d1e] border-l border-slate-200/60 dark:border-white/5 shadow-2xl z-30 relative">
            {hasVehicles ? (
                <CustomerVehicleModal
                    isOpen={isCustomerModalOpen}
                    onClose={handleCustomerModalClose}
                    onSelect={(c, v) => handleCustomerSelect(c, v, 'modal')}
                    initialPlate={searchQuery}
                    preSelectedCustomer={selectedCustomer}
                />
            ) : (
                <SimpleCustomerModal
                    isOpen={isCustomerModalOpen}
                    onClose={handleCustomerModalClose}
                    onSelect={(customer) => handleCustomerSelect(customer, null, 'modal')}
                    onQuickSale={handleQuickClient}
                />
            )}

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                customer={selectedCustomer}
                vehicle={selectedVehicle}
                workers={workers}
                quickSaleReference={searchQuery}
            />

            <CashMovementModal
                isOpen={movementModal.isOpen}
                onClose={() => setMovementModal({ ...movementModal, isOpen: false })}
                type={movementModal.type}
            />

            <CustomerHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                customer={selectedCustomer}
                vehicle={selectedVehicle}
                initialTab={historyTab}
            />

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

            {isSecurityPinOpen && (
                <SecurityPinModal
                    onCancel={() => setIsSecurityPinOpen(false)}
                    onSuccess={() => {
                        setIsSecurityPinOpen(false);
                        // Open the edit modal with the current aggregated total
                        const currentTotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                        const originalTotal = items.reduce((acc, i) => acc + ((i.originalPrice || i.price) * i.quantity), 0);
                        setPriceEditModal({
                            isOpen: true,
                            itemId: 'global',
                            currentPrice: currentTotal,
                            originalPrice: originalTotal,
                            name: 'Total de la Venta'
                        });
                    }}
                    title="PIN Maestro Requerido"
                    description="Ingrese el PIN Maestro del negocio para autorizar la modificación del precio total de esta venta."
                />
            )}

            {/* PIN Modal for item deletion (non-admin users) */}
            {pendingDeleteCartId && (
                <SecurityPinModal
                    onCancel={() => setPendingDeleteCartId(null)}
                    onSuccess={() => {
                        removeItem(pendingDeleteCartId);
                        setPendingDeleteCartId(null);
                    }}
                    title="Autorización Requerida"
                    description="Ingrese el PIN Maestro del negocio para eliminar este ítem de la venta."
                />
            )}

            {/* ── RESTAURANT: Back-to-Patio header strip ── */}
            {isRestaurant && metadata?.table_id && (
                <div className="flex-none flex items-center justify-between px-4 py-2.5 bg-primary text-white animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined !text-[20px]">table_restaurant</span>
                        <div className="flex flex-col leading-tight">
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-75">Cuenta de</span>
                            <span className="text-sm font-black">{metadata.table_name || 'Mesa'}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            window.dispatchEvent(new Event('pos-back-to-patio'));
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined !text-[16px]">arrow_back</span>
                        Volver al Patio
                    </button>
                </div>
            )}

            {/* ── RESTAURANT: Opciones Avanzadas toggle (customer section) ── */}
            {isRestaurant ? (
                <div className="flex-none">
                    <button
                        onClick={() => setShowCustomerSection(v => !v)}
                        className="w-full flex items-center justify-between px-5 py-2 border-b border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {selectedCustomer ? `🧑 ${selectedCustomer.name}` : 'Vincular Cliente (Opcional)'}
                        </span>
                        <span className={`material-symbols-outlined !text-[18px] transition-transform ${showCustomerSection ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    {showCustomerSection && (
                        <POSCustomerSection
                            selectedCustomer={selectedCustomer}
                            selectedVehicle={selectedVehicle}
                            searchQuery={searchQuery}
                            searchResults={searchResults}
                            showResults={showResults}
                            isSearching={isSearching}
                            last30DaysVisits={last30DaysVisits}
                            loyaltySettings={loyaltySettings}
                            onSearchChange={setSearchQuery}
                            onSearchKeyDown={handleSearchKeyDown}
                            onSearchFocus={() => searchResults.length > 0 && setShowResults(true)}
                            onResultClick={(result) => {
                                if (result.type === 'customer') {
                                    handleCustomerSelect(result.data, null, 'quick_search');
                                } else {
                                    handleCustomerSelect(result.data.customer, result.data, 'quick_search');
                                }
                                setShowResults(false);
                                setSearchResults([]);
                            }}
                            onCloseResults={() => {
                                setShowResults(false);
                                setSearchResults([]);
                            }}
                            onCustomerSelect={handleCustomerSelect}
                            onClearCustomer={handleClearCustomer}
                            onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
                            onQuickClient={handleQuickClient}
                            onOpenHistory={(tab) => {
                                setHistoryTab(tab);
                                setIsHistoryModalOpen(true);
                            }}
                        />
                    )}
                </div>
            ) : (
                /* ── NON-RESTAURANT: always-visible customer + table section ── */
                <div className="flex flex-col gap-2">
                    <POSCustomerSection
                        selectedCustomer={selectedCustomer}
                        selectedVehicle={selectedVehicle}
                        searchQuery={searchQuery}
                        searchResults={searchResults}
                        showResults={showResults}
                        isSearching={isSearching}
                        last30DaysVisits={last30DaysVisits}
                        loyaltySettings={loyaltySettings}
                        onSearchChange={setSearchQuery}
                        onSearchKeyDown={handleSearchKeyDown}
                        onSearchFocus={() => searchResults.length > 0 && setShowResults(true)}
                        onResultClick={(result) => {
                            if (result.type === 'customer') {
                                handleCustomerSelect(result.data, null, 'quick_search');
                            } else {
                                handleCustomerSelect(result.data.customer, result.data, 'quick_search');
                            }
                            setShowResults(false);
                            setSearchResults([]);
                        }}
                        onCloseResults={() => {
                            setShowResults(false);
                            setSearchResults([]);
                        }}
                        onCustomerSelect={handleCustomerSelect}
                        onClearCustomer={handleClearCustomer}
                        onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
                        onQuickClient={handleQuickClient}
                        onOpenHistory={(tab) => {
                            setHistoryTab(tab);
                            setIsHistoryModalOpen(true);
                        }}
                    />
                </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 border-2 border-dashed border-slate-200/60 dark:border-white/5 rounded-2xl m-4 bg-slate-50/30 dark:bg-white/[0.015]">
                        <div className="h-20 w-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined !text-[40px] opacity-30">shopping_cart_off</span>
                        </div>
                        <p className="font-medium text-sm text-slate-500 dark:text-slate-400">El carrito está vacío</p>
                        <p className="text-xs opacity-60 mt-1">Escanea productos o selecciona servicios</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.cartId} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-white/[0.03] shadow-sm border border-slate-100/80 dark:border-white/5 hover:border-primary/30 dark:hover:border-primary/20 transition-all group relative overflow-hidden">
                            {/* Item Type Color Strip */}
                            <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${item.type === 'product' ? 'bg-gradient-to-b from-amber-400 to-orange-500' : 'bg-gradient-to-b from-primary to-blue-600'}`}></div>

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
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
                                                ${((item.originalPrice || item.price) * item.quantity).toLocaleString()}
                                            </span>
                                            {item.originalPrice && item.price !== item.originalPrice && (
                                                <span className="text-xs font-bold text-amber-500">
                                                    (-${((item.originalPrice - item.price) * item.quantity).toLocaleString()})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                                            {item.quantity} x ${(item.price).toLocaleString()}
                                        </div>
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

                            {/* Actions & Toggles */}
                            <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <button
                                    onClick={() => {
                                        if (isAdmin) {
                                            removeItem(item.cartId);
                                        } else {
                                            setPendingDeleteCartId(item.cartId);
                                        }
                                    }}
                                    className="p-1.5 text-rose-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                    title={isAdmin ? 'Eliminar ítem' : 'Eliminar ítem (requiere PIN)'}
                                >
                                    <span className="material-symbols-outlined !text-[18px]">delete</span>
                                    {!isAdmin && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-amber-400 rounded-full border border-white dark:border-slate-800" title="Requiere autorización"></span>}
                                </button>

                                <button
                                    onClick={() => useCartStore.getState().toggleCommission(item.cartId)}
                                    className={`p-1.5 rounded-lg transition-all ${item.commissionEnabled
                                        ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-inner'
                                        : 'text-slate-300 hover:text-slate-400'
                                        }`}
                                    title={item.commissionEnabled ? 'Comisión Activada' : 'Activar Comisión'}
                                >
                                    <span className="material-symbols-outlined !text-[18px]">
                                        {item.commissionEnabled ? 'monetization_on' : 'money_off'}
                                    </span>
                                </button>
                            </div>

                            {/* Commission Indicator */}
                            {item.commissionEnabled && (
                                <div className="absolute top-0 right-7 bg-emerald-500 w-2 h-2 rounded-full border-2 border-white dark:border-slate-800"></div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Totals & Actions */}
            <div className="flex-none p-6 bg-slate-50/70 dark:bg-[#060a18] border-t border-slate-200/50 dark:border-white/5 shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.25)] z-40 space-y-4">

                {/* Worker Selector */}
                <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">
                        {workerLabel}
                    </label>
                    <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800 border rounded-xl transition-all ${globalWorkerId
                        ? 'border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10'
                        : hasCommissions && items.some(i => i.type === 'service')
                            ? 'border-rose-400 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/10 animate-pulse'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}>
                        <span className={`material-symbols-outlined absolute left-3 !text-[20px] ${globalWorkerId ? 'text-blue-500' : 'text-slate-400'}`}>badge</span>
                        <select
                            className="w-full h-11 pl-10 pr-4 bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer"
                            value={globalWorkerId || ''}
                            onChange={(e) => setGlobalWorker(e.target.value || null)}
                        >
                            <option value="">(Sin asignar - Opcional)</option>
                            {workers.map(w => (
                                <option key={w.id} value={w.id}>
                                    {w.name} ({w.roles?.name || w.role || 'Sin Rol'})
                                </option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 !text-[20px] text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700/50">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subtotal</span>
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">${total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1 items-start">
                            <span className="text-sm font-bold text-slate-800 dark:text-white block">Total a Pagar</span>
                            <button
                                onClick={() => {
                                    if (items.length > 0) {
                                        const isPriceProtected = protectedModules.includes('pos_edit_price');
                                        if (!isPriceProtected) {
                                            const currentTotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                                            const originalTotal = items.reduce((acc, i) => acc + ((i.originalPrice || i.price) * i.quantity), 0);
                                            setPriceEditModal({
                                                isOpen: true,
                                                itemId: 'global',
                                                currentPrice: currentTotal,
                                                originalPrice: originalTotal,
                                                name: 'Total de la Venta'
                                            });
                                        } else {
                                            setIsSecurityPinOpen(true);
                                        }
                                    }
                                }}
                                disabled={items.length === 0}
                                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary-hover font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded shadow-sm"
                            >
                                <span className="material-symbols-outlined !text-[12px]">edit</span>
                                Descuento / Modificar
                            </button>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <span className="block text-4xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
                                ${items.reduce((acc, i) => acc + (i.originalPrice || i.price) * i.quantity, 0).toLocaleString()}
                            </span>
                            {items.some(i => i.originalPrice && i.price < i.originalPrice) && (
                                <span className="block text-lg font-bold text-amber-500 mt-2">
                                    (-${items.reduce((acc, i) => acc + ((i.originalPrice || i.price) - i.price) * i.quantity, 0).toLocaleString()})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                    <button
                        onClick={() => setMovementModal({ isOpen: true, type: 'income' })}
                        className="col-span-1 h-14 rounded-xl border border-emerald-200/60 dark:border-emerald-500/10 bg-emerald-50/60 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-100/80 dark:hover:bg-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/20 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group"
                        title="Ingreso Extra"
                    >
                        <span className="material-symbols-outlined !text-[20px]">add_circle</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider leading-none truncate w-full px-1 text-center">Ingreso</span>
                    </button>
                    <button
                        onClick={() => setMovementModal({ isOpen: true, type: 'expense' })}
                        className="col-span-1 h-14 rounded-xl border border-rose-200/60 dark:border-rose-500/10 bg-rose-50/60 dark:bg-rose-500/5 text-rose-500 dark:text-rose-400 hover:bg-rose-100/80 dark:hover:bg-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/20 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group"
                        title="Gasto Rápido"
                    >
                        <span className="material-symbols-outlined !text-[20px]">remove_circle</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider leading-none truncate w-full px-1 text-center">Gasto</span>
                    </button>
                    <button
                        onClick={() => setMovementModal({ isOpen: true, type: 'favor' })}
                        className="col-span-1 h-14 rounded-xl border border-blue-200/60 dark:border-blue-500/10 bg-blue-50/60 dark:bg-blue-500/5 text-blue-500 dark:text-blue-400 hover:bg-blue-100/80 dark:hover:bg-blue-500/10 hover:border-blue-300 dark:hover:border-blue-500/20 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group"
                        title="Canje de Efectivo/Transferencia"
                    >
                        <span className="material-symbols-outlined !text-[20px] transition-transform group-hover:rotate-180 duration-500">swap_horiz</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider leading-none truncate w-full px-1 text-center">Canje</span>
                    </button>
                    <button className="col-span-1 h-14 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/10 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group">
                        <span className="material-symbols-outlined !text-[20px]">print</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider leading-none truncate w-full px-1 text-center">Imprimir</span>
                    </button>
                    <button
                        onClick={handlePayment}
                        disabled={items.length === 0}
                        className="col-span-1 h-14 rounded-xl bg-gradient-to-br from-primary via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 flex flex-col items-center justify-center gap-1 font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        <span className="material-symbols-outlined !text-[24px]">payments</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Cobrar</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};
