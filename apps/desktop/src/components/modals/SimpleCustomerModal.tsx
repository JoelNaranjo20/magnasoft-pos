// @ts-nocheck
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface SimpleCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (customer: any) => void;
    onQuickSale?: () => void;
}

export const SimpleCustomerModal = ({ isOpen, onClose, onSelect, onQuickSale }: SimpleCustomerModalProps) => {
    const [step, setStep] = useState<'search' | 'create'>('search');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const businessId = useBusinessStore.getState().id;
            const { data } = await supabase
                .from('customers')
                .select('*')
                .eq('business_id', businessId)
                .or(`phone.ilike.%${query}%,name.ilike.%${query}%`)
                .limit(5);

            setSearchResults(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('El nombre es obligatorio');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const { data, error: insertError } = await supabase
                .from('customers')
                .insert({
                    business_id: useBusinessStore.getState().id,
                    name: name.trim(),
                    phone: phone.trim() || null,
                    email: null,
                    loyalty_points: 0,
                    total_visits: 0
                })
                .select()
                .single();

            if (insertError) throw insertError;

            onSelect(data);
            onClose();
            setName('');
            setPhone('');
        } catch (err: any) {
            console.error('Error creating customer:', err);
            setError(err.message || 'Error al crear cliente');
        } finally {
            setSaving(false);
        }
    };

    const handleQuickSale = () => {
        if (onQuickSale) {
            onQuickSale();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                        {step === 'search' ? 'Seleccionar Cliente' : 'Nuevo Cliente'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 mb-4 flex gap-2">
                    <button
                        onClick={() => setStep('search')}
                        className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${step === 'search'
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'}`}
                    >
                        Buscar
                    </button>
                    <button
                        onClick={() => setStep('create')}
                        className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${step === 'create'
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'}`}
                    >
                        Crear Nuevo
                    </button>
                </div>

                <div className="p-6 pt-2">
                    {/* STEP: SEARCH */}
                    {step === 'search' && (
                        <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                            <div className="relative">
                                <span className={`absolute left-4 top-3.5 material-symbols-outlined transition-colors ${searching ? 'text-primary animate-spin' : 'text-slate-400'}`}>
                                    {searching ? 'sync' : 'search'}
                                </span>
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
                                    placeholder="Buscar por nombre o teléfono..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                            </div>

                            <div className="min-h-[200px] max-h-[300px] overflow-y-auto -mx-2 px-2 custom-scrollbar space-y-2">
                                {searchResults.length > 0 ? (
                                    searchResults.map(customer => (
                                        <button
                                            key={customer.id}
                                            onClick={() => { onSelect(customer); onClose(); }}
                                            className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-primary hover:shadow-md transition-all group text-left"
                                        >
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors">{customer.name}</div>
                                                <div className="text-xs font-medium text-slate-400">{customer.phone || 'Sin teléfono'}</div>
                                            </div>
                                            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">arrow_forward</span>
                                        </button>
                                    ))
                                ) : (
                                    searchQuery.length > 2 && !searching && (
                                        <div className="text-center py-8 text-slate-400">
                                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_search</span>
                                            <p className="text-xs font-bold">No se encontraron clientes</p>
                                            <button
                                                onClick={() => setStep('create')}
                                                className="mt-2 text-primary font-black text-xs uppercase hover:underline"
                                            >
                                                Crear "{searchQuery}"
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Quick Sale Option */}
                            {onQuickSale && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={handleQuickSale}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all"
                                    >
                                        <span className="material-symbols-outlined !text-lg">bolt</span>
                                        Venta Rápida (Público General)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP: CREATE FORM */}
                    {step === 'create' && (
                        <form onSubmit={handleSubmit} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            {error && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-bold">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Nombre Completo *</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
                                    placeholder="Juan Pérez"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setError(null);
                                    }}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Celular (Opcional)</label>
                                <input
                                    type="tel"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
                                    placeholder="3001234567"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep('search')}
                                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold hover:text-slate-700 transition-all"
                                >
                                    Volver
                                </button>
                                <button
                                    type="submit"
                                    disabled={!name.trim() || saving}
                                    className="flex-1 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                                >
                                    {saving ? 'Guardando...' : 'Crear Cliente'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
