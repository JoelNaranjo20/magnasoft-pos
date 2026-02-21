// @ts-nocheck
import { create } from 'zustand';
import type { Database } from '../types/supabase';
import type { SaleMetadata } from '../types/pos';

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

interface CartState {
    items: CartItem[];
    total: number;

    // NEW: For barbershop mode (global stylist/professional)
    globalWorkerId?: string | null;
    setGlobalWorker: (workerId: string | null) => void;

    // NEW: Metadata for polymorphic sales
    metadata?: Partial<SaleMetadata>;
    setMetadata: (data: Partial<SaleMetadata>) => void;

    selectedCustomer: any | null;
    selectedVehicle: any | null;
    customerSelectionSource: 'quick_search' | 'modal' | null;
    setCustomer: (customer: any | null, vehicle: any | null, source?: 'quick_search' | 'modal') => void;

    // Category filtering for POS
    activeCategoryId: string | null;
    setActiveCategoryId: (categoryId: string | null) => void;

    // Existing methods
    addItem: (item: Product | Service, type: 'product' | 'service', customPrice?: number, workerId?: string) => void;
    removeItem: (cartId: string) => void;
    updateQuantity: (cartId: string, delta: number) => void;
    updatePrice: (cartId: string, newPrice: number) => void;
    toggleCommission: (cartId: string) => void;
    clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    total: 0,
    globalWorkerId: null,
    metadata: {},
    selectedCustomer: null,
    selectedVehicle: null,
    customerSelectionSource: null,
    activeCategoryId: null,

    setGlobalWorker: (workerId) => set({ globalWorkerId: workerId }),
    setMetadata: (data) => set({ metadata: { ...get().metadata, ...data } }),
    setActiveCategoryId: (categoryId) => set({ activeCategoryId: categoryId }),
    addItem: (item, type, customPrice, workerId) => {
        const { items } = get();
        // Check for existing item with same ID AND same price
        const finalPrice = customPrice !== undefined ? customPrice : item.price;
        const existingItem = items.find((i) => i.id === item.id && i.price === finalPrice);

        if (existingItem) {
            set({
                items: items.map((i) =>
                    i.cartId === existingItem.cartId ? {
                        ...i,
                        quantity: i.quantity + 1,
                        workerId: workerId || i.workerId,
                        type: i.type || type, // Preserve type or set it if missing
                        originalItem: i.originalItem || item, // Preserve originalItem
                        commissionEnabled: i.commissionEnabled !== undefined ? i.commissionEnabled : (type === 'service')
                    } : i
                ),
                total: get().total + finalPrice,
            });
        } else {
            set({
                items: [
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
                        commissionEnabled: type === 'service' // Default to true for services, false for products
                    },
                ],
                total: get().total + finalPrice,
            });
        }
    },
    removeItem: (cartId) => {
        const { items } = get();
        const itemToRemove = items.find((i) => i.cartId === cartId);
        if (!itemToRemove) return;

        set({
            items: items.filter((i) => i.cartId !== cartId),
            total: get().total - (itemToRemove.price * itemToRemove.quantity),
        });
    },
    updateQuantity: (cartId, delta) => {
        const { items } = get();
        const item = items.find((i) => i.cartId === cartId);
        if (!item) return;

        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) {
            get().removeItem(cartId);
            return;
        }

        set({
            items: items.map((i) =>
                i.cartId === cartId ? { ...i, quantity: newQuantity } : i
            ),
            total: get().total + (item.price * delta),
        });
    },
    updatePrice: (cartId, newPrice) => {
        const { items } = get();
        const item = items.find((i) => i.cartId === cartId);
        if (!item) return;

        const priceDifference = newPrice - item.price;
        const totalDifference = priceDifference * item.quantity;

        set({
            items: items.map((i) =>
                i.cartId === cartId ? { ...i, price: newPrice } : i
            ),
            total: get().total + totalDifference,
        });
    },
    toggleCommission: (cartId) => {
        const { items } = get();
        set({
            items: items.map((i) =>
                i.cartId === cartId ? { ...i, commissionEnabled: !i.commissionEnabled } : i
            ),
        });
    },
    setCustomer: (customer, vehicle, source = 'modal') => set({
        selectedCustomer: customer,
        selectedVehicle: vehicle,
        customerSelectionSource: source
    }),
    clearCart: () => set({
        items: [],
        total: 0,
        globalWorkerId: null,
        metadata: {},
        selectedCustomer: null,
        selectedVehicle: null,
        customerSelectionSource: null,
        activeCategoryId: null
    }),
}));
