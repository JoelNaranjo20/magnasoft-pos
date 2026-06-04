import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { useAuthStore, selectIsAdmin } from '@shared/store/useAuthStore';
import { normalizePhone } from '@shared/lib/normalizePhone';
import { normalizeName } from '@shared/lib/normalizeName';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface CustomerWithActivity {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    last_visit: string | null;
    created_at: string | null;
    salesCount: number;
    debtsCount: number;
    vehiclesCount: number;
    totalActivity: number;
    isMerged: boolean;
    mergedIntoId: string | null;
    mergedAt: string | null;
}

interface DuplicateGroup {
    label: string;
    type: 'phone' | 'name';
    customers: CustomerWithActivity[];
    selectedPrincipal: string | null;
}

interface MergeResult {
    success: boolean;
    message: string;
    transfers: {
        sales: number;
        debts: number;
        vehicles: number;
    };
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const PUBLICO_GENERAL = 'Público General';

// ─── Props ──────────────────────────────────────────────────────────────────

interface CustomerUnifyProps {
    isOpen: boolean;
    onClose: () => void;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export const CustomerUnify = ({ isOpen, onClose }: CustomerUnifyProps) => {
    // ─── Estado ──────────────────────────────────────────────────────────
    const [allCustomers, setAllCustomers] = useState<CustomerWithActivity[]>([]);
    const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ─── Estado de unificación (US2) ─────────────────────────────────────
    const [showMergePreview, setShowMergePreview] = useState(false);
    const [mergeSourceIds, setMergeSourceIds] = useState<string[]>([]);
    const [mergePrincipalId, setMergePrincipalId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
    const [mergeError, setMergeError] = useState<string | null>(null);

    // ─── Estado de búsqueda manual (US3) ─────────────────────────────────
    const [manualSearchQuery, setManualSearchQuery] = useState('');
    const [manualSearchResults, setManualSearchResults] = useState<CustomerWithActivity[]>([]);
    const [manualSelected, setManualSelected] = useState<Set<string>>(new Set());
    const [manualPrincipal, setManualPrincipal] = useState<string | null>(null);

    // ─── Helpers ─────────────────────────────────────────────────────────

    const getMetadata = (customer: any): Record<string, unknown> => {
        if (typeof customer.metadata === 'object' && customer.metadata !== null) {
            return customer.metadata as Record<string, unknown>;
        }
        return {};
    };

    const isPúblicoGeneral = (name: string) => name.trim().toLowerCase() === PUBLICO_GENERAL.toLowerCase();

    // ─── Carga de datos ──────────────────────────────────────────────────

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const businessId = useBusinessStore.getState().id;
            if (!businessId) {
                setError('No se pudo identificar el negocio actual.');
                setIsLoading(false);
                return;
            }

            // Obtener todos los clientes (incluyendo unificados para auditoría)
            const { data: customers, error: custError } = await supabase
                .from('customers')
                .select('*')
                .eq('business_id', businessId)
                .order('name');

            if (custError) throw custError;

            // Obtener conteos de actividad en paralelo
            const [salesRes, debtsRes, vehiclesRes] = await Promise.all([
                supabase.from('sales').select('customer_id').eq('business_id', businessId),
                supabase.from('customer_debts').select('customer_id').eq('business_id', businessId).eq('status', 'pending'),
                supabase.from('vehicles').select('customer_id').eq('business_id', businessId),
            ]);

            // Construir mapas de conteo
            const salesCount = new Map<string, number>();
            (salesRes.data || []).forEach(s => {
                if (s.customer_id) salesCount.set(s.customer_id, (salesCount.get(s.customer_id) || 0) + 1);
            });
            const debtsCount = new Map<string, number>();
            (debtsRes.data || []).forEach(d => {
                if (d.customer_id) debtsCount.set(d.customer_id, (debtsCount.get(d.customer_id) || 0) + 1);
            });
            const vehiclesCount = new Map<string, number>();
            (vehiclesRes.data || []).forEach(v => {
                if (v.customer_id) vehiclesCount.set(v.customer_id, (vehiclesCount.get(v.customer_id) || 0) + 1);
            });

            // Construir lista tipada
            const enriched: CustomerWithActivity[] = (customers || []).map((c: any) => {
                const meta = getMetadata(c);
                const sc = salesCount.get(c.id) || 0;
                const dc = debtsCount.get(c.id) || 0;
                const vc = vehiclesCount.get(c.id) || 0;
                return {
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    email: c.email,
                    last_visit: c.last_visit,
                    created_at: c.created_at,
                    salesCount: sc,
                    debtsCount: dc,
                    vehiclesCount: vc,
                    totalActivity: sc + dc + vc,
                    isMerged: !!meta.merged_into_id,
                    mergedIntoId: (meta.merged_into_id as string) || null,
                    mergedAt: (meta.merged_at as string) || null,
                };
            });

            setAllCustomers(enriched);

            // Ejecutar detección de duplicados
            detectDuplicates(enriched);
        } catch (err: any) {
            console.error('Error fetching unify data:', err);
            setError(err.message || 'Error al cargar datos de clientes');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchAllData();
            // Resetear estados de merge y búsqueda
            setShowMergePreview(false);
            setMergeResult(null);
            setMergeError(null);
            setManualSearchQuery('');
            setManualSearchResults([]);
            setManualSelected(new Set());
            setManualPrincipal(null);
        }
    }, [isOpen, fetchAllData]);

