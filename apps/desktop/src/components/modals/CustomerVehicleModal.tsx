// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface Customer {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    loyalty_points?: number;
    total_visits?: number;
}

interface Vehicle {
    id: string;
    customer_id: string;
    license_plate: string;
    type: 'car' | 'motorcycle' | 'truck' | 'suv' | 'van';
    brand: string | null;
    model: string | null;
    color: string | null;
}

interface CustomerVehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (customer: Customer, vehicle: Vehicle | null) => void;
    initialPlate?: string;
    preSelectedCustomer?: Customer | null;
}

const VEHICLE_TYPES = [
    { id: 'car', label: 'Carro', icon: 'directions_car' },
    { id: 'motorcycle', label: 'Moto', icon: 'two_wheeler' },
    { id: 'suv', label: 'SUV', icon: 'minor_crash' },
    { id: 'truck', label: 'Camioneta', icon: 'pickup_truck' },
    { id: 'van', label: 'Van', icon: 'airport_shuttle' },
];

const COMMON_BRANDS = ['Toyota', 'Chevrolet', 'Mazda', 'Renault', 'Kia', 'Hyundai', 'Nissan', 'Ford', 'Suzuki', 'Volkswagen'];

export const CustomerVehicleModal = ({ isOpen, onClose, onSelect, initialPlate, preSelectedCustomer }: CustomerVehicleModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<(Customer & { vehicles?: Vehicle[] })[]>([]);
    const [searching, setSearching] = useState(false);

    // Navigation and Form states
    const [step, setStep] = useState<'search' | 'customer_form' | 'vehicle_form' | 'selection'>('search');

    // New entity forms
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
    const [newVehicle, setNewVehicle] = useState({
        license_plate: '',
        type: 'car' as any,
        brand: '',
        model: '',
        color: ''
    });

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Initial load and reset
    useEffect(() => {
        if (isOpen) {
            if (preSelectedCustomer) {
                setSelectedCustomer(preSelectedCustomer);
                loadVehicles(preSelectedCustomer.id);
                setStep('selection');
                setSearchQuery('');
            } else {
                setStep('search');
                const plate = initialPlate || '';
                setSearchQuery(plate);
                setSelectedCustomer(null);
                setSelectedVehicle(null);
                setNewVehicle(prev => ({ ...prev, license_plate: plate.toUpperCase() }));

                if (plate) {
                    handleSearch(plate);
                }

                setTimeout(() => searchInputRef.current?.focus(), 100);
            }
        }
    }, [isOpen, initialPlate, preSelectedCustomer]);

    // Fast search debounced
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length > 2 && step === 'search') {
                handleSearch();
            } else if (searchQuery.length === 0) {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = async (queryOverride?: string) => {
        const query = (queryOverride || searchQuery).trim();
        if (!query || query.length < 2) return;
        setSearching(true);
        try {
            const normalizedQuery = query.toUpperCase().replace(/[^A-Z0-9]/g, '');

            const businessId = useBusinessStore.getState().id;
            // Search customers and vehicles concurrently
            const [customerRes, vehicleRes] = await Promise.all([
                supabase
                    .from('customers')
                    .select('*, vehicles(*)')
                    .eq('business_id', businessId)
                    .or(`phone.ilike.%${query}%,name.ilike.%${query}%`)
                    .limit(5),
                supabase
                    .from('vehicles')
                    .select('*, customer:customers(*)')
                    .eq('business_id', businessId)
                    .or(`license_plate.ilike.%${query}%,license_plate.ilike.%${normalizedQuery}%`)
                    .limit(10)
            ]);

            const customers = customerRes.data || [];
            const vehicleMatches = vehicleRes.data || [];

            const combined: any[] = [...customers];

            vehicleMatches.forEach(v => {
                const existing = combined.find(c => c.id === v.customer?.id);
                if (!existing) {
                    if (v.customer) {
                        combined.push({ ...v.customer, vehicles: [v] });
                    }
                } else {
                    if (!existing.vehicles) existing.vehicles = [];
                    if (!existing.vehicles.find(ev => ev.id === v.id)) {
                        existing.vehicles.push(v);
                    }
                }
            });

            setSearchResults(combined);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchResults.length > 0) {
            handleSelectCustomer(searchResults[0]);
        }
    };

    const loadVehicles = async (customerId: string) => {
        const { data } = await supabase
            .from('vehicles')
            .select('*')
            .eq('business_id', useBusinessStore.getState().id)
            .eq('customer_id', customerId);
        setVehicles(data || []);
    };

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        loadVehicles(customer.id);
        setStep('selection');
    };

    const handleCreateCustomer = async () => {
        if (!newCustomer.name || !newCustomer.phone) return;
        setLoading(true);
        try {
            const payload = {
                ...newCustomer,
                business_id: useBusinessStore.getState().id
            };
            const { data, error } = await supabase.from('customers').insert(payload).select().single();
            if (error) throw error;
            setSelectedCustomer(data);
            setStep('vehicle_form');
        } catch (err: any) {
            console.error('Error creating customer:', err);
            const msg = err.code === '42501'
                ? 'Error de seguridad (RLS): No tienes permisos para crear clientes o el ID de negocio no coincide.'
                : 'Error al crear el cliente';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateVehicle = async () => {
        if (!newVehicle.license_plate || !selectedCustomer) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('vehicles').insert({
                ...newVehicle,
                customer_id: selectedCustomer.id,
                license_plate: newVehicle.license_plate.toUpperCase(),
                business_id: useBusinessStore.getState().id
            }).select().single();
            if (error) throw error;
            setSelectedVehicle(data);
            onSelect(selectedCustomer, data);
            onClose();
        } catch (err: any) {
            console.error('Error creating vehicle:', err);
            const msg = err.code === '42501'
                ? 'Error de seguridad (RLS): No tienes permisos para registrar vehículos.'
                : 'Error al registrar el vehículo';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md transition-all duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-700/50">

                {/* Header (Steps) */}
                <div className="px-8 pt-8 pb-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                            {step === 'search' && 'Buscar Cliente'}
                            {step === 'customer_form' && 'Nuevo Cliente'}
                            {step === 'vehicle_form' && 'Registrar Vehículo'}
                            {step === 'selection' && 'Seleccionar'}
                        </h3>
                        <p className="text-sm text-slate-400 font-medium">
                            {step === 'search' && 'Encuentra por placa, nombre o celular'}
                            {step === 'customer_form' && 'Ingresa los datos del nuevo cliente'}
                            {step === 'vehicle_form' && `Vehículo para ${selectedCustomer?.name}`}
                            {step === 'selection' && 'Elige un vehículo o agrega uno nuevo'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">

                    {/* STEP: SEARCH */}
                    {step === 'search' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="relative group">
                                <span className={`absolute left-4 top-4 material-symbols-outlined transition-colors ${searching ? 'text-primary animate-spin' : 'text-slate-300'}`}>
                                    {searching ? 'sync' : 'search'}
                                </span>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    placeholder="Escribe para buscar..."
                                    className="w-full pl-12 pr-4 py-4 text-lg font-bold bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-slate-800 dark:text-white"
                                />
                            </div>

                            <div className="space-y-3 min-h-[300px]">
                                {searchResults.length > 0 ? (
                                    searchResults.map((customer) => (
                                        <button
                                            key={customer.id}
                                            onClick={() => handleSelectCustomer(customer)}
                                            className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all active:scale-[0.98] group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                    <span className="material-symbols-outlined">person</span>
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-slate-800 dark:text-white">{customer.name}</div>
                                                    <div className="text-xs font-bold text-slate-400">{customer.phone}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-[200px] scrollbar-hide">
                                                {customer.vehicles?.map(v => (
                                                    <div key={v.id} className="w-14 h-9 bg-slate-900 border-2 border-slate-700 rounded-lg flex flex-col items-center justify-center shadow-md relative overflow-hidden shrink-0">
                                                        <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-400"></div>
                                                        <span className="text-[11px] font-black leading-none text-white">{v.license_plate}</span>
                                                        <div className="text-[6px] font-black text-slate-400 uppercase leading-none mt-0.5">COL</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    !searching && searchQuery.length > 2 && (
                                        <div className="py-12 text-center">
                                            <div className="w-20 h-20 mx-auto bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                                <span className="material-symbols-outlined text-slate-200 text-4xl">person_search</span>
                                            </div>
                                            <p className="text-slate-400 font-bold">No se encontraron clientes</p>
                                            <button
                                                onClick={() => setStep('customer_form')}
                                                className="mt-4 text-primary font-black uppercase text-xs tracking-widest hover:underline"
                                            >
                                                Crear nuevo cliente
                                            </button>
                                        </div>
                                    )
                                )}

                                {searchQuery.length <= 2 && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setStep('customer_form')}
                                            className="p-6 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-all group flex flex-col items-center justify-center gap-3"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                                                <span className="material-symbols-outlined">person_add</span>
                                            </div>
                                            <span className="font-bold text-sm text-slate-500 group-hover:text-primary transition-colors">Nuevo Cliente</span>
                                        </button>
                                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-2 opacity-50">
                                            <span className="material-symbols-outlined text-slate-300 text-3xl">qr_code_scanner</span>
                                            <span className="font-bold text-[10px] uppercase text-slate-400 tracking-tighter">Próximamente QR</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP: CUSTOMER FORM */}
                    {step === 'customer_form' && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newCustomer.name}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-primary outline-none font-bold"
                                        placeholder="Ej: Juan Perez"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Teléfono Movil</label>
                                    <input
                                        type="tel"
                                        value={newCustomer.phone}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-primary outline-none font-bold"
                                        placeholder="Ej: 300 000 0000"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email (Opcional)</label>
                                    <input
                                        type="email"
                                        value={newCustomer.email}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-primary outline-none font-bold"
                                        placeholder="cliente@ejemplo.com"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('search')}
                                    className="px-8 py-4 font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    Volver
                                </button>
                                <button
                                    onClick={handleCreateCustomer}
                                    disabled={loading || !newCustomer.name || !newCustomer.phone}
                                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all"
                                >
                                    {loading ? 'Creando...' : 'Continuar al Vehículo'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP: SELECTION (Existing Customer) */}
                    {step === 'selection' && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-3xl border border-primary/10">
                                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                    <span className="material-symbols-outlined">person</span>
                                </div>
                                <div className="flex-1">
                                    <div className="font-black text-slate-800 dark:text-white leading-none mb-1">{selectedCustomer?.name}</div>
                                    <div className="text-xs font-bold text-primary">{selectedCustomer?.phone}</div>
                                </div>
                                <button onClick={() => setStep('search')} className="p-2 text-slate-300 hover:text-slate-500">
                                    <span className="material-symbols-outlined">edit</span>
                                </button>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehículos Registrados</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {vehicles.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => {
                                                onSelect(selectedCustomer!, v);
                                                onClose();
                                            }}
                                            className="group flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:border-primary hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-[0.98]"
                                        >
                                            <div className="w-16 h-10 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center group-hover:border-primary/30 shadow-sm relative overflow-hidden">
                                                <div className="absolute top-0 left-0 right-0 h-1 bg-primary/10"></div>
                                                <span className="text-sm font-black leading-none text-slate-800 dark:text-white group-hover:text-primary transition-colors">{v.license_plate}</span>
                                                <div className="text-[10px] font-black text-slate-400 uppercase leading-none mt-1">Colombia</div>
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="font-bold text-sm text-slate-800 dark:text-white">{v.brand || 'Marca no reg.'}</div>
                                                <div className="text-[11px] font-bold text-slate-400">{v.model} {v.color && `· ${v.color}`}</div>
                                            </div>
                                            <span className="material-symbols-outlined text-slate-200 group-hover:text-primary transition-colors">arrow_forward_ios</span>
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setStep('vehicle_form')}
                                        className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 font-black text-xs uppercase tracking-widest hover:border-primary hover:text-primary hover:bg-primary/5 transition-all mt-2"
                                    >
                                        + Agregar otro vehículo
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP: VEHICLE FORM */}
                    {step === 'vehicle_form' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-300">
                            <div className="space-y-5">
                                {/* Type Selector */}
                                <div className="grid grid-cols-5 gap-2">
                                    {VEHICLE_TYPES.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setNewVehicle({ ...newVehicle, type: type.id })}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2 ${newVehicle.type === type.id
                                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                                : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-primary/30'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined !text-[20px]">{type.icon}</span>
                                            <span className="text-[9px] font-black uppercase tracking-tighter">{type.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="flex-none w-40 space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Placa *</label>
                                            <div className="relative h-16 w-full bg-white dark:bg-slate-900 border-4 border-slate-800 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center group-focus-within:border-primary transition-all overflow-hidden shadow-sm">
                                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-yellow-400"></div>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={newVehicle.license_plate}
                                                    onChange={(e) => setNewVehicle({ ...newVehicle, license_plate: e.target.value.toUpperCase() })}
                                                    className="w-full text-center text-2xl font-black bg-transparent outline-none uppercase tracking-tighter dark:text-white"
                                                    placeholder="AAA000"
                                                    maxLength={7}
                                                />
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none mt-1">Colombia</div>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Marca</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={newVehicle.brand}
                                                    onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                                                    className="w-full px-5 h-16 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-primary outline-none font-bold"
                                                    placeholder="Ej: Toyota"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Brands Quick Select */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {COMMON_BRANDS.map(b => (
                                            <button
                                                key={b}
                                                onClick={() => setNewVehicle({ ...newVehicle, brand: b })}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${newVehicle.brand === b
                                                    ? 'bg-primary text-white'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {b}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Modelo</label>
                                            <input
                                                type="text"
                                                value={newVehicle.model}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-primary outline-none font-bold"
                                                placeholder="Ej: Hilux"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Color</label>
                                            <input
                                                type="text"
                                                value={newVehicle.color}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-primary outline-none font-bold"
                                                placeholder="Ej: Gris"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setStep('selection')}
                                    className="px-8 py-4 font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    Volver
                                </button>
                                <button
                                    onClick={handleCreateVehicle}
                                    disabled={loading || !newVehicle.license_plate}
                                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all font-bold"
                                >
                                    {loading ? 'Guardando...' : 'Finalizar y Cobrar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
