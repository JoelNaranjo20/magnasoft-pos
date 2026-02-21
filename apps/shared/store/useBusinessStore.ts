import { create } from 'zustand';
import { supabase } from '@shared/lib/supabase';
import { getPresetModules } from '../modules';

interface BusinessConfig {
    module_vehicles: boolean;
    module_tables: boolean;
    module_service_queue: boolean;
    module_commissions: boolean;
    module_commission_payment: boolean;
    module_customers: boolean;
    module_inventory: boolean;
    module_payroll: boolean;
    [key: string]: boolean; // Allow additional dynamic flags
}

const DEFAULT_CONFIG: BusinessConfig = {
    module_vehicles: false,
    module_tables: false,
    module_service_queue: false,
    module_commissions: false,
    module_commission_payment: false,
    module_customers: true,
    module_inventory: true,
    module_payroll: false,
};

interface BusinessStore {
    id: string | null;
    name: string;
    businessType: string;
    logoUrl: string | null;
    protectedModules: string[];
    config: BusinessConfig;
    _realtimeChannel: any | null;
    isModuleEnabled: (moduleKey: string) => boolean;
    fetchBusinessProfile: () => Promise<void>;
    subscribeToChanges: () => void;
    unsubscribeFromChanges: () => void;
}

const isBrowser = typeof window !== 'undefined';

export const useBusinessStore = create<BusinessStore>((set, get) => ({
    id: isBrowser ? localStorage.getItem('sv_business_id') : null,
    name: (isBrowser ? localStorage.getItem('sv_business_name') : null) || 'Cargando...',
    businessType: (isBrowser ? localStorage.getItem('sv_business_type') : null) || 'general',
    logoUrl: null,
    protectedModules: ['audit', 'config'],
    config: DEFAULT_CONFIG,
    _realtimeChannel: null,
    isModuleEnabled: (moduleKey: string) => {
        const config = get().config;
        return config[moduleKey] ?? false;
    },
    subscribeToChanges: () => {
        const currentId = get().id;
        if (!currentId) return;

        // Clean up any existing subscription
        get().unsubscribeFromChanges();

        const channel = supabase
            .channel(`business-config-${currentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'business',
                    filter: `id=eq.${currentId}`
                },
                (payload: any) => {
                    console.log('[Realtime] Business updated:', payload.new?.business_type);
                    // Re-fetch the full profile to get all related data
                    get().fetchBusinessProfile();
                }
            )
            .subscribe();

        set({ _realtimeChannel: channel });
    },
    unsubscribeFromChanges: () => {
        const channel = get()._realtimeChannel;
        if (channel) {
            supabase.removeChannel(channel);
            set({ _realtimeChannel: null });
        }
    },
    fetchBusinessProfile: async () => {
        try {
            const currentId = useBusinessStore.getState().id;
            if (!currentId) return;

            const { data: businessData } = await (supabase as any)
                .from('business')
                .select('id, name, logo_url, business_type, config, service:services(price)')
                .eq('id', currentId)
                .maybeSingle();

            if (businessData) {
                const presetModules = getPresetModules(businessData.business_type || 'general');
                const mergedConfig = { ...DEFAULT_CONFIG, ...presetModules, ...(businessData.config || {}) };
                set({
                    id: businessData.id,
                    name: businessData.name || 'Cargando...',
                    businessType: businessData.business_type || 'general',
                    logoUrl: businessData.logo_url,
                    config: mergedConfig,
                });
                if (isBrowser) {
                    if (businessData.id) localStorage.setItem('sv_business_id', businessData.id);
                    if (businessData.name) localStorage.setItem('sv_business_name', businessData.name);
                    if (businessData.business_type) localStorage.setItem('sv_business_type', businessData.business_type);
                }
            }

            // 2. Fetch Security Settings
            const { data: securityData } = await (supabase as any)
                .from('business_settings')
                .select('value')
                .eq('business_id', currentId)
                .eq('setting_type', 'security')
                .maybeSingle();

            if (securityData?.value?.protected_modules) {
                set({ protectedModules: securityData.value.protected_modules });
            }

            // 3. Subscribe to realtime changes (only if not already subscribed)
            if (!get()._realtimeChannel) {
                get().subscribeToChanges();
            }
        } catch (error) {
            console.error('Error fetching business settings:', error);
        }
    }
}));