    // ─── Algoritmo de detección de duplicados ────────────────────────────

    const detectDuplicates = (customers: CustomerWithActivity[]) => {
        // Excluir "Público General" y clientes ya unificados
        const active = customers.filter(c => !isPúblicoGeneral(c.name) && !c.isMerged);

        const groups: DuplicateGroup[] = [];
        const assignedIds = new Set<string>();

        // Pasada 1: Agrupar por teléfono normalizado
        const phoneMap = new Map<string, CustomerWithActivity[]>();
        for (const c of active) {
            if (c.phone) {
                const np = normalizePhone(c.phone);
                if (np) {
                    if (!phoneMap.has(np)) phoneMap.set(np, []);
                    phoneMap.get(np)!.push(c);
                }
            }
        }

        for (const [phone, customers] of phoneMap) {
            if (customers.length >= 2) {
                // Ordenar por actividad total descendente
                customers.sort((a, b) => b.totalActivity - a.totalActivity);
                customers.forEach(c => assignedIds.add(c.id));
                groups.push({
                    label: `Coincidencia por teléfono: ${phone}`,
                    type: 'phone',
                    customers,
                    selectedPrincipal: customers[0]?.id || null, // Por defecto el más activo
                });
            }
        }

        // Pasada 2: Agrupar por nombre normalizado (solo los no asignados)
        const unassigned = active.filter(c => !assignedIds.has(c.id));
        const nameMap = new Map<string, CustomerWithActivity[]>();
        for (const c of unassigned) {
            const nn = normalizeName(c.name);
            if (nn) {
                if (!nameMap.has(nn)) nameMap.set(nn, []);
                nameMap.get(nn)!.push(c);
            }
        }

        for (const [name, customers] of nameMap) {
            if (customers.length >= 2) {
                customers.sort((a, b) => b.totalActivity - a.totalActivity);
                groups.push({
                    label: `Posible duplicado por nombre: "${customers[0]?.name || name}"`,
                    type: 'name',
                    customers,
                    selectedPrincipal: customers[0]?.id || null,
                });
            }
        }

        // Fusionar grupos solapados
        const mergedGroups = mergeOverlappingGroups(groups);

        setDuplicateGroups(mergedGroups);
    };

