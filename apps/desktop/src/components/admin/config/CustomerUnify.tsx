import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { normalizePhone } from '@shared/lib/normalizePhone';
import { normalizeName } from '@shared/lib/normalizeName';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface CustomerWithDetails {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    last_visit: string | null;
    created_at: string | null;
    salesCount: number;
    debtsCount: number;
    vehiclesCount: number;
    totalDebtAmount: number;
    loyaltyPoints: number;
    totalVisits: number;
}

interface DuplicateGroup {
    label: string;
    type: 'phone' | 'name';
    customers: CustomerWithDetails[];
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

interface PreviewData {
    principal: CustomerWithDetails | null;
    secondaries: CustomerWithDetails[];
    totals: {
        sales: number;
        debts: number;
        debtAmount: number;
        vehicles: number;
        points: number;
        visits: number;
    };
}

const PUBLICO_GENERAL = 'Público General';

interface CustomerUnifyProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CustomerUnify = ({ isOpen, onClose }: CustomerUnifyProps) => {
    const [allCustomers, setAllCustomers] = useState<CustomerWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CustomerWithDetails[]>([]);
    const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null);
    const [selectedSecondaries, setSelectedSecondaries] = useState<Set<string>>(new Set());

    const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
    const [autoDetectExpanded, setAutoDetectExpanded] = useState(false);

    const [showPreview, setShowPreview] = useState(false);
    const [previewSource, setPreviewSource] = useState<'search' | 'auto' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
    const [mergeError, setMergeError] = useState<string | null>(null);

    const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    const isPúblicoGeneral = (name: string) => name.trim().toLowerCase() === PUBLICO_GENERAL.toLowerCase();
    const fmt = (n: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n);

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

            const { data: customers, error: custError } = await supabase
                .from('customers')
                .select('*')
                .eq('business_id', businessId)
                .order('name');

            if (custError) throw custError;

            const [salesRes, debtsRes, vehiclesRes] = await Promise.all([
                supabase.from('sales').select('customer_id').eq('business_id', businessId),
                supabase.from('customer_debts').select('customer_id, remaining_amount').eq('business_id', businessId).eq('status', 'pending'),
                supabase.from('vehicles').select('customer_id').eq('business_id', businessId),
            ]);

            const salesCount = new Map<string, number>();
            salesRes.data?.forEach(s => { if (s.customer_id) salesCount.set(s.customer_id, (salesCount.get(s.customer_id) || 0) + 1); });

            const debtsCount = new Map<string, number>();
            const debtsAmount = new Map<string, number>();
            debtsRes.data?.forEach(d => {
                if (d.customer_id) {
                    debtsCount.set(d.customer_id, (debtsCount.get(d.customer_id) || 0) + 1);
                    debtsAmount.set(d.customer_id, (debtsAmount.get(d.customer_id) || 0) + (Number(d.remaining_amount) || 0));
                }
            });

            const vehiclesCount = new Map<string, number>();
            vehiclesRes.data?.forEach(v => { if (v.customer_id) vehiclesCount.set(v.customer_id, (vehiclesCount.get(v.customer_id) || 0) + 1); });

