'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { INDUSTRY_PRESETS } from '../../../constants/ModuleRegistry';

interface ActiveTenant {
    id: string;
    email: string | null;
    full_name: string | null;
    account_status: 'active' | 'suspended';
    created_at: string;
    business: {
        id: string;
        name: string;
        status: string;
        business_type: string;
        config?: Record<string, boolean> | null;
    } | null;
}

// Módulos que no todo negocio tiene activos — nunca se condiciona por
// business_type directo (Constitución I), siempre por el config real del
// negocio (mismo merge que useBusinessStore: default -> preset -> config).
const DEFAULT_MODULE_CONFIG: Record<string, boolean> = {
    module_vehicles: false,
    module_tables: false,
    module_service_queue: false,
    module_commissions: false,
    module_commission_payment: false,
    module_customers: true,
    module_inventory: true,
    module_payroll: false,
};

function resolveModules(businessType: string, config?: Record<string, boolean> | null): Record<string, boolean> {
    const preset = INDUSTRY_PRESETS[businessType as keyof typeof INDUSTRY_PRESETS];
    return { ...DEFAULT_MODULE_CONFIG, ...(preset || {}), ...(config || {}) };
}

export default function SaasTenantsPage() {
    const [tenants, setTenants] = useState<ActiveTenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Reset Data Modal State ---
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedResetTenant, setSelectedResetTenant] = useState<{ id: string, businessId: string, email: string, businessName: string, businessType: string, businessConfig?: Record<string, boolean> | null } | null>(null);
    const [resetOptions, setResetOptions] = useState({
        sales: false,
        cash: false,
        centralCash: false,
        customers: false,
        workers: false,
        products: false,
        queue: false,
        creditors: false,
        tables: false,
        payroll: false
    });
    const [resetConfirmation, setResetConfirmation] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    // Módulos activos del negocio seleccionado — decide qué checkboxes de
    // "Limpiar Datos" mostrar (solo lo que ese negocio realmente tiene).
    const activeModules = selectedResetTenant
        ? resolveModules(selectedResetTenant.businessType, selectedResetTenant.businessConfig)
        : DEFAULT_MODULE_CONFIG;

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        setLoading(true);
        try {
            // Get current user to exclude self
            const { data: { user } } = await supabase.auth.getUser();

            // Fetch active or suspended profiles + Business Join
            // Strict Filter: Not Pending AND Not Super Admin
            const { data, error } = await supabase
                .from('profiles')
                .select('*, business:business(*)')
                .neq('account_status', 'pending')
                .neq('saas_role', 'super_admin') // Don't show ourselves or other admins
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTenants(data as unknown as ActiveTenant[] || []);
        } catch (error) {
            console.error('Error fetching tenants:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string, email: string | null) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        const action = newStatus === 'active' ? 'Reactivar' : 'Suspender';

        if (!confirm(`¿${action} acceso para ${email}?`)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ account_status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setTenants(prev => prev.map(t =>
                t.id === id ? { ...t, account_status: newStatus as any } : t
            ));
        } catch (error: any) {
            alert('Error updating status: ' + error.message);
        }
    };

    const handleResetData = async () => {
        if (!selectedResetTenant) return;
        
        if (resetConfirmation !== 'ELIMINAR') {
            alert('Debes escribir la palabra ELIMINAR para confirmar.');
            return;
        }

        if (!resetOptions.sales && !resetOptions.cash && !resetOptions.centralCash && !resetOptions.customers && !resetOptions.workers && !resetOptions.products && !resetOptions.queue && !resetOptions.creditors && !resetOptions.tables && !resetOptions.payroll) {
            alert('Debes seleccionar al menos un módulo para limpiar.');
            return;
        }

        setIsResetting(true);
        try {
            const { error } = await supabase.rpc('reset_business_data_modules', {
                p_business_id: selectedResetTenant.businessId,
                p_delete_sales: resetOptions.sales,
                p_delete_cash: resetOptions.cash,
                p_delete_central_cash: resetOptions.centralCash,
                p_delete_customers: resetOptions.customers,
                p_delete_workers: resetOptions.workers,
                p_delete_products: resetOptions.products,
                p_delete_queue: resetOptions.queue,
                p_delete_creditors: resetOptions.creditors,
                p_delete_tables: resetOptions.tables,
                p_delete_payroll_payments: resetOptions.payroll
            });

            if (error) throw error;

            alert(`Datos limpiados correctamente para el negocio: ${selectedResetTenant.businessName}`);
            setShowResetModal(false);
            setResetConfirmation('');
            setResetOptions({ sales: false, cash: false, centralCash: false, customers: false, workers: false, products: false, queue: false, creditors: false, tables: false, payroll: false });
            setSelectedResetTenant(null);
        } catch (error: any) {
            console.error('Error al reiniciar datos:', error);
            alert('Error al reiniciar datos: ' + error.message);
        } finally {
            setIsResetting(false);
        }
    };

    const filteredTenants = tenants.filter(t =>
        (t.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.business?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-600 scale-125">folder_shared</span>
                        Directorio <span className="text-blue-600">Clientes</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
                        Gestión de usuarios activos y sus negocios vinculados.
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Buscar cliente o negocio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-5">Dueño / Usuario</th>
                                <th className="px-8 py-5">Negocio Vinculado</th>
                                <th className="px-8 py-5">Estado Cuenta</th>
                                <th className="px-8 py-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/10 h-16"></td>
                                    </tr>
                                ))
                            ) : filteredTenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <span className="material-symbols-outlined">person</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800 dark:text-white">{tenant.email}</span>
                                                <span className="text-[10px] text-slate-400">{tenant.full_name || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        {tenant.business ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{tenant.business.name}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{tenant.business.business_type}</span>
                                                    {tenant.business.status !== 'active' && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold uppercase">Estado: {tenant.business.status}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                Sin Configurar
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${tenant.account_status === 'active'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                            }`}>
                                            {tenant.account_status === 'active' ? 'Activo' : 'Suspendido'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center justify-end gap-2">
                                            {tenant.business && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedResetTenant({
                                                            id: tenant.id,
                                                            businessId: tenant.business!.id,
                                                            email: tenant.email || '',
                                                            businessName: tenant.business!.name,
                                                            businessType: tenant.business!.business_type,
                                                            businessConfig: tenant.business!.config
                                                        });
                                                        setShowResetModal(true);
                                                    }}
                                                    className="p-2 rounded-xl transition-all bg-amber-50 text-amber-500 hover:bg-amber-100 hover:scale-110"
                                                    title="Limpiar Datos (Zona Peligrosa)"
                                                >
                                                    <span className="material-symbols-outlined">delete_sweep</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => toggleStatus(tenant.id, tenant.account_status, tenant.email)}
                                                className={`p-2 rounded-xl transition-all ${tenant.account_status === 'active'
                                                    ? 'bg-rose-50 text-rose-500 hover:bg-rose-100 hover:scale-110'
                                                    : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:scale-110'
                                                    }`}
                                                title={tenant.account_status === 'active' ? "Suspender Acceso" : "Reactivar Acceso"}
                                            >
                                                <span className="material-symbols-outlined">
                                                    {tenant.account_status === 'active' ? 'block' : 'refresh'}
                                                </span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Limpieza de Datos (Solo SuperAdmin) */}
            {showResetModal && selectedResetTenant && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"></div>
                    
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
                        {/* Header Rojo de Peligro */}
                        <div className="p-6 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30 flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined !text-[28px]">delete_forever</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Limpiar Datos</h3>
                                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                    Negocio: {selectedResetTenant.businessName}
                                </p>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                ⚠️ Se borrarán permanentemente los datos seleccionados. El negocio y su configuración se conservarán.
                            </p>

                            <div className="grid grid-cols-1 gap-2 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.sales}
                                        onChange={(e) => setResetOptions({ ...resetOptions, sales: e.target.checked })}
                                        className="size-5 rounded border-slate-300 text-red-600 focus:ring-red-500 bg-white"
                                    />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Todas las ventas e ítems de venta
                                    </span>
                                </label>

                                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.cash}
                                        onChange={(e) => setResetOptions({ ...resetOptions, cash: e.target.checked })}
                                        className="size-5 rounded border-slate-300 text-red-600 focus:ring-red-500 bg-white"
                                    />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Sesiones de caja y movimientos
                                    </span>
                                </label>

                                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.centralCash}
                                        onChange={(e) => setResetOptions({ ...resetOptions, centralCash: e.target.checked })}
                                        className="size-5 rounded border-slate-300 text-red-600 focus:ring-red-500 bg-white"
                                    />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Caja Central (movimientos)
                                    </span>
                                </label>

                                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.customers}
                                        onChange={(e) => setResetOptions({ ...resetOptions, customers: e.target.checked })}
                                        className="size-5 rounded border-slate-300 text-red-600 focus:ring-red-500 bg-white"
                                    />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Clientes y vehículos
                                    </span>
                                </label>

                                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.workers}
                                        onChange={(e) => setResetOptions({ ...resetOptions, workers: e.target.checked })}
                                        className="size-5 rounded border-slate-300 text-red-600 focus:ring-red-500 bg-white"
                                    />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Trabajadores y comisiones
                                    </span>
                                </label>

                                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.products}
                                        onChange={(e) => setResetOptions({ ...resetOptions, products: e.target.checked })}
                                        className="size-5 rounded border-slate-300 text-red-600 focus:ring-red-500 bg-white"
                                    />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Productos, servicios y categorías
                                    </span>
                                </label>

                                {activeModules.module_service_queue && (
                                    <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={resetOptions.queue}
                                            onChange={(e) => setResetOptions({ ...resetOptions, queue: e.target.checked })}
                                            className="size-5 rounded border-slate-300 text-red-600 focus:ring-red-500 bg-white"
                                        />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            Cola de servicio
                                        </span>
                                    </label>
                                )}

                                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.creditors}
                                        onChange={(e) => setResetOptions({ ...resetOptions, creditors: e.target.checked })}
                                        className="size-5 rounded border-slate-300 text-red-600 focus:ring-red-500 bg-white"
                                    />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Acreedores (deudas y pagos)
                                    </span>
                                </label>

                                {activeModules.module_tables && (
                                    <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={resetOptions.tables}
                                            onChange={(e) => setResetOptions({ ...resetOptions, tables: e.target.checked })}
                                            className="size-5 rounded border-slate-300 text-red-600 focus:ring-red-500 bg-white"
                                        />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            Mesas (restaurante)
                                        </span>
                                    </label>
                                )}

                                {(activeModules.module_payroll || activeModules.module_commissions || activeModules.module_commission_payment) && (
                                    <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={resetOptions.payroll}
                                            onChange={(e) => setResetOptions({ ...resetOptions, payroll: e.target.checked })}
                                            className="size-5 rounded border-slate-300 text-red-600 focus:ring-red-500 bg-white"
                                        />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            Pagos de nómina y comisiones
                                        </span>
                                    </label>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400 -mt-3 mb-4 px-1">
                                "Pagos de nómina y comisiones" borra el historial de pagos en Caja Central y las comisiones en sí (pagadas o pendientes) — los trabajadores se conservan.
                            </p>

                            <button
                                onClick={() => setResetOptions({
                                    sales: true, cash: true, centralCash: true, customers: true, workers: true, products: true,
                                    queue: !!activeModules.module_service_queue,
                                    creditors: true,
                                    tables: !!activeModules.module_tables,
                                    payroll: !!(activeModules.module_payroll || activeModules.module_commissions || activeModules.module_commission_payment),
                                })}
                                className="w-full mb-6 py-2.5 border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                            >
                                Seleccionar Todo (lo aplicable a este negocio)
                            </button>

                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-800">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block uppercase tracking-wider">
                                    Para confirmar, escribe "ELIMINAR"
                                </label>
                                <input
                                    type="text"
                                    value={resetConfirmation}
                                    onChange={(e) => setResetConfirmation(e.target.value)}
                                    placeholder="ELIMINAR"
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-slate-900 dark:text-white font-mono uppercase transition-all"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowResetModal(false);
                                        setResetConfirmation('');
                                        setResetOptions({ sales: false, cash: false, centralCash: false, customers: false, workers: false, products: false, queue: false, creditors: false, tables: false, payroll: false });
                                    }}
                                    className="flex-1 py-3.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleResetData}
                                    disabled={resetConfirmation !== 'ELIMINAR' || isResetting}
                                    className="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-xl shadow-red-500/20"
                                >
                                    {isResetting ? (
                                        <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined !text-[18px]">warning</span>
                                            Confirmar Borrado
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