    const mergeOverlappingGroups = (groups: DuplicateGroup[]): DuplicateGroup[] => {
        if (groups.length <= 1) return groups;

        const result: DuplicateGroup[] = [];
        const used = new Set<number>();

        for (let i = 0; i < groups.length; i++) {
            if (used.has(i)) continue;
            const currentIds = new Set(groups[i].customers.map(c => c.id));
            const currentCustomers = [...groups[i].customers];

            // Buscar grupos solapados
            let foundOverlap = true;
            while (foundOverlap) {
                foundOverlap = false;
                for (let j = i + 1; j < groups.length; j++) {
                    if (used.has(j)) continue;
                    const otherIds = groups[j].customers.map(c => c.id);
                    if (otherIds.some(id => currentIds.has(id))) {
                        // Solapamiento: fusionar
                        for (const c of groups[j].customers) {
                            if (!currentIds.has(c.id)) {
                                currentCustomers.push(c);
                                currentIds.add(c.id);
                            }
                        }
                        used.add(j);
                        foundOverlap = true;
                    }
                }
            }

            // Ordenar fusionados por actividad
            currentCustomers.sort((a, b) => b.totalActivity - a.totalActivity);
            result.push({
                label: currentCustomers.length > 2
                    ? 'Duplicados múltiples (teléfono + nombre)'
                    : groups[i].label,
                type: currentCustomers.length > 2 ? 'name' : groups[i].type,
                customers: currentCustomers,
                selectedPrincipal: currentCustomers[0]?.id || null,
            });
            used.add(i);
        }

        return result;
    };

    // ─── Acciones de selección ───────────────────────────────────────────

    const handleSelectPrincipal = (groupId: number, customerId: string) => {
        setDuplicateGroups(prev => prev.map((g, i) =>
            i === groupId ? { ...g, selectedPrincipal: customerId } : g
        ));
    };

    const handleToggleSource = (groupId: number, customerId: string) => {
        // El principal no puede ser fuente
        const group = duplicateGroups[groupId];
        if (customerId === group?.selectedPrincipal) return;
        // toggle in source list
        setMergeSourceIds(prev =>
            prev.includes(customerId)
                ? prev.filter(id => id !== customerId)
                : [...prev, customerId]
        );
    };

    const handleSelectAllInGroup = (groupId: number) => {
        const group = duplicateGroups[groupId];
        const sourceIds = group.customers
            .filter(c => c.id !== group.selectedPrincipal)
            .map(c => c.id);
        setMergeSourceIds(prev => [...new Set([...prev, ...sourceIds])]);
    };

    const handleDeselectAllInGroup = (groupId: number) => {
        const group = duplicateGroups[groupId];
        const groupIds = new Set(group.customers.map(c => c.id));
        setMergeSourceIds(prev => prev.filter(id => !groupIds.has(id)));
    };

    const getSelectedSourcesForGroup = (groupId: number): string[] => {
        const group = duplicateGroups[groupId];
        return mergeSourceIds.filter(id =>
            group.customers.some(c => c.id === id) && id !== group.selectedPrincipal
        );
    };

    // ─── Merge Preview & Execute ─────────────────────────────────────────

    const handleOpenMergePreview = () => {
        // Seleccionar el principal del primer grupo que tenga fuentes seleccionadas
        if (!mergePrincipalId) {
            for (const group of duplicateGroups) {
                const sources = mergeSourceIds.filter(id =>
                    group.customers.some(c => c.id === id)
                );
                if (sources.length > 0 && group.selectedPrincipal) {
                    setMergePrincipalId(group.selectedPrincipal);
                    break;
                }
            }
        }

        if (!mergePrincipalId && duplicateGroups.length > 0) {
            // Si no hay principal, usar el primer cliente seleccionado como principal
            // pero el usuario debe designar uno explícitamente
            setMergeError('Selecciona cuál cliente se conservará como principal.');
            return;
        }

        setShowMergePreview(true);
        setMergeError(null);
    };

    const buildPreviewData = (): { principal: CustomerWithActivity | null; sources: CustomerWithActivity[]; transferCounts: { sales: number; debts: number; vehicles: number } } => {
        const principal = allCustomers.find(c => c.id === mergePrincipalId) || null;
        const sources = allCustomers.filter(c => mergeSourceIds.includes(c.id));
        const transferCounts = {
            sales: sources.reduce((sum, c) => sum + c.salesCount, 0),
            debts: sources.reduce((sum, c) => sum + c.debtsCount, 0),
            vehicles: sources.reduce((sum, c) => sum + c.vehiclesCount, 0),
        };
        return { principal, sources, transferCounts };
    };

