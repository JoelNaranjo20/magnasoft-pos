import { create } from 'zustand';
import type { Database } from '../types/supabase';
import type { SaleMetadata } from '../types/pos';
import { useTableStore } from './useTableStore';

type Product = Database['public']['Tables']['products']['Row'];
type Service = Database['public']['Tables']['services']['Row'];

export interface CartItem {
    cartId: string; // Unique ID for the cart entry
    id: string; // Product or Service ID (DB ID)
    name: string;
    price: number;
    originalPrice?: number;
    quantity: number;
    type: 'product' | 'service';
    originalItem: Product | Service;
    workerId?: string;
    commissionEnabled: boolean;
}

// Per-cart data (items, total, customer, metadata)
interface CartData {
    items: CartItem[];
    total: number;
    metadata: Partial<SaleMetadata>;
    selectedCustomer: any | null;
    selectedVehicle: any | null;
    customerSelectionSource: 'quick_search' | 'modal' | null;
}

const DEFAULT_CART_ID = 'default';

const emptyCart = (): CartData => ({
    items: [],
    total: 0,
    metadata: {},
    selectedCustomer: null,
    selectedVehicle: null,
    customerSelectionSource: null,
});

interface CartState {
    // --- Multi-cart map ---
    carts: Record<string, CartData>;
    activeCartId: string;

    // --- Top-level (shared across all carts) ---
    globalWorkerId?: string | null;
    setGlobalWorker: (workerId: string | null) => void;

    activeCategoryId: string | null;
    setActiveCategoryId: (categoryId: string | null) => void;

    // --- Active-cart context switching ---
    setActiveCart: (cartId: string) => void;

    // --- Computed selectors (always from activeCartId) ---
    // These preserve the existing API so all consumers work without changes.
    readonly items: CartItem[];
    readonly total: number;
    readonly metadata: Partial<SaleMetadata>;
    readonly selectedCustomer: any | null;
    readonly selectedVehicle: any | null;
    readonly customerSelectionSource: 'quick_search' | 'modal' | null;

    // --- Active-cart actions ---
    setMetadata: (data: Partial<SaleMetadata>) => void;
    setCustomer: (customer: any | null, vehicle: any | null, source?: 'quick_search' | 'modal') => void;

    addItem: (item: Product | Service, type: 'product' | 'service', customPrice?: number, workerId?: string) => void;
    removeItem: (cartId: string) => void;
    updateQuantity: (cartId: string, delta: number) => void;
    updatePrice: (cartId: string, newPrice: number) => void;
    toggleCommission: (cartId: string) => void;

    // Clears the active cart (resets to empty for 'default', deletes for table carts)
    clearCart: () => void;

    // Explicitly clear a table cart by table ID (called by PaymentModal after checkout)
    clearTableCart: (tableId: string) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
    carts: {
        [DEFAULT_CART_ID]: emptyCart(),
    },
    activeCartId: DEFAULT_CART_ID,
    globalWorkerId: null,
    activeCategoryId: null,

    // ---------------------------------------------------------------------
    // Computed selectors — proxy into the active cart
    // Zustand doesn't support true computed getters, but we expose these
    // as getter functions via Object.defineProperties after creation.
    // We declare them here as dummy values; they're replaced below via
    // the getter pattern using a Zustand middleware-compatible workaround:
    // We re-expose them as plain state that's always in sync.
    // The cleanest approach: return from get() in actions, and let
    // components destructure from the store which auto-re-renders on change.
    //
    // For full compatibility we expose these as plain top-level keys that
    // mirror the active cart, updated via a helper.
    // ---------------------------------------------------------------------
    items: [],
    total: 0,
    metadata: {},
    selectedCustomer: null,
    selectedVehicle: null,
    customerSelectionSource: null,

    // ------------------------------------------------------------------
    // Internal helper: syncs top-level proxy fields from active cart
    // ------------------------------------------------------------------