            const enriched: CustomerWithDetails[] = (customers || []).map(c => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                email: c.email,
                last_visit: c.last_visit,
                created_at: c.created_at,
                salesCount: salesCount.get(c.id) || 0,
                debtsCount: debtsCount.get(c.id) || 0,
                vehiclesCount: vehiclesCount.get(c.id) || 0,
                totalDebtAmount: debtsAmount.get(c.id) || 0,
                loyaltyPoints: c.loyalty_points || 0,
                totalVisits: c.total_visits || 0,
            }));

            setAllCustomers(enriched);
            detectDuplicates(enriched);
        } catch (err: unknown) {
            console.error('Error fetching unify data:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar datos de clientes');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) { fetchAllData(); resetState(); }
    }, [isOpen, fetchAllData]);

    const resetState = () => {
        setSearchQuery(''); setSearchResults([]); setSelectedPrimary(null);
        setSelectedSecondaries(new Set()); setShowPreview(false); setPreviewSource(null);
        setMergeResult(null); setMergeError(null); setAutoDetectExpanded(false); setEditingCustomerId(null);
    };

    const detectDuplicates = (customers: CustomerWithDetails[]) => {
        const active = customers.filter(c => !isPúblicoGeneral(c.name));
        const groups: DuplicateGroup[] = [];
        const assignedIds = new Set<string>();

        const phoneMap = new Map<string, CustomerWithDetails[]>();
        for (const c of active) {
            if (c.phone) {
                const np = normalizePhone(c.phone);
                if (np) { if (!phoneMap.has(np)) phoneMap.set(np, []); phoneMap.get(np)!.push(c); }
            }
        }
        for (const [, custs] of phoneMap) {
            if (custs.length >= 2) {
                custs.sort((a, b) => b.totalDebtAmount + b.salesCount - (a.totalDebtAmount + a.salesCount));
                custs.forEach(c => assignedIds.add(c.id));
                groups.push({ label: `Mismo teléfono: ${normalizePhone(custs[0]?.phone || '')}`, type: 'phone', customers: custs, selectedPrincipal: custs[0]?.id || null });
            }
        }

        const unassigned = active.filter(c => !assignedIds.has(c.id));
        const nameMap = new Map<string, CustomerWithDetails[]>();
        for (const c of unassigned) {
            const nn = normalizeName(c.name);
            if (nn) { if (!nameMap.has(nn)) nameMap.set(nn, []); nameMap.get(nn)!.push(c); }
        }
        for (const [, custs] of nameMap) {
            if (custs.length >= 2) {
                custs.sort((a, b) => b.totalDebtAmount + b.salesCount - (a.totalDebtAmount + a.salesCount));
                groups.push({ label: `Nombre similar: "${custs[0]?.name || ''}"`, type: 'name', customers: custs, selectedPrincipal: custs[0]?.id || null });
            }
        }
        setDuplicateGroups(mergeOverlappingGroups(groups));
    };

    const mergeOverlappingGroups = (groups: DuplicateGroup[]): DuplicateGroup[] => {
        if (groups.length <= 1) return groups;
        const result: DuplicateGroup[] = [];
        const used = new Set<number>();
        for (let i = 0; i < groups.length; i++) {
            if (used.has(i)) continue;
            const currentIds = new Set(groups[i].customers.map(c => c.id));
            const currentCustomers = [...groups[i].customers];
            let foundOverlap = true;
            while (foundOverlap) {
                foundOverlap = false;
                for (let j = i + 1; j < groups.length; j++) {
                    if (used.has(j)) continue;
                    if (groups[j].customers.some(c => currentIds.has(c.id))) {
                        for (const c of groups[j].customers) { if (!currentIds.has(c.id)) { currentCustomers.push(c); currentIds.add(c.id); } }
                        used.add(j); foundOverlap = true;
                    }
                }
            }
            currentCustomers.sort((a, b) => (b.totalDebtAmount + b.salesCount) - (a.totalDebtAmount + a.salesCount));
            result.push({ label: currentCustomers.length > 2 ? 'Duplicados múltiples' : groups[i].label, type: currentCustomers.length > 2 ? 'name' : groups[i].type, customers: currentCustomers, selectedPrincipal: currentCustomers[0]?.id || null });
            used.add(i);
        }
        return result;
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query || query.length < 2) { setSearchResults([]); return; }
        const q = query.toLowerCase();
        const qDigits = q.replace(/\D/g, '');
        const results = allCustomers.filter(c => {
            if (isPúblicoGeneral(c.name)) return false;
            return normalizeName(c.name).includes(normalizeName(q)) || (qDigits.length > 0 && normalizePhone(c.phone || '').includes(qDigits));
        });
        setSearchResults(results);
        if (results.length > 0 && !results.some(c => c.id === selectedPrimary)) {
            setSelectedPrimary(results.reduce((a, b) => (a.totalDebtAmount + a.salesCount) > (b.totalDebtAmount + b.salesCount) ? a : b).id);
        }
    };

    const handleToggleSecondary = (id: string) => {
        if (id === selectedPrimary) return;
        setSelectedSecondaries(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    };

    const computePreview = (_source: 'search' | 'auto'): PreviewData => {
        const principal = allCustomers.find(c => c.id === selectedPrimary) || null;
        const secondaries = allCustomers.filter(c => selectedSecondaries.has(c.id) && c.id !== selectedPrimary);
        return buildPreview(principal, secondaries);
    };

    const buildPreview = (principal: CustomerWithDetails | null, secondaries: CustomerWithDetails[]): PreviewData => ({
        principal, secondaries,
        totals: {
            sales: secondaries.reduce((s, c) => s + c.salesCount, 0),
            debts: secondaries.reduce((s, c) => s + c.debtsCount, 0),
            debtAmount: secondaries.reduce((s, c) => s + c.totalDebtAmount, 0),
            vehicles: secondaries.reduce((s, c) => s + c.vehiclesCount, 0),
            points: secondaries.reduce((s, c) => s + c.loyaltyPoints, 0),
            visits: secondaries.reduce((s, c) => s + c.totalVisits, 0),
        },
    });

    const startEditing = (customer: CustomerWithDetails) => {
        setEditingCustomerId(customer.id); setEditName(customer.name); setEditPhone(customer.phone || ''); setEditEmail(customer.email || '');
    };

    const saveEditing = async (customerId: string) => {
        setEditSaving(true);
        try {
            const { error: updateErr } = await supabase.from('customers')
                .update({ name: editName.trim(), phone: editPhone.trim() || null, email: editEmail.trim() || null })
                .eq('id', customerId);
            if (updateErr) throw updateErr;
            setAllCustomers(prev => prev.map(c => c.id === customerId ? { ...c, name: editName.trim(), phone: editPhone.trim() || null, email: editEmail.trim() || null } : c));
            setSearchResults(prev => prev.map(c => c.id === customerId ? { ...c, name: editName.trim(), phone: editPhone.trim() || null, email: editEmail.trim() || null } : c));
            setEditingCustomerId(null);
        } catch (err: unknown) { console.error('Error updating customer:', err); }
        finally { setEditSaving(false); }
    };

    const handleOpenPreview = (source: 'search' | 'auto') => {
        const secondaries = searchResults.filter(c => selectedSecondaries.has(c.id) && c.id !== selectedPrimary);
        if (!selectedPrimary || secondaries.length === 0) { setMergeError('Selecciona un cliente principal y al menos uno secundario.'); return; }
        setPreviewSource(source); setMergeError(null); setShowPreview(true);
    };

    const handleExecuteMerge = async (preview: PreviewData) => {
        if (!preview.principal || preview.secondaries.length === 0) return;
        setIsProcessing(true); setMergeError(null);
        try {
            const sourceIds = preview.secondaries.map(c => c.id);
            const { data, error: rpcError } = await supabase.rpc('merge_customers', {
                p_target_id: preview.principal.id,
                p_source_ids: sourceIds,
            });

            if (rpcError) throw rpcError;

            const result = data as MergeResult;

            if (!result.success) {
                setMergeError(result.message);
                return;
            }

            setMergeResult(result);
            await new Promise(resolve => setTimeout(resolve, 2500));
            setShowPreview(false); setMergeResult(null);
            setSearchQuery(''); setSearchResults([]);
            setSelectedPrimary(null); setSelectedSecondaries(new Set());
            await fetchAllData();
        } catch (err: unknown) {
            console.error('Merge error:', err);
            if (err && typeof err === 'object' && 'message' in err) {
                setMergeError((err as { message: string }).message);
            } else {
                setMergeError('Error al unificar clientes');
            }
        } finally { setIsProcessing(false); }
    };

    const handleDupSelectPrincipal = (groupIdx: number, customerId: string) => {
        setDuplicateGroups(prev => prev.map((g, i) => i === groupIdx ? { ...g, selectedPrincipal: customerId } : g));
    };

    if (!isOpen) return null;

    const preview = showPreview && previewSource ? computePreview(previewSource) : null;
    const searchSecondaries = searchResults.filter(c => selectedSecondaries.has(c.id) && c.id !== selectedPrimary);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-2xl text-amber-500">merge_type</span>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Unificar Clientes</h3>
                            <p className="text-xs text-slate-400">Elimina duplicados y consolida todo en un solo cliente</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-8 h-8 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-slate-400">Analizando clientes...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-400 text-sm font-bold text-center">{error}</div>
                    ) : (
                        <>
                            {/* ─── BUSCADOR ──────────────────────────── */}
                            <div className="relative">
                                <span className="absolute left-3.5 top-3 material-symbols-outlined text-slate-400 text-lg">search</span>
                                <input
                                    type="text" value={searchQuery}
                                    onChange={e => handleSearch(e.target.value)}
                                    placeholder="Escribe nombre o teléfono del cliente..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-amber-400 outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                                />
                            </div>

                            {/* Resultados */}
                            {searchResults.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500 uppercase">{searchResults.length} encontrados</span>
                                        <div className="flex gap-3">
                                            <button onClick={() => {
                                                setSelectedSecondaries(new Set(searchResults.map(c => c.id).filter(id => id !== selectedPrimary)));
                                                if (!selectedPrimary && searchResults.length > 0) setSelectedPrimary(searchResults[0].id);
                                            }} className="text-xs font-bold text-amber-600 hover:text-amber-700">Todos secundarios</button>
                                            {searchSecondaries.length > 0 && (
                                                <button onClick={() => handleOpenPreview('search')} className="text-xs font-bold text-rose-600 hover:text-rose-700">
                                                    Vista previa ({searchSecondaries.length})
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {searchResults.map(c => {
                                        const isPrincipal = selectedPrimary === c.id;
                                        const isSecondary = selectedSecondaries.has(c.id);
                                        return (
                                            <div key={c.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors ${
                                                isPrincipal ? 'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-900/15' :
                                                isSecondary ? 'border-rose-300 bg-rose-50/50 dark:bg-rose-900/10' :
                                                'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                                                <input type="radio" name="sp" checked={isPrincipal}
                                                    onChange={() => { setSelectedPrimary(c.id); setSelectedSecondaries(prev => { const n = new Set(prev); n.delete(c.id); return n; }); }}
                                                    className="accent-emerald-600 w-3.5 h-3.5" />
                                                <input type="checkbox" checked={isSecondary} disabled={isPrincipal}
                                                    onChange={() => handleToggleSecondary(c.id)}
                                                    className="accent-rose-500 w-3.5 h-3.5 disabled:opacity-20" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                                                    <p className="text-xs text-slate-400 truncate">{c.phone || 'Sin teléfono'}{c.email ? ` · ${c.email}` : ''}</p>
                                                </div>
                                                <div className="flex gap-1.5 text-[10px] font-semibold text-slate-400 flex-shrink-0">
                                                    {c.salesCount > 0 && <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{c.salesCount}v</span>}
                                                    {c.debtsCount > 0 && <span className="bg-rose-50 dark:bg-rose-900/20 text-rose-500 px-1.5 py-0.5 rounded">{fmt(c.totalDebtAmount)}</span>}
                                                    {c.loyaltyPoints > 0 && <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 px-1.5 py-0.5 rounded">{c.loyaltyPoints}pts</span>}
                                                </div>
                                                {isPrincipal && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full flex-shrink-0">PRINCIPAL</span>}
                                                {isSecondary && <span className="text-[9px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-900/30 px-1.5 py-0.5 rounded-full flex-shrink-0">ELIMINAR</span>}
                                            </div>
                                        );
                                    })}

                                    {searchSecondaries.length > 0 && (
                                        <div className="sticky bottom-0 -mx-5 -mb-5 px-5 py-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">{searchSecondaries.length} para eliminar</p>
                                                <p className="text-xs text-slate-400">Principal: {allCustomers.find(c => c.id === selectedPrimary)?.name || '—'}</p>
                                            </div>
                                            <button onClick={() => handleOpenPreview('search')}
                                                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 active:scale-[0.98] transition-all">
                                                Revisar unificación
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {searchQuery && searchResults.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sin resultados.</p>}

                            {/* ─── DETECCIÓN AUTOMÁTICA ──────────────── */}
                            {duplicateGroups.length > 0 && (
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                                    <button onClick={() => setAutoDetectExpanded(!autoDetectExpanded)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700">
                                        <span className="material-symbols-outlined text-base">{autoDetectExpanded ? 'expand_less' : 'expand_more'}</span>
                                        {duplicateGroups.length} grupo{duplicateGroups.length > 1 ? 's' : ''} detectado{duplicateGroups.length > 1 ? 's' : ''} automáticamente
                                    </button>
                                    {autoDetectExpanded && duplicateGroups.map((group, groupIdx) => (
                                        <div key={groupIdx} className="mt-2 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
                                            <div className="flex items-center justify-between px-3 py-2 bg-amber-100/50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                                                <div>
                                                    <p className="text-xs font-bold text-amber-800 dark:text-amber-200">{group.label}</p>
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400">{group.customers.length} clientes</p>
                                                </div>
                                                <button onClick={() => {
                                                    setSelectedPrimary(group.selectedPrincipal);
                                                    setSelectedSecondaries(new Set(group.customers.filter(c => c.id !== group.selectedPrincipal).map(c => c.id)));
                                                    handleOpenPreview('auto');
                                                }} className="text-[10px] font-bold text-amber-700 hover:text-amber-800 underline">Usar grupo</button>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {group.customers.map(c => (
                                                    <div key={c.id} className="flex items-center gap-2 text-xs px-2 py-1">
                                                        <input type="radio" name={`dup-${groupIdx}`} checked={group.selectedPrincipal === c.id}
                                                            onChange={() => handleDupSelectPrincipal(groupIdx, c.id)} className="accent-emerald-600 w-3 h-3" />
                                                        <span className="flex-1 font-medium text-slate-700 dark:text-slate-300 truncate">{c.name}</span>
                                                        <span className="text-slate-400 flex-shrink-0">{c.phone || '—'}</span>
                                                        {group.selectedPrincipal === c.id && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-1 rounded-full">Principal</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!searchQuery && duplicateGroups.length === 0 && (
                                <div className="text-center py-10">
                                    <span className="material-symbols-outlined text-4xl text-emerald-400">check_circle</span>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">No hay duplicados detectados</p>
                                    <p className="text-xs text-slate-400">Usa el buscador para encontrar clientes manualmente.</p>
                                </div>
                            )}
                        </>
                    )}

                    {mergeError && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">error</span> {mergeError}
                        </div>
                    )}
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    MODAL DE VISTA PREVIA — Rediseñado, compacto, claro
                   ══════════════════════════════════════════════════════════════ */}
                {showPreview && preview && preview.principal && (
                    <div className="absolute inset-0 z-10 bg-white dark:bg-slate-800 flex flex-col">
                        {/* Header compacto con icono de alerta */}
                        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 flex-shrink-0 bg-rose-50/50 dark:bg-rose-900/5">
                            <span className="material-symbols-outlined text-rose-500 text-2xl">warning</span>
                            <div className="flex-1">
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Confirmar unificación</h3>
                                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                                    Se eliminarán {preview.secondaries.length} cliente{preview.secondaries.length > 1 ? 's' : ''} permanentemente
                                </p>
                            </div>
                            <button onClick={() => { setShowPreview(false); setEditingCustomerId(null); }} disabled={isProcessing}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Body — dos columnas */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">

                            {/* ═══ COLUMNA: SE CONSERVA ═══ */}
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-emerald-600">verified</span>
                                    <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Cliente principal · Se conserva</p>
                                </div>

                                {/* Datos del principal */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                                    <div><span className="text-[10px] text-slate-400 uppercase">Nombre</span>
                                        <p className="font-bold text-slate-900 dark:text-white">{preview.principal.name}</p></div>
                                    <div><span className="text-[10px] text-slate-400 uppercase">Teléfono</span>
                                        <p className="font-medium text-slate-700 dark:text-slate-200">{preview.principal.phone || '—'}</p></div>
                                    <div><span className="text-[10px] text-slate-400 uppercase">Email</span>
                                        <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{preview.principal.email || '—'}</p></div>
                                    <div><span className="text-[10px] text-slate-400 uppercase">ID</span>
                                        <p className="font-mono text-[11px] text-slate-400">{preview.principal.id.slice(0, 12)}...</p></div>
                                </div>

                                {/* Métricas: actual → después */}
                                <div className="border-t border-emerald-200 dark:border-emerald-700 pt-3">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Valores después de la unificación</p>
                                    <div className="grid grid-cols-6 gap-1.5">
                                        {[
                                            { label: 'Ventas', cur: preview.principal.salesCount, add: preview.totals.sales, color: 'text-blue-600' },
                                            { label: 'Deuda', cur: preview.principal.totalDebtAmount > 0 ? fmt(preview.principal.totalDebtAmount) : '$0', add: preview.totals.debtAmount > 0 ? `+${fmt(preview.totals.debtAmount)}` : '', color: 'text-rose-600' },
                                            { label: 'Vehíc.', cur: preview.principal.vehiclesCount, add: preview.totals.vehicles, color: 'text-slate-600' },
                                            { label: 'Puntos', cur: preview.principal.loyaltyPoints, add: preview.totals.points, color: 'text-indigo-600' },
                                            { label: 'Visitas', cur: preview.principal.totalVisits, add: preview.totals.visits, color: 'text-cyan-600' },
                                            { label: 'Deudas #', cur: preview.principal.debtsCount, add: preview.totals.debts, color: 'text-orange-600' },
                                        ].map((m, i) => (
                                            <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-1.5 text-center">
                                                <p className={`text-sm font-black ${m.color} dark:brightness-125`}>
                                                    {typeof m.cur === 'number' && typeof m.add === 'number' ? m.cur + m.add : m.cur}
                                                </p>
                                                {typeof m.add === 'number' && m.add > 0 && (
                                                    <p className="text-[9px] text-emerald-500 font-bold">+{m.add}</p>
                                                )}
                                                {typeof m.add === 'string' && m.add && (
                                                    <p className="text-[9px] text-emerald-500 font-bold">{m.add}</p>
                                                )}
                                                <p className="text-[8px] text-slate-400 uppercase">{m.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ═══ COLUMNA: SE ELIMINAN ═══ */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-rose-500 text-lg">delete_forever</span>
                                    <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                                        Se eliminarán ({preview.secondaries.length})
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    {preview.secondaries.map(c => (
                                        <div key={c.id}
                                            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">

                                            {editingCustomerId === c.id ? (
                                                /* ─── Editando ─── */
                                                <div className="p-3 space-y-2">
                                                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                                                        className="w-full px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-bold" placeholder="Nombre" />
                                                    <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                                                        className="w-full px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg" placeholder="Teléfono" />
                                                    <input type="text" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                                                        className="w-full px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg" placeholder="Email" />
                                                    <div className="flex gap-2 pt-0.5">
                                                        <button onClick={() => saveEditing(c.id)} disabled={editSaving}
                                                            className="text-xs font-bold text-emerald-600 hover:underline">{editSaving ? '...' : 'Guardar'}</button>
                                                        <button onClick={() => setEditingCustomerId(null)} disabled={editSaving}
                                                            className="text-xs text-slate-400 hover:underline">Cancelar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* ─── Vista normal ─── */
                                                <div className="flex items-center gap-3 px-3 py-2.5">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                                                            <span className="text-[9px] text-slate-400 font-mono flex-shrink-0">{c.id.slice(0, 8)}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 truncate">{c.phone || 'Sin teléfono'}{c.email ? ` · ${c.email}` : ''}</p>
                                                    </div>

                                                    {/* Lo que se transfiere — mini badges */}
                                                    <div className="flex gap-1 text-[10px] font-semibold flex-shrink-0">
                                                        {c.salesCount > 0 && <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-1 py-0.5 rounded">{c.salesCount}v</span>}
                                                        {c.totalDebtAmount > 0 && <span className="bg-rose-50 dark:bg-rose-900/20 text-rose-500 px-1 py-0.5 rounded">{fmt(c.totalDebtAmount)}</span>}
                                                        {c.vehiclesCount > 0 && <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 px-1 py-0.5 rounded">{c.vehiclesCount}🚗</span>}
                                                        {c.loyaltyPoints > 0 && <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 px-1 py-0.5 rounded">{c.loyaltyPoints}pts</span>}
                                                    </div>

                                                    {/* Acciones */}
                                                    <div className="flex gap-0.5 flex-shrink-0">
                                                        <button onClick={() => startEditing(c)}
                                                            className="p-1 text-slate-300 hover:text-amber-500 transition-colors" title="Editar"><span className="material-symbols-outlined text-base">edit</span></button>
                                                        <button onClick={() => {
                                                            setSelectedSecondaries(prev => { const n = new Set(prev); n.delete(c.id); return n; });
                                                            if (preview.secondaries.length <= 1) setShowPreview(false);
                                                        }}
                                                            className="p-1 text-slate-300 hover:text-rose-500 transition-colors" title="Quitar"><span className="material-symbols-outlined text-base">remove_circle</span></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ═══ RESUMEN ═══ */}
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Total a transferir</p>
                                <div className="flex flex-wrap gap-3">
                                    {preview.totals.sales > 0 && <span className="text-xs font-bold text-blue-600">{preview.totals.sales} ventas</span>}
                                    {preview.totals.debtAmount > 0 && <span className="text-xs font-bold text-rose-500">{fmt(preview.totals.debtAmount)} en deudas</span>}
                                    {preview.totals.vehicles > 0 && <span className="text-xs font-bold text-slate-600">{preview.totals.vehicles} vehículos</span>}
                                    {preview.totals.points > 0 && <span className="text-xs font-bold text-indigo-500">{preview.totals.points} puntos</span>}
                                    {preview.totals.visits > 0 && <span className="text-xs font-bold text-cyan-600">{preview.totals.visits} visitas</span>}
                                    {preview.totals.sales === 0 && preview.totals.debtAmount === 0 && preview.totals.points === 0 && <span className="text-xs text-slate-400">Sin datos para transferir</span>}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800">
                            <button onClick={() => { setShowPreview(false); setEditingCustomerId(null); }} disabled={isProcessing}
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50">
                                Cancelar
                            </button>
                            <button onClick={() => handleExecuteMerge(preview)} disabled={isProcessing}
                                className="flex-[2] py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-500/20 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                {isProcessing ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Unificando...</span></>
                                ) : (
                                    <><span className="material-symbols-outlined text-lg">merge_type</span>Unificar {preview.secondaries.length} cliente{preview.secondaries.length > 1 ? 's' : ''}</>
                                )}
                            </button>
                        </div>

                        {mergeError && (
                            <div className="px-5 pb-3">
                                <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">error</span> {mergeError}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Overlay de éxito ─── */}
                {mergeResult && mergeResult.success && (
                    <div className="absolute inset-0 z-20 bg-emerald-500 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300">
                        <span className="material-symbols-outlined text-6xl mb-3">check_circle</span>
                        <p className="text-xl font-black">¡Unificación Exitosa!</p>
                        <p className="text-sm font-medium opacity-90 mt-1 text-center px-8">{mergeResult.message}</p>
                        <div className="flex gap-5 mt-5 text-sm font-bold">
                            <span className="bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-xl">{mergeResult.transfers.sales} ventas</span>
                            <span className="bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-xl">{mergeResult.transfers.debts} deudas</span>
                            <span className="bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-xl">{mergeResult.transfers.vehicles} vehículos</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