    const handleExecuteMerge = async () => {
        if (!mergePrincipalId || mergeSourceIds.length === 0) return;

        setIsProcessing(true);
        setMergeError(null);
        try {
            const currentUserId = useAuthStore.getState().user?.id;
            if (!currentUserId) {
                setMergeError('No se pudo identificar al usuario actual.');
                setIsProcessing(false);
                return;
            }

            const { data, error: rpcError } = await supabase.rpc('merge_customers', {
                p_target_id: mergePrincipalId,
                p_source_ids: mergeSourceIds,
                p_performed_by: currentUserId,
            });

            if (rpcError) throw rpcError;

            const result = data as unknown as MergeResult;
            setMergeResult(result);

            // Recargar datos después del éxito
            setTimeout(async () => {
                setShowMergePreview(false);
                setMergeSourceIds([]);
                setMergePrincipalId(null);
                setMergeResult(null);
                await fetchAllData();
            }, 2000);
        } catch (err: any) {
            console.error('Merge error:', err);
            setMergeError(err.message || 'Error al unificar clientes');
        } finally {
            setIsProcessing(false);
        }
    };

    // ─── Búsqueda manual ─────────────────────────────────────────────────

    const handleManualSearch = (query: string) => {
        setManualSearchQuery(query);
        if (!query || query.length < 2) {
            setManualSearchResults([]);
            return;
        }

        const q = query.toLowerCase();
        const qDigits = q.replace(/\D/g, '');
        const results = allCustomers.filter(c => {
            if (isPúblicoGeneral(c.name)) return false;
            if (c.isMerged) return false;
            const nameMatch = normalizeName(c.name).includes(normalizeName(q));
            const phoneMatch = qDigits && normalizePhone(c.phone || '').includes(qDigits);
            return nameMatch || phoneMatch;
        });

        setManualSearchResults(results);
    };

    const handleManualSelectAll = () => {
        if (manualSearchResults.length === 0) return;
        const allIds = manualSearchResults.map(c => c.id);
        setManualSelected(prev => {
            const next = new Set(prev);
            allIds.forEach(id => next.add(id));
            return next;
        });
        if (!manualPrincipal) setManualPrincipal(manualSearchResults[0].id);
    };

