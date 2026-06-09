import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface CustomerEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: any;
    onSuccess: () => void;
}

export const CustomerEditModal = ({ isOpen, onClose, customer, onSuccess }: CustomerEditModalProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        loyalty_points: 0,
        loyalty_opt_out: false
    });

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                email: customer.email || '',
                loyalty_points: customer.loyalty_points || 0,
                // Handle both missing metadata and explicitly set metadata
                loyalty_opt_out: customer.metadata?.loyalty_opt_out || false
            });
        }
    }, [customer]);

    if (!isOpen || !customer) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await (supabase
                .from('customers') as any)
                .update({
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    loyalty_points: formData.loyalty_points,
                    metadata: {
                        ...(customer.metadata || {}),
                        loyalty_opt_out: formData.loyalty_opt_out
                    }
                })
                .eq('id', customer.id);

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error updating customer:', error);
            alert('Error al actualizar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Editar Cliente</h3>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre Completo</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-primary outline-none text-slate-900 dark:text-white font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Teléfono</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-primary outline-none text-slate-900 dark:text-white font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Puntos</label>
                            <input
                                type="number"
                                value={formData.loyalty_points}
                                onChange={(e) => setFormData({ ...formData, loyalty_points: parseInt(e.target.value) || 0 })}
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-primary outline-none text-slate-900 dark:text-white font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Correo Electrónico</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-primary outline-none text-slate-900 dark:text-white font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Desactivar Puntos de Fidelización</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Si está activo, este cliente no acumulará puntos (ideal para Público General o ventas masivas).</p>
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
                            disabled={loading}
                            type="submit"
                            className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
