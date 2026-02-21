'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export interface Sale {
    id: string;
    created_at: string;
    total_amount: number;
    payment_method: string;
    customer_id: string | null;
    session_id: string | null;
    customer_name?: string;
    vehicle_info?: string | null;
    items?: SaleItem[];
}

export interface SaleItem {
    id: string;
    sale_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    service_type: string | null;
    worker_name?: string | null;
    catalog_price?: number;
}

export function useSales(filters?: { dateRange?: { start: Date, end: Date }, sessionId?: string }) {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const [breakdown, setBreakdown] = useState({
        cashSales: 0,
        digitalSales: 0,
        creditSales: 0,
        cashAbonos: 0,
        digitalAbonos: 0,
        expenses: 0,
        totalRevenue: 0
    });

    const fetchSales = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('sales')
                .select(`
                    *,
                    customers (name),
                    vehicles (license_plate, brand, model, type),
                    items:sale_items (
                        *,
                        worker:workers(name),
                        products(price),
                        services(price)
                    )
                `)
                .order('created_at', { ascending: false });

            let startStr = filters?.dateRange?.start.toISOString();
            let endStr = filters?.dateRange?.end.toISOString();

            if (startStr && endStr) {
                query = query.gte('created_at', startStr).lte('created_at', endStr);
            }

            if (filters?.sessionId) {
                query = query.eq('session_id', filters?.sessionId);
            }

            const { data, error: salesError } = await query;
            if (salesError) throw salesError;

            const salesData = (data as any[]) || [];

            // 1. Process Sales for breakdown
            let cashSales = 0;
            let digitalSales = 0;
            let creditSales = 0;
            let totalRevenue = 0;

            const processedSales = salesData.map(sale => {
                const total = sale.total_amount || 0;
                totalRevenue += total;

                if (sale.payment_method === 'cash') cashSales += total;
                else if (sale.payment_method === 'credit') creditSales += total;
                else digitalSales += total;

                return {
                    ...sale,
                    customer_name: sale.customers?.name || 'Cliente General',
                    vehicle_info: sale.vehicles ? `${sale.vehicles.license_plate} (${sale.vehicles.brand || ''} ${sale.vehicles.model || ''})` : null,
                    items: sale.items?.map((item: any) => ({
                        ...item,
                        worker_name: item.worker?.name,
                        catalog_price: item.products?.price || item.services?.price || item.unit_price
                    }))
                };
            });

            // 2. Fetch Movements for Abonos and Expenses
            let movementsQuery = supabase.from('cash_movements').select('*');
            if (startStr && endStr) {
                movementsQuery = movementsQuery.gte('created_at', startStr).lte('created_at', endStr);
            }
            if (filters?.sessionId) {
                movementsQuery = movementsQuery.eq('session_id', filters.sessionId);
            }

            const { data: movementsData } = await movementsQuery;
            const movements = (movementsData as any[]) || [];

            let expenses = 0;
            let cashAbonos = 0;
            let digitalAbonos = 0;

            movements.forEach(m => {
                if (m.type === 'expense') {
                    expenses += m.amount || 0;
                } else {
                    const desc = (m.description || '').toLowerCase();
                    if (desc.includes('transferencia') || desc.includes('tarjeta')) {
                        digitalAbonos += m.amount || 0;
                    } else {
                        cashAbonos += m.amount || 0;
                    }
                }
            });

            setSales(processedSales);
            setBreakdown({
                cashSales,
                digitalSales,
                creditSales,
                cashAbonos,
                digitalAbonos,
                expenses,
                totalRevenue
            });
        } catch (err: any) {
            console.error('Error fetching sales detailed:', JSON.stringify(err, null, 2));
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, [filters?.sessionId, filters?.dateRange?.start?.toISOString(), filters?.dateRange?.end?.toISOString()]);

    return {
        sales,
        loading,
        error,
        breakdown,
        refresh: fetchSales
    };
}
