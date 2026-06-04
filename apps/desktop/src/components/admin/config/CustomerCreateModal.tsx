import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { normalizePhone } from '@shared/lib/normalizePhone';
import { normalizeName } from '@shared/lib/normalizeName';

interface DuplicateCheckResult {
    id: string;
    name: string;
    phone: string | null;
    last_visit: string | null;
}

interface CustomerCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CustomerCreateModal = ({ isOpen, onClose, onSuccess }: CustomerCreateModalProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        loyalty_opt_out: false
    });
    const [duplicateMatches, setDuplicateMatches] = useState<DuplicateCheckResult[] | null>(null);
    const [creatingOverride, setCreatingOverride] = useState(false);

    if (!isOpen) return null;

    const checkDuplicates = async (businessId: string, customerName: string, customerPhone: string | null): Promise<DuplicateCheckResult[]> => {
        const normalizedPhone = normalizePhone(customerPhone);
        const normalizedName = normalizeName(customerName);

        // Construir query base: clientes activos (no unificados) del negocio
        let query = supabase
            .from('customers')
            .select('id, name, phone, last_visit')
            .eq('business_id', businessId)
            .is('metadata->>merged_into_id', null);

        // Si hay teléfono, buscar por teléfono normalizado
        if (normalizedPhone) {
            // Obtenemos varios candidatos y filtramos en cliente por teléfono normalizado
            const { data } = await query;
            if (data) {
                return data.filter(c => normalizePhone(c.phone) === normalizedPhone && c.name !== customerName);
            }
            return [];
        }

        // Sin teléfono: buscar por similitud de nombre normalizado
        const { data } = await query;
        if (data) {
            return data.filter(c =>
                normalizeName(c.name) === normalizedName && c.name !== customerName
            );
        }
        return [];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setLoading(true);
        try {
            const businessId = useBusinessStore.getState().id;
            if (!businessId) {
                alert('No se pudo identificar el negocio actual.');
                setLoading(false);
                return;
            }
            const customerName = formData.name.trim();
            const customerPhone = formData.phone.trim() || null;

            // Verificar duplicados usando normalización
            const matches = await checkDuplicates(businessId, customerName, customerPhone);

            if (matches.length > 0 && !creatingOverride) {
                setDuplicateMatches(matches);
                setLoading(false);
                return;
            }

            await createCustomer(businessId, customerName, customerPhone);
        } catch (error: any) {
            console.error('Error creating customer:', error);
            alert('Error al crear cliente: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const createCustomer = async (businessId: string, customerName: string, customerPhone: string | null) => {
        setCreatingOverride(true);
        try {
            const metadata: Record<string, unknown> = {
                loyalty_opt_out: formData.loyalty_opt_out
            };
            // Si hubo coincidencias que el usuario decidió ignorar, registrarlo
            if (duplicateMatches && duplicateMatches.length > 0) {
                metadata.duplicate_override = true;
                metadata.duplicate_override_at = new Date().toISOString();
                metadata.duplicate_override_matches = duplicateMatches.map(m => m.id);
            }

            const { error } = await supabase
                .from('customers')
                .insert({
                    business_id: businessId,
                    name: customerName,
                    phone: customerPhone,
                    email: null,
                    loyalty_points: 0,
                    total_visits: 0,
                    metadata
                });

            if (error) throw error;

            alert('Cliente creado con éxito');
            onSuccess();
            onClose();
            setFormData({ name: '', phone: '', loyalty_opt_out: false });
            setDuplicateMatches(null);
        } catch (error: any) {
            throw error;
        } finally {
            setCreatingOverride(false);
        }
    };

    const handleUseExisting = () => {
        // Simplemente cerrar — el admin luego buscará al cliente existente manualmente
        setDuplicateMatches(null);
        onClose();
    };

    const handleCreateAnyway = async () => {
        setDuplicateMatches(null);
        setLoading(true);
        try {
            const businessId = useBusinessStore.getState().id;
            if (!businessId) return;
            await createCustomer(businessId, formData.name.trim(), formData.phone.trim() || null);
        } catch (error: any) {
            alert('Error al crear cliente: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        {duplicateMatches ? 'Posible Duplicado' : 'Nuevo Cliente'}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {duplicateMatches ? (
                    /* --- DIÁLOGO DE PREVENCIÓN DE DUPLICADOS --- */
                    <div className="p-8 space-y-5">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 mt-0.5">warning</span>
                                <div>
                                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                                        Ya existe{duplicateMatches.length > 1 ? 'n' : ''} {duplicateMatches.length} cliente{duplicateMatches.length > 1 ? 's' : ''} similar{duplicateMatches.length > 1 ? 'es' : ''}:
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                        ¿Deseas usar el cliente existente o crear de todos modos?
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Lista de coincidencias */}
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {duplicateMatches.map((match) => (
                                <div key={match.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{match.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {match.phone || 'Sin teléfono'}
                                        {match.last_visit ? ` · Última visita: ${new Date(match.last_visit).toLocaleDateString()}` : ''}
                                    </p>
                                </div>
                            ))}
                            {duplicateMatches.length > 5 && (
                                <p className="text-xs text-slate-400 text-center py-1">
                                    y {duplicateMatches.length - 5} más...
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleUseExisting}
                                className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all"
                            >
                                Usar existente
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateAnyway}
                                disabled={loading}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Creando...' : 'Crear de todos modos'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* --- FORMULARIO DE CREACIÓN NORMAL --- */
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre Completo *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-primary outline-none text-slate-900 dark:text-white font-medium"
                                placeholder="Ej: Juan Pérez"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Teléfono Celular (Opcional)</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-primary outline-none text-slate-900 dark:text-white font-medium"
                                placeholder="Ej: 3001234567"
                            />
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Desactivar Puntos de Fidelización</h4>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Si está activo, este cliente no acumulará puntos (ideal para Público General o ventas mayoristas).</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, loyalty_opt_out: !prev.loyalty_opt_out }))}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.loyalty_opt_out ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.loyalty_opt_out ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
                                Cancelar
                            </button>
                            <button
                                disabled={loading || !formData.name.trim()}
                                type="submit"
                                className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Creando...' : 'Crear Cliente'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
