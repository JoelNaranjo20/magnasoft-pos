'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { applyDefaultTemplate, saveDashboardConfig, changeBusinessType, purgeBusinessData, deleteBusiness } from './actions';
import DashboardBuilderModal from './components/DashboardBuilderModal';

interface Business {
    id: string;
    name: string;
    business_type: string;
    dashboard_config: any;
    created_at: string;
}

type DangerAction = 'purge' | 'delete';

interface DangerModalState {
    business: Business;
    action: DangerAction;
}

export default function ConfigurationsPage() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);

    // Builder Modal State
    const [builderBusiness, setBuilderBusiness] = useState<Business | null>(null);

    // Danger Zone Modal State
    const [dangerModal, setDangerModal] = useState<DangerModalState | null>(null);
    const [dangerConfirmText, setDangerConfirmText] = useState('');
    const [dangerLoading, setDangerLoading] = useState(false);
    const [dangerResult, setDangerResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('business')
                .select('id, name, business_type, dashboard_config, config, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBusinesses(data || []);
        } catch (error) {
            console.error('Error fetching businesses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyTemplate = async (businessId: string, businessType: string) => {
        if (!confirm(`¿Aplicar plantilla de "${businessType}" a este negocio? Esto sobrescribirá la configuración actual.`)) {
            return;
        }

        setApplyingTemplate(businessId);
        try {
            const result = await applyDefaultTemplate(businessId, businessType);

            if (result.success) {
                alert('✅ Plantilla aplicada correctamente');
                await fetchBusinesses();
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (error: any) {
            alert(`❌ Error inesperado: ${error.message}`);
        } finally {
            setApplyingTemplate(null);
        }
    };

    const handleSaveBuilderConfig = async (newConfig: any[], newType: string) => {
        if (!builderBusiness) return;

        const result = await changeBusinessType(builderBusiness.id, newType, newConfig);

        if (result.success) {
            alert('✅ Configuración guardada correctamente');
            await fetchBusinesses();
            setBuilderBusiness(null);
        } else {
            alert(`❌ Error al guardar: ${result.error}`);
        }
    };

    const openDangerModal = (business: Business, action: DangerAction) => {
        setDangerModal({ business, action });
        setDangerConfirmText('');
        setDangerResult(null);
    };

    const closeDangerModal = () => {
        if (dangerLoading) return;
        setDangerModal(null);
        setDangerConfirmText('');
        setDangerResult(null);
    };

    const handleDangerConfirm = async () => {
        if (!dangerModal) return;
        const { business, action } = dangerModal;

        if (dangerConfirmText.trim() !== business.name.trim()) return;

        setDangerLoading(true);
        setDangerResult(null);

        try {
            if (action === 'purge') {
                const result = await purgeBusinessData(business.id);
                if (result.success) {
                    const total = Object.values(result.deleted || {}).reduce((a, b) => a + b, 0);
                    setDangerResult({ type: 'success', message: `✅ Datos eliminados correctamente. ${total} registros borrados.` });
                    await fetchBusinesses();
                } else {
                    setDangerResult({ type: 'error', message: `❌ Error: ${result.error}` });
                }
            } else {
                const result = await deleteBusiness(business.id);
                if (result.success) {
                    setDangerResult({ type: 'success', message: '✅ Negocio eliminado completamente.' });
                    await fetchBusinesses();
                    setTimeout(() => closeDangerModal(), 2000);
                } else {
                    setDangerResult({ type: 'error', message: `❌ Error: ${result.error}` });
                }
            }
        } catch (error: any) {
            setDangerResult({ type: 'error', message: `❌ Error inesperado: ${error.message}` });
        } finally {
            setDangerLoading(false);
        }
    };

    const getConfigStatus = (config: any) => {
        if (!config || (Array.isArray(config) && config.length === 0)) {
            return 'empty';
        }
        return 'configured';
    };

    const getBusinessTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            automotive: 'Automotriz',
            barbershop: 'Barbería',
            beauty_salon: 'Salón de Belleza',
            restaurant: 'Restaurante',
            hotel: 'Hotel'
        };
        return labels[type] || type;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <span className="material-symbols-outlined text-indigo-500 scale-125">settings</span>
                    Centro de <span className="text-indigo-500">Configuraciones</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
                    Gestiona las configuraciones de dashboard para todos los negocios del ecosistema.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="size-10 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">business_center</span>
                        </div>
                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Total Negocios</p>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{businesses.length}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="size-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">check_circle</span>
                        </div>
                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Configurados</p>
                    </div>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        {businesses.filter(b => getConfigStatus(b.dashboard_config) === 'configured').length}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="size-10 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">warning</span>
                        </div>
                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Sin Config</p>
                    </div>
                    <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
                        {businesses.filter(b => getConfigStatus(b.dashboard_config) === 'empty').length}
                    </p>
                </div>
            </div>

            {/* Business Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-950/50">
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Negocio
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Tipo
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Estado Config
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Widgets
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {businesses.map((business) => {
                                const status = getConfigStatus(business.dashboard_config);
                                const widgetCount = Array.isArray(business.dashboard_config) ? business.dashboard_config.length : 0;
                                const isApplying = applyingTemplate === business.id;

                                return (
                                    <tr
                                        key={business.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                    <span className="material-symbols-outlined text-xl">store</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{business.name}</p>
                                                    <p className="text-xs text-slate-400 font-mono">{business.id.slice(0, 8)}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700">
                                                {getBusinessTypeLabel(business.business_type)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            {status === 'empty' ? (
                                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-black uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-sm">warning</span>
                                                    Sin Config
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-black uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                    Configurado
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-slate-400 text-sm">dashboard</span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedBusiness(business)}
                                                    className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-lg transition-all flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                    Ver JSON
                                                </button>

                                                <button
                                                    onClick={() => setBuilderBusiness(business)}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                                >
                                                    <span className="material-symbols-outlined text-sm">dashboard_customize</span>
                                                    Constructor
                                                </button>

                                                {/* Danger Zone Dropdown */}
                                                <div className="relative group">
                                                    <button
                                                        className="px-3 py-2 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 border border-rose-200 dark:border-rose-900/30"
                                                        title="Opciones de peligro"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">delete_forever</span>
                                                        <span className="material-symbols-outlined text-xs">expand_more</span>
                                                    </button>
                                                    {/* Dropdown */}
                                                    <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl shadow-xl z-10 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                                                        <div className="px-3 py-2 bg-rose-50 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-900/30">
                                                            <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">⚠️ Zona de Peligro</p>
                                                        </div>
                                                        <button
                                                            onClick={() => openDangerModal(business, 'purge')}
                                                            className="w-full px-4 py-3 text-left text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors flex items-center gap-2"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">cleaning_services</span>
                                                            <div>
                                                                <p>Limpiar Datos</p>
                                                                <p className="text-[10px] font-normal text-slate-400">Borra ventas, clientes, etc.</p>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={() => openDangerModal(business, 'delete')}
                                                            className="w-full px-4 py-3 text-left text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors flex items-center gap-2 border-t border-slate-100 dark:border-slate-800"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">delete_forever</span>
                                                            <div>
                                                                <p>Eliminar Negocio</p>
                                                                <p className="text-[10px] font-normal text-slate-400">Irreversible. Borra todo.</p>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* JSON Viewer Modal */}
            {selectedBusiness && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[50] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                    Configuración: {selectedBusiness.name}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Tipo: {getBusinessTypeLabel(selectedBusiness.business_type)}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedBusiness(null)}
                                className="size-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                            >
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                            <pre className="bg-slate-950 text-emerald-400 p-6 rounded-2xl overflow-x-auto text-xs font-mono">
                                {JSON.stringify(selectedBusiness.dashboard_config, null, 2)}
                            </pre>
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedBusiness(null)}
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DASHBOARD BUILDER MODAL */}
            {builderBusiness && (
                <DashboardBuilderModal
                    isOpen={true}
                    businessId={builderBusiness.id}
                    currentType={builderBusiness.business_type}
                    currentConfig={builderBusiness.dashboard_config}
                    operationalConfig={(builderBusiness as any).config}
                    onClose={() => setBuilderBusiness(null)}
                    onSave={handleSaveBuilderConfig}
                />
            )}

            {/* ⚠️ DANGER ZONE CONFIRMATION MODAL */}
            {dangerModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-rose-300 dark:border-rose-800 max-w-md w-full shadow-2xl shadow-rose-500/20 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 bg-rose-50 dark:bg-rose-900/20 border-b border-rose-200 dark:border-rose-800">
                            <div className="flex items-center gap-3">
                                <div className="size-12 bg-rose-100 dark:bg-rose-900/40 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-2xl">
                                        {dangerModal.action === 'purge' ? 'cleaning_services' : 'delete_forever'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-rose-700 dark:text-rose-300">
                                        {dangerModal.action === 'purge' ? 'Limpiar Datos del Negocio' : 'Eliminar Negocio Completamente'}
                                    </h3>
                                    <p className="text-xs font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest">
                                        Acción Irreversible
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {dangerModal.action === 'purge' ? (
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-1">
                                    <p className="font-black">Se borrarán permanentemente:</p>
                                    <ul className="list-disc list-inside text-xs space-y-0.5 font-medium">
                                        <li>Todas las ventas e ítems de venta</li>
                                        <li>Sesiones de caja y movimientos</li>
                                        <li>Clientes y vehículos</li>
                                        <li>Trabajadores y comisiones</li>
                                        <li>Productos y servicios</li>
                                        <li>Cola de servicio</li>
                                    </ul>
                                    <p className="font-black mt-2">El negocio y su configuración se conservarán.</p>
                                </div>
                            ) : (
                                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-xl p-4 text-sm text-rose-800 dark:text-rose-300 space-y-1">
                                    <p className="font-black">Se eliminará TODO sin posibilidad de recuperación:</p>
                                    <ul className="list-disc list-inside text-xs space-y-0.5 font-medium">
                                        <li>Todos los datos operacionales</li>
                                        <li>El registro del negocio</li>
                                        <li>Toda la configuración</li>
                                    </ul>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">
                                    Escribe el nombre del negocio para confirmar:
                                    <span className="ml-1 font-mono text-rose-600 dark:text-rose-400">"{dangerModal.business.name}"</span>
                                </label>
                                <input
                                    type="text"
                                    value={dangerConfirmText}
                                    onChange={(e) => setDangerConfirmText(e.target.value)}
                                    placeholder={dangerModal.business.name}
                                    disabled={dangerLoading}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-rose-400 dark:focus:border-rose-600 transition-colors disabled:opacity-50"
                                />
                            </div>

                            {/* Result message */}
                            {dangerResult && (
                                <div className={`rounded-xl p-3 text-sm font-bold ${dangerResult.type === 'success'
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                    }`}>
                                    {dangerResult.message}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={closeDangerModal}
                                disabled={dangerLoading}
                                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDangerConfirm}
                                disabled={dangerConfirmText.trim() !== dangerModal.business.name.trim() || dangerLoading}
                                className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 dark:disabled:bg-rose-900/30 text-white rounded-xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 disabled:shadow-none disabled:cursor-not-allowed"
                            >
                                {dangerLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">
                                            {dangerModal.action === 'purge' ? 'cleaning_services' : 'delete_forever'}
                                        </span>
                                        {dangerModal.action === 'purge' ? 'Limpiar Datos' : 'Eliminar Todo'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
