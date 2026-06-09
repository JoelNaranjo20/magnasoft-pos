// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';

export interface CentralCashMetadata {
    cash_sales: number;
    transfer_sales: number;
    card_sales: number;
    cash_abonos: number;
    transfer_abonos: number;
    card_abonos: number;
    cash_loan_payments: number;
    transfer_loan_payments: number;
    cash_other: number;
    transfer_other: number;
    commissions_paid: number;
}

export interface CentralMovement {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    payment_method: 'cash' | 'transfer' | 'card' | 'mixed' | null;
    session_id: string | null;
    metadata: CentralCashMetadata | null;
    created_at: string;
    user_id: string;
}

interface BackfillResult {
    success: boolean;
    processed: number;
    skipped: number;
    message: string;
}

export function useCentralCash() {
    const [movements, setMovements] = useState<CentralMovement[]>([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);
    const [isBackfilling, setIsBackfilling] = useState(false);
    const user = useSessionStore((state) => state.user);
    const businessId = useBusinessStore((state) => state.id);

    const fetchMovements = async () => {
        if (!businessId) {
            console.warn('⚠️ No business_id available, cannot fetch movements');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            console.log('📥 Fetching central cash movements for business:', businessId);

            const { data, error } = await (supabase
                .from('central_cash_movements' as any)
                .select('*')
                .order('created_at', { ascending: false }) as any);

            if (error) {
                console.error('❌ Error fetching movements:', error);
                throw error;
            }

            const movs = (data as CentralMovement[]) || [];
            console.log('✅ Fetched movements:', movs.length);
            setMovements(movs);

            const total = movs.reduce((acc, m) => {
                return m.type === 'income' ? acc + m.amount : acc - m.amount;
            }, 0);

            setBalance(total);
        } catch (error) {
            console.error('Error fetching central cash movements:', error);
        } finally {
            setLoading(false);
        }
    };

    // ─── Helper: Calcular balances por método de pago ───

    /** Balance de efectivo disponible */
    const cashBalance = useMemo(() => {
        return movements.reduce((acc, m) => {
            const isCash = m.payment_method === 'cash' || m.payment_method === null;
            const isMixed = m.payment_method === 'mixed';

            if (m.type === 'income') {
                if (isCash) return acc + m.amount;
                if (isMixed && m.metadata) {
                    const cashPart = (m.metadata.cash_sales || 0) + (m.metadata.cash_abonos || 0) + (m.metadata.cash_loan_payments || 0) + (m.metadata.cash_other || 0);
                    return acc + cashPart;
                }
            } else {
                if (isCash) return acc - m.amount;
                // Egresos mixed no deberían existir, pero por si acaso
            }
            return acc;
        }, 0);
    }, [movements]);

    /** Balance de transferencia disponible */
    const transferBalance = useMemo(() => {
        return movements.reduce((acc, m) => {
            const isTransfer = m.payment_method === 'transfer' || m.payment_method === 'card';
            const isMixed = m.payment_method === 'mixed';

            if (m.type === 'income') {
                if (isTransfer) return acc + m.amount;
                if (isMixed && m.metadata) {
                    const transferPart = (m.metadata.transfer_sales || 0) + (m.metadata.transfer_abonos || 0) + (m.metadata.transfer_loan_payments || 0) + (m.metadata.transfer_other || 0)
                                       + (m.metadata.card_sales || 0) + (m.metadata.card_abonos || 0);
                    return acc + transferPart;
                }
            } else {
                if (isTransfer) return acc - m.amount;
            }
            return acc;
        }, 0);
    }, [movements]);

    /** Balance total (efectivo + transferencia) */
    const totalBalance = useMemo(() => cashBalance + transferBalance, [cashBalance, transferBalance]);

    /** Resumen mensual: agrupa movimientos por mes con entradas/gastos/neto */
    const monthlySummary = useMemo(() => {
        const monthsMap = new Map<string, {
            month: string;
            label: string;
            incomes: number;
            expenses: number;
            net: number;
            sessionCount: number;
            manualIncomeCount: number;
            commissionsPaid: number;
            salaryExpenses: number;
            otherExpenses: number;
        }>();

        movements.forEach(m => {
            const date = new Date(m.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                              'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

            if (!monthsMap.has(key)) {
                monthsMap.set(key, { month: key, label, incomes: 0, expenses: 0, net: 0, sessionCount: 0, manualIncomeCount: 0, commissionsPaid: 0, salaryExpenses: 0, otherExpenses: 0 });
            }
            const entry = monthsMap.get(key)!;

            if (m.type === 'income') {
                entry.incomes += m.amount;
                if (m.session_id) entry.sessionCount++;
                else entry.manualIncomeCount++;
            } else {
                entry.expenses += m.amount;
                // Categorizar egresos por descripción
                const desc = (m.description || '').toLowerCase();
                if (desc.includes('comisión') || desc.includes('comision')) {
                    entry.commissionsPaid += m.amount;
                } else if (desc.includes('préstamo') || desc.includes('prestamo') || desc.includes('salario') || desc.includes('adelanto')) {
                    entry.salaryExpenses += m.amount;
                } else {
                    entry.otherExpenses += m.amount;
                }
            }

            // Sumar commissions_paid del metadata de cierres
            if (m.metadata?.commissions_paid) {
                entry.commissionsPaid += m.metadata.commissions_paid;
            }
        });

        return Array.from(monthsMap.values())
            .map(m => ({ ...m, net: m.incomes - m.expenses }))
            .sort((a, b) => b.month.localeCompare(a.month)); // Más reciente primero
    }, [movements]);

    const addMovement = async (type: 'income' | 'expense', amount: number, description: string, paymentMethod: 'cash' | 'transfer' = 'cash') => {
        try {
            const sanitizedUserId = (user?.id === 'terminal-local' || !user?.id) ? null : user.id;

            console.log('💾 Inserting movement:', { type, amount, description, payment_method: paymentMethod, user_id: sanitizedUserId });

            const { error } = await (supabase
                .from('central_cash_movements' as any)
                .insert({
                    business_id: businessId,
                    type,
                    amount,
                    description,
                    payment_method: paymentMethod,
                    user_id: sanitizedUserId
                }) as any);

            if (error) {
                console.error('❌ Insert error:', error);
                throw error;
            }

            console.log('✅ Movement inserted successfully');
            await fetchMovements();
            return { success: true };
        } catch (error) {
            console.error('Error adding central cash movement:', error);
            return { success: false, error };
        }
    };

    const deleteMovement = async (id: string) => {
        try {
            console.log('🗑️ Deleting movement:', id);
            const { error } = await supabase
                .from('central_cash_movements')
                .delete()
                .eq('id', id);

            if (error) throw error;

            console.log('✅ Movement deleted successfully');
            await fetchMovements();
            return { success: true };
        } catch (error) {
            console.error('Error deleting central cash movement:', error);
            return { success: false, error };
        }
    };

    const updateMovement = async (id: string, type: 'income' | 'expense', amount: number, description: string) => {
        try {
            console.log('✏️ Updating movement:', id, { type, amount, description });
            const { error } = await supabase
                .from('central_cash_movements')
                .update({ type, amount, description })
                .eq('id', id);

            if (error) throw error;

            console.log('✅ Movement updated successfully');
            await fetchMovements();
            return { success: true };
        } catch (error) {
            console.error('Error updating central cash movement:', error);
            return { success: false, error };
        }
    };

    /** Ejecutar backfill de sesiones históricas */
    const backfillSessions = async (): Promise<BackfillResult> => {
        if (!businessId) return { success: false, processed: 0, skipped: 0, message: 'No business_id' };
        setIsBackfilling(true);
        setBackfillResult(null);
        try {
            const { data, error } = await supabase.rpc('backfill_central_cash_sessions', {
                p_business_id: businessId
            });
            if (error) throw error;
            const result = data as BackfillResult;
            setBackfillResult(result);
            await fetchMovements(); // Refrescar movimientos después del backfill
            return result;
        } catch (error) {
            console.error('Backfill error:', error);
            const fallback = { success: false, processed: 0, skipped: 0, message: error.message || 'Error' };
            setBackfillResult(fallback);
            return fallback;
        } finally {
            setIsBackfilling(false);
        }
    };

    useEffect(() => {
        fetchMovements();
    }, [businessId]);

    return {
        movements,
        balance,
        loading,
        refresh: fetchMovements,
        addMovement,
        updateMovement,
        deleteMovement,
        // Nuevas propiedades v3
        cashBalance,
        transferBalance,
        totalBalance,
        monthlySummary,
        backfillSessions,
        backfillResult,
        isBackfilling,
    };
}
