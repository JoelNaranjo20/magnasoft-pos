import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

export type RestaurantTable = Database['public']['Tables']['restaurant_tables']['Row'];

interface TableState {
    tables: RestaurantTable[];
    isLoading: boolean;
    error: string | null;
    selectedTableId: string | null;

    // Actions
    fetchTables: (businessId: string) => Promise<void>;
    addTable: (businessId: string, name: string, capacity?: number) => Promise<void>;
    updateTableStatus: (tableId: string, status: 'available' | 'occupied' | 'reserved') => Promise<void>;
    updateTable: (tableId: string, updates: { name?: string; capacity?: number; metadata?: any }) => Promise<void>;
    removeTable: (tableId: string) => Promise<void>;
    setSelectedTable: (tableId: string | null) => void;
    subscribeToTables: (businessId: string) => () => void;
}

export const useTableStore = create<TableState>((set, get) => ({
    tables: [],
    isLoading: false,
    error: null,
    selectedTableId: null,

    fetchTables: async (businessId: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('restaurant_tables')
                .select('*')
                .eq('business_id', businessId)
                .order('name', { ascending: true });

            if (error) throw error;
            set({ tables: data || [], isLoading: false });
        } catch (err: any) {
            console.error('Error fetching tables:', err);
            set({ error: err.message || 'Failed to fetch tables', isLoading: false });
        }
    },

    addTable: async (businessId: string, name: string, capacity = 4) => {
        try {
            const { data, error } = await supabase
                .from('restaurant_tables')
                .insert([{ business_id: businessId, name, capacity, status: 'available' }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                set(state => ({ tables: [...state.tables, data].sort((a, b) => a.name.localeCompare(b.name)) }));
            }
        } catch (err: any) {
            console.error('Error adding table:', err);
            throw err;
        }
    },

    updateTableStatus: async (tableId: string, status) => {
        try {
            // Optimistic update
            set(state => ({
                tables: state.tables.map(t => t.id === tableId ? { ...t, status } : t)
            }));

            // Use the RPC to bypass possible RLS complicated select/update checks if preferred, 
            // or just a direct update since RLS policies are set covering UPDATE.
            const { error } = await supabase.rpc('update_table_status', { p_table_id: tableId, p_status: status });

            if (error) throw error;
        } catch (err: any) {
            console.error('Error updating table status:', err);
            // We could rollback optimistic update here if needed by fetching again
            throw err;
        }
    },

    updateTable: async (tableId, updates) => {
        try {
            // Optimistic update
            set(state => ({
                tables: state.tables.map(t => t.id === tableId ? { ...t, ...updates } : t)
            }));

            const { error } = await supabase
                .from('restaurant_tables')
                .update(updates)
                .eq('id', tableId);

            if (error) throw error;
        } catch (err: any) {
            console.error('Error updating table:', err);
            throw err;
        }
    },

    removeTable: async (tableId: string) => {
        try {
            const { error } = await supabase
                .from('restaurant_tables')
                .delete()
                .eq('id', tableId);

            if (error) throw error;
            set(state => ({
                tables: state.tables.filter(t => t.id !== tableId),
                selectedTableId: state.selectedTableId === tableId ? null : state.selectedTableId
            }));
        } catch (err: any) {
            console.error('Error deleting table:', err);
            throw err;
        }
    },

    setSelectedTable: (tableId) => {
        set({ selectedTableId: tableId });
    },

    subscribeToTables: (businessId: string) => {
        const channel = supabase.channel('table-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'restaurant_tables', filter: `business_id=eq.${businessId}` },
                (payload) => {
                    const state = get();
                    let newTables = [...state.tables];

                    if (payload.eventType === 'INSERT') {
                        newTables.push(payload.new as RestaurantTable);
                        newTables.sort((a, b) => a.name.localeCompare(b.name));
                    } else if (payload.eventType === 'UPDATE') {
                        newTables = newTables.map(t => t.id === payload.new.id ? payload.new as RestaurantTable : t);
                    } else if (payload.eventType === 'DELETE') {
                        newTables = newTables.filter(t => t.id !== payload.old.id);
                    }

                    set({ tables: newTables });
                }
            )
            .subscribe();

        // Return unsubscribe function
        return () => {
            supabase.removeChannel(channel);
        };
    }
}));
