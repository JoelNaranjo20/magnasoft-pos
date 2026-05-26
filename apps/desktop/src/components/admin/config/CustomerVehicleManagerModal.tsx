import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface Vehicle {
    id: string;
    customer_id: string | null;
    license_plate: string;
    brand: string | null;
    model: string | null;
    color: string | null;
    type: string | null;
    business_id?: string | null;
    created_at?: string | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    customer: any | null;
}

const VEHICLE_TYPES = [
    { id: 'car', label: 'Carro', icon: 'directions_car' },
    { id: 'motorcycle', label: 'Moto', icon: 'two_wheeler' },
    { id: 'suv', label: 'SUV', icon: 'minor_crash' },
    { id: 'truck', label: 'Camioneta', icon: 'pickup_truck' },
    { id: 'van', label: 'Van', icon: 'airport_shuttle' },
];

export const CustomerVehicleManagerModal = ({ isOpen, onClose, customer }: Props) => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Edit / Add state
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Vehicle>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && customer) {
            fetchVehicles();
            resetForm();
        }
    }, [isOpen, customer]);

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('customer_id', customer.id)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            setVehicles(data || []);
        } catch (err) {
            console.error('Error fetching vehicles:', err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setEditData({ license_plate: '', brand: '', model: '', color: '', type: 'car' });
    };

    const handleSave = async () => {
        if (!editData.license_plate) return;
        setSaving(true);
        try {
            const businessId = useBusinessStore.getState().id;
            if (!businessId) {
                alert('No se pudo identificar el negocio actual.');
                setSaving(false);
                return;
            }
            const plate = editData.license_plate.toUpperCase().trim();

            // Check for duplicate vehicle
            let query = supabase
                .from('vehicles')
                .select('*, customer:customers(*)')
                .eq('business_id', businessId)
                .eq('license_plate', plate);

            if (editData.id) {
                query = query.neq('id', editData.id);
            }

            const { data: existingVehicle } = await query.maybeSingle();

            if (existingVehicle) {
                const ownerName = existingVehicle.customer ? existingVehicle.customer.name : 'otro cliente';
                alert(`La placa ${plate} ya está registrada a nombre de: ${ownerName}`);
                setSaving(false);
                return;
            }

            const payload = {
                customer_id: customer.id,
                business_id: businessId,
                license_plate: plate,
                brand: editData.brand || null,
                model: editData.model || null,
                color: editData.color || null,
                type: editData.type || 'car'
            };

            if (editData.id) {
                // Update
                const { error } = await supabase
                    .from('vehicles')
                    .update(payload)
                    .eq('id', editData.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('vehicles')
                    .insert([payload]);
                if (error) throw error;
            }
            
            fetchVehicles();
            resetForm();
        } catch (err: any) {
            console.error('Error saving vehicle:', err);
            alert('Error al guardar vehículo: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar este vehículo? Esto no afectará el historial de servicios asociados, pero ya no aparecerá en la lista del cliente.')) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchVehicles();
        } catch (err: any) {
            console.error('Error deleting vehicle:', err);
            alert('Error al eliminar vehículo');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (v: Vehicle) => {
        setIsEditing(true);
        setEditData(v);
    };

    if (!isOpen || !customer) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined !text-[24px]">garage</span>
                        </div>
                        <div>
                            <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight">Vehículos de Cliente</h3>
                            <p className="text-xs font-bold text-slate-400">{customer.name.toUpperCase()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* List of Vehicles */}
                    {!isEditing && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Vehículos Registrados ({vehicles.length})</h4>
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="text-xs font-black text-indigo-500 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                >
                                    <span className="material-symbols-outlined !text-[16px]">add</span>
                                    NUEVO VEHÍCULO
                                </button>
                            </div>
                            
                            {loading ? (
                                <div className="py-10 text-center text-slate-400">Cargando vehículos...</div>
                            ) : vehicles.length === 0 ? (
                                <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">directions_car</span>
                                    <p className="text-sm font-bold text-slate-500">Este cliente no tiene vehículos.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {vehicles.map(v => (
                                        <div key={v.id} className="group flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-10 bg-slate-900 border-2 border-slate-700 rounded-lg flex flex-col items-center justify-center relative overflow-hidden shrink-0">
                                                    <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-400" />
                                                    <span className="text-sm font-black text-white leading-none">{v.license_plate}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white capitalize leading-tight">
                                                        {v.brand || 'Sin marca'} {v.model || ''}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-medium">
                                                        {VEHICLE_TYPES.find(t => t.id === v.type)?.label || 'Carro'} {v.color ? `· ${v.color}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEdit(v)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg">
                                                    <span className="material-symbols-outlined !text-[20px]">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
                                                    <span className="material-symbols-outlined !text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Form Edit/Add */}
                    {isEditing && (
                        <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in slide-in-from-bottom-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-indigo-500">edit_square</span>
                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">
                                    {editData.id ? 'Editar Vehículo' : 'Agregar Nuevo Vehículo'}
                                </h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 focus-within:text-indigo-500">
                                    <label className="text-[10px] font-black uppercase tracking-widest block text-inherit transition-colors">Placa *</label>
                                    <input 
                                        type="text" 
                                        maxLength={7}
                                        value={editData.license_plate}
                                        onChange={e => setEditData({...editData, license_plate: e.target.value.toUpperCase()})}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none rounded-xl font-black uppercase text-lg shadow-sm transition-all"
                                        placeholder="AAA-123"
                                    />
                                </div>
                                <div className="space-y-1.5 focus-within:text-indigo-500">
                                    <label className="text-[10px] font-black uppercase tracking-widest block text-inherit transition-colors">Tipo</label>
                                    <select 
                                        value={editData.type || 'car'}
                                        onChange={e => setEditData({...editData, type: e.target.value})}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none rounded-xl font-bold shadow-sm transition-all appearance-none"
                                    >
                                        {VEHICLE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5 focus-within:text-indigo-500">
                                    <label className="text-[10px] font-black uppercase tracking-widest block text-inherit transition-colors">Marca</label>
                                    <input 
                                        type="text" 
                                        value={editData.brand || ''}
                                        onChange={e => setEditData({...editData, brand: e.target.value})}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none rounded-xl font-bold shadow-sm transition-all"
                                        placeholder="Ej: Toyota"
                                    />
                                </div>
                                <div className="space-y-1.5 focus-within:text-indigo-500">
                                    <label className="text-[10px] font-black uppercase tracking-widest block text-inherit transition-colors">Línea o Modelo</label>
                                    <input 
                                        type="text" 
                                        value={editData.model || ''}
                                        onChange={e => setEditData({...editData, model: e.target.value})}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none rounded-xl font-bold shadow-sm transition-all"
                                        placeholder="Ej: Corolla"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1.5 focus-within:text-indigo-500">
                                    <label className="text-[10px] font-black uppercase tracking-widest block text-inherit transition-colors">Color</label>
                                    <input 
                                        type="text" 
                                        value={editData.color || ''}
                                        onChange={e => setEditData({...editData, color: e.target.value})}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none rounded-xl font-bold shadow-sm transition-all"
                                        placeholder="Ej: Blanco"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button onClick={resetForm} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSave} 
                                    disabled={saving || !editData.license_plate}
                                    className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Guardando...' : 'Guardar Vehículo'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