    setActiveCart: (cartId: string) => {
        const { carts } = get();
        // Ensure the target cart exists
        const targetCart = carts[cartId] ?? emptyCart();
        set({
            activeCartId: cartId,
            carts: { ...carts, [cartId]: targetCart },
            // Sync proxy fields
            items: targetCart.items,
            total: targetCart.total,
            metadata: targetCart.metadata,
            selectedCustomer: targetCart.selectedCustomer,
            selectedVehicle: targetCart.selectedVehicle,
            customerSelectionSource: targetCart.customerSelectionSource,
        });
    },

    setGlobalWorker: (workerId) => set({ globalWorkerId: workerId }),
    setActiveCategoryId: (categoryId) => set({ activeCategoryId: categoryId }),

    setMetadata: (data) => {
        const { carts, activeCartId } = get();
        const cart = carts[activeCartId] ?? emptyCart();
        const updatedCart: CartData = {
            ...cart,
            metadata: { ...cart.metadata, ...data },
        };
        set({
            carts: { ...carts, [activeCartId]: updatedCart },
            metadata: updatedCart.metadata,
        });
    },

    setCustomer: (customer, vehicle, source = 'modal') => {
        const { carts, activeCartId } = get();
        const cart = carts[activeCartId] ?? emptyCart();
        const updatedCart: CartData = {
            ...cart,
            selectedCustomer: customer,
            selectedVehicle: vehicle,
            customerSelectionSource: source,
        };
        set({
            carts: { ...carts, [activeCartId]: updatedCart },
            selectedCustomer: customer,
            selectedVehicle: vehicle,
            customerSelectionSource: source,
        });
    },

    addItem: (item, type, customPrice, workerId) => {
        const { carts, activeCartId } = get();
        const cart = carts[activeCartId] ?? emptyCart();
        const items = cart.items;

        const finalPrice = customPrice !== undefined ? customPrice : item.price;
        const existingItem = items.find((i) => i.id === item.id && i.price === finalPrice);

        let updatedItems: CartItem[];
        let updatedTotal: number;

        if (existingItem) {
            updatedItems = items.map((i) =>
                i.cartId === existingItem.cartId
                    ? {
                        ...i,
                        quantity: i.quantity + 1,
                        workerId: workerId || i.workerId,
                        type: i.type || type,
                        originalItem: i.originalItem || item,
                        commissionEnabled:
                            i.commissionEnabled !== undefined ? i.commissionEnabled : type === 'service',
                    }
                    : i
            );
            updatedTotal = cart.total + finalPrice;
        } else {
            updatedItems = [
                ...items,
                {
                    cartId: crypto.randomUUID(),
                    id: item.id,
                    name: item.name,
                    price: finalPrice,
                    originalPrice: item.price,
                    quantity: 1,
                    type,
                    originalItem: item,
                    workerId,
                    commissionEnabled: type === 'service',
                },
            ];
            updatedTotal = cart.total + finalPrice;
        }

        const updatedCart: CartData = { ...cart, items: updatedItems, total: updatedTotal };
        set({
            carts: { ...carts, [activeCartId]: updatedCart },
            items: updatedItems,
            total: updatedTotal,
        });
    },

    removeItem: (cartId) => {
        const { carts, activeCartId } = get();
        const cart = carts[activeCartId] ?? emptyCart();
        const itemToRemove = cart.items.find((i) => i.cartId === cartId);
        if (!itemToRemove) return;

        const updatedItems = cart.items.filter((i) => i.cartId !== cartId);
        const updatedTotal = cart.total - itemToRemove.price * itemToRemove.quantity;
        const updatedCart: CartData = { ...cart, items: updatedItems, total: updatedTotal };

        set({
            carts: { ...carts, [activeCartId]: updatedCart },
            items: updatedItems,
            total: updatedTotal,
        });
    },

    updateQuantity: (cartId, delta) => {
        const { carts, activeCartId } = get();
        const cart = carts[activeCartId] ?? emptyCart();
        const item = cart.items.find((i) => i.cartId === cartId);
        if (!item) return;

        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) {
            get().removeItem(cartId);
            return;
        }