    const handleManualToggle = (id: string) => {
        setManualSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleManualMerge = async () => {
        const sourceIds = Array.from(manualSelected).filter(id => id !== manualPrincipal);
        if (!manualPrincipal || sourceIds.length === 0) {
            setMergeError('Selecciona un cliente principal y al menos uno para unificar.');
            return;
        }

        setIsProcessing(true);
        setMergeError(null);
        try {
            const currentUserId = useAuthStore.getState().user?.id;
            if (!currentUserId) {
                setMergeError('No se pudo identificar al usuario actual.');
                setIsProcessing(false);
                return;
            }

            const { data, error: rpcError } = await supabase.rpc('merge_customers', {
                p_target_id: manualPrincipal,
                p_source_ids: sourceIds,
                p_performed_by: currentUserId,
            });

            if (rpcError) throw rpcError;

            const result = data as unknown as MergeResult;
            setMergeResult(result);

            setTimeout(async () => {
                setManualSelected(new Set());
                setManualPrincipal(null);
                setManualSearchQuery('');
                setManualSearchResults([]);
                setMergeResult(null);
                await fetchAllData();
            }, 2000);
        } catch (err: any) {
            setMergeError(err.message || 'Error al unificar clientes');
        } finally {
            setIsProcessing(false);
        }
    };

    // ─── Render ──────────────────────────────────────────────────────────

    if (!isOpen) return null;

    const previewData = buildPreviewData();

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Unificar Clientes</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Detecta y unifica clientes duplicados</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm font-medium text-slate-400 animate-pulse">Analizando clientes...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-400 text-sm font-bold text-center">
                            {error}
                        </div>
                    ) : (
                        <>
                            {/* ─── Búsqueda manual ───────────────────── */}
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 material-symbols-outlined text-slate-400 text-lg">search</span>
                                <input
                                    type="text"
                                    value={manualSearchQuery}
                                    onChange={(e) => handleManualSearch(e.target.value)}
                                    placeholder="Buscar cliente por nombre o teléfono..."
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-primary outline-none text-sm font-medium text-slate-900 dark:text-white"
                                />
                            </div>

                            {/* Resultados de búsqueda manual */}
                            {manualSearchResults.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                            Resultados de búsqueda ({manualSearchResults.length})
                                        </h4>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleManualSelectAll}
                                                className="text-xs font-bold text-primary hover:underline"
                                            >
                                                Seleccionar todos
                                            </button>
                                            {manualSelected.size > 1 && (
                                                <button
                                                    onClick={handleManualMerge}
                                                    disabled={isProcessing}
                                                    className="text-xs font-bold text-rose-600 hover:underline disabled:opacity-50"
                                                >
                                                    Unificar {manualSelected.size} seleccionados
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {manualSearchResults.map(c => (
                                        <div
                                            key={c.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                                manualSelected.has(c.id)
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="manualPrincipal"
                                                checked={manualPrincipal === c.id}
                                                onChange={() => setManualPrincipal(c.id)}
                                                className="accent-primary"
                                            />
                                            <input
                                                type="checkbox"
                                                checked={manualSelected.has(c.id)}
                                                onChange={() => handleManualToggle(c.id)}
                                                className="accent-primary"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</p>
                                                <p className="text-xs text-slate-500">{c.phone || 'Sin teléfono'}</p>
                                            </div>
                                            <div className="flex gap-2 text-xs font-semibold text-slate-400">
                                                <span title="Ventas">{c.salesCount} ventas</span>
                                                <span title="Deudas">{c.debtsCount} deudas</span>
                                                <span title="Vehículos">{c.vehiclesCount} vehíc.</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Separador */}
                            {manualSearchResults.length > 0 && duplicateGroups.length > 0 && (
                                <div className="border-t border-slate-200 dark:border-slate-700" />
                            )}

                            {/* ─── Grupos de duplicados ───────────────── */}
                            {duplicateGroups.length === 0 && !manualSearchQuery && (
                                <div className="text-center py-12">
                                    <span className="material-symbols-outlined text-5xl text-emerald-400 mb-4">check_circle</span>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">¡No se encontraron duplicados!</p>
                                    <p className="text-sm text-slate-500 mt-1">Todos los clientes están correctamente registrados.</p>
                                </div>
                            )}

                            {duplicateGroups.map((group, groupIdx) => (
                                <div key={groupIdx} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    {/* Group Header */}
                                    <div className="flex items-center justify-between p-4 bg-amber-50/50 dark:bg-amber-900/10 border-b border-slate-200 dark:border-slate-700">
                                        <div>
                                            <p className="text-sm font-black text-amber-800 dark:text-amber-200">
                                                {group.label}
                                            </p>
                                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                                {group.customers.length} clientes · {group.type === 'phone' ? 'Mismo teléfono' : 'Nombre similar'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSelectAllInGroup(groupIdx)}
                                                className="text-xs font-bold text-primary hover:underline"
                                            >
                                                Seleccionar todos
                                            </button>
                                            <button
                                                onClick={() => handleDeselectAllInGroup(groupIdx)}
                                                className="text-xs font-bold text-slate-400 hover:underline"
                                            >
                                                Deseleccionar
                                            </button>
                                        </div>
                                    </div>

                                    {/* Customer Cards */}
                                    <div className="p-4 space-y-2">
                                        {group.customers.map(c => {
                                            const isPrincipal = group.selectedPrincipal === c.id;
                                            const isSource = mergeSourceIds.includes(c.id) && !isPrincipal;
                                            return (
                                                <div
                                                    key={c.id}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                                        isPrincipal
                                                            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                                                            : isSource
                                                                ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/5'
                                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                                    }`}
                                                >
                                                    {/* Radio — Principal */}
                                                    <input
                                                        type="radio"
                                                        name={`principal-${groupIdx}`}
                                                        checked={isPrincipal}
                                                        onChange={() => handleSelectPrincipal(groupIdx, c.id)}
                                                        className="accent-emerald-600"
                                                        title="Cliente principal (se conservará)"
                                                    />

                                                    {/* Checkbox — Fuente (unificar) */}
                                                    <input
                                                        type="checkbox"
                                                        checked={isSource}
                                                        onChange={() => handleToggleSource(groupIdx, c.id)}
                                                        disabled={isPrincipal}
                                                        className="accent-primary disabled:opacity-30"
                                                        title={isPrincipal ? 'El principal no puede ser fuente' : 'Seleccionar para unificar dentro del principal'}
                                                    />

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                            {c.name}
                                                            {c.isMerged && (
                                                                <span className="ml-2 text-[10px] font-normal text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded">
                                                                    Unificado
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-500 truncate">
                                                            {c.phone || 'Sin teléfono'}
                                                            {c.email ? ` · ${c.email}` : ''}
                                                        </p>
                                                    </div>

                                                    {/* Activity Counts */}
                                                    <div className="flex gap-2 text-xs font-semibold text-slate-400 flex-shrink-0">
                                                        {c.salesCount > 0 && <span title="Ventas">{c.salesCount} v.</span>}
                                                        {c.debtsCount > 0 && <span title="Deudas pendientes">{c.debtsCount} d.</span>}
                                                        {c.vehiclesCount > 0 && <span title="Vehículos">{c.vehiclesCount} veh.</span>}
                                                    </div>

                                                    {/* Labels */}
                                                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                                                        {isPrincipal && (
                                                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                                                Principal
                                                            </span>
                                                        )}
                                                        {isSource && (
                                                            <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                                                Unificar
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* ─── Barra de acción de merge ──────────── */}
                            {mergeSourceIds.length > 0 && (
                                <div className="sticky bottom-0 p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 rounded-b-2xl -mx-6 -mb-6 shadow-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                {mergeSourceIds.length} cliente{mergeSourceIds.length > 1 ? 's' : ''} seleccionado{mergeSourceIds.length > 1 ? 's' : ''} para unificar
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleOpenMergePreview}
                                            disabled={mergeSourceIds.length === 0}
                                            className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all"
                                        >
                                            Unificar seleccionados
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Error merge */}
                    {mergeError && (
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-400 text-sm font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {mergeError}
                        </div>
                    )}
                </div>

                {/* ─── Modal de vista previa de merge ──────────────── */}
                {showMergePreview && (
                    <div className="absolute inset-0 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Confirmar Unificación</h3>
                            <button
                                onClick={() => setShowMergePreview(false)}
                                disabled={isProcessing}
                                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                    Revisa cuidadosamente antes de confirmar. Esta acción <strong>no se puede deshacer</strong>.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Se conservará</p>
                                    <p className="text-base font-black text-slate-900 dark:text-white mt-1">{previewData.principal?.name || 'Desconocido'}</p>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">Se unificarán</p>
                                    {previewData.sources.map(c => (
                                        <div key={c.id} className="flex items-center justify-between p-3 bg-rose-50/50 dark:bg-rose-900/5 rounded-xl border border-rose-100 dark:border-rose-800/50">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</p>
                                                <p className="text-xs text-slate-500">{c.phone || 'Sin teléfono'}</p>
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {c.salesCount} ventas · {c.debtsCount} deudas · {c.vehiclesCount} vehíc.
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                                        <p className="text-2xl font-black text-primary">{previewData.transferCounts.sales}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Ventas transferidas</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                                        <p className="text-2xl font-black text-primary">{previewData.transferCounts.debts}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Deudas transferidas</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                                        <p className="text-2xl font-black text-primary">{previewData.transferCounts.vehicles}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Vehículos transferidos</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <button
                                onClick={() => setShowMergePreview(false)}
                                disabled={isProcessing}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleExecuteMerge}
                                disabled={isProcessing}
                                className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Unificando...</span>
                                    </>
                                ) : (
                                    'Confirmar unificación'
                                )}
                            </button>
                        </div>

                        {/* Merge Error */}
                        {mergeError && (
                            <div className="px-6 pb-4">
                                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined">error</span>
                                    {mergeError}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Overlay de éxito ─────────────────────────────── */}
                {mergeResult && mergeResult.success && (
                    <div className="absolute inset-0 z-20 bg-emerald-500 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300">
                        <span className="material-symbols-outlined text-6xl mb-4">check_circle</span>
                        <p className="text-xl font-black">¡Unificación Exitosa!</p>
                        <p className="text-sm font-medium opacity-90 mt-2">{mergeResult.message}</p>
                        <div className="flex gap-4 mt-6 text-sm">
                            <span>{mergeResult.transfers.sales} ventas</span>
                            <span>{mergeResult.transfers.debts} deudas</span>
                            <span>{mergeResult.transfers.vehicles} vehículos</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