        const updatedItems = cart.items.map((i) =>
            i.cartId === cartId ? { ...i, quantity: newQuantity } : i
        );
        const updatedTotal = cart.total + item.price * delta;
        const updatedCart: CartData = { ...cart, items: updatedItems, total: updatedTotal };

        set({
            carts: { ...carts, [activeCartId]: updatedCart },
            items: updatedItems,
            total: updatedTotal,
        });
    },

    updatePrice: (cartId, newPrice) => {
        const { carts, activeCartId } = get();
        const cart = carts[activeCartId] ?? emptyCart();
        const item = cart.items.find((i) => i.cartId === cartId);
        if (!item) return;

        const totalDifference = (newPrice - item.price) * item.quantity;
        const updatedItems = cart.items.map((i) =>
            i.cartId === cartId ? { ...i, price: newPrice } : i
        );
        const updatedTotal = cart.total + totalDifference;
        const updatedCart: CartData = { ...cart, items: updatedItems, total: updatedTotal };

        set({
            carts: { ...carts, [activeCartId]: updatedCart },
            items: updatedItems,
            total: updatedTotal,
        });
    },

    toggleCommission: (cartId) => {
        const { carts, activeCartId } = get();
        const cart = carts[activeCartId] ?? emptyCart();
        const updatedItems = cart.items.map((i) =>
            i.cartId === cartId ? { ...i, commissionEnabled: !i.commissionEnabled } : i
        );
        const updatedCart: CartData = { ...cart, items: updatedItems };
        set({
            carts: { ...carts, [activeCartId]: updatedCart },
            items: updatedItems,
        });
    },

    clearCart: () => {
        const { carts, activeCartId } = get();
        const fresh = emptyCart();

        if (activeCartId === DEFAULT_CART_ID) {
            // Reset default cart in place (preserve the key)
            set({
                carts: { ...carts, [DEFAULT_CART_ID]: fresh },
                items: fresh.items,
                total: fresh.total,
                metadata: fresh.metadata,
                selectedCustomer: fresh.selectedCustomer,
                selectedVehicle: fresh.selectedVehicle,
                customerSelectionSource: fresh.customerSelectionSource,
                globalWorkerId: null,
                activeCategoryId: null,
            });
        } else {
            // Delete the table cart entry and switch back to default
            const remaining = { ...carts };
            delete remaining[activeCartId];
            if (!remaining[DEFAULT_CART_ID]) remaining[DEFAULT_CART_ID] = emptyCart();
            const defaultCart = remaining[DEFAULT_CART_ID];
            set({
                carts: remaining,
                activeCartId: DEFAULT_CART_ID,
                items: defaultCart.items,
                total: defaultCart.total,
                metadata: defaultCart.metadata,
                selectedCustomer: defaultCart.selectedCustomer,
                selectedVehicle: defaultCart.selectedVehicle,
                customerSelectionSource: defaultCart.customerSelectionSource,
            });
        }

        // Clear selected table in TableStore to reset visual "big" state
        useTableStore.getState().setSelectedTable(null);
    },

    clearTableCart: (tableId: string) => {
        const { carts } = get();
        const remaining = { ...carts };
        delete remaining[tableId];
        if (!remaining[DEFAULT_CART_ID]) remaining[DEFAULT_CART_ID] = emptyCart();

        // Switch back to default cart and sync proxy fields
        const defaultCart = remaining[DEFAULT_CART_ID];
        set({
            carts: remaining,
            activeCartId: DEFAULT_CART_ID,
            items: defaultCart.items,
            total: defaultCart.total,
            metadata: defaultCart.metadata,
            selectedCustomer: defaultCart.selectedCustomer,
            selectedVehicle: defaultCart.selectedVehicle,
            customerSelectionSource: defaultCart.customerSelectionSource,
        });
        useTableStore.getState().setSelectedTable(null);
    },
}));
