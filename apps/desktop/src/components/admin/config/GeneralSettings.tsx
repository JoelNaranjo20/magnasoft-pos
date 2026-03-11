
// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';
import { DashboardSettings } from '../../dashboard/DashboardSettings';

interface BusinessData {
    id?: string;
    name: string;
    address: string;
    location: string;
    phone: string;
    email: string;
    pin: string;
    logo_url: string;
}

export const GeneralSettings = () => {
    const { user } = useSessionStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Business Data
    const [businessData, setBusinessData] = useState<BusinessData>({
        name: '',
        address: '',
        location: '',
        phone: '',
        email: '',
        pin: '',
        logo_url: ''
    });

    // Password change state
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showPinInput, setShowPinInput] = useState(false);

    // Module Protection state
    const [localProtectedModules, setLocalProtectedModules] = useState<string[]>([]);
    const [printers, setPrinters] = useState<any[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Data Reset State
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetOptions, setResetOptions] = useState({
        sales: false,
        customers: false,
        products: false,
        workers: false
    });
    const [resetConfirmation, setResetConfirmation] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const availableModules = [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', description: 'Vista general y estadísticas financieras.' },
        { id: 'sales', label: 'Ventas', icon: 'receipt_long', description: 'Historial detallado de todas las transacciones.' },
        { id: 'finance', label: 'Finanzas', icon: 'account_balance', description: 'Gestión de caja y movimientos financieros.' },
        { id: 'audit', label: 'Auditoría', icon: 'inventory_2', description: 'Control de stock y auditoría de inventario.' },
        { id: 'config', label: 'Configuración', icon: 'settings', description: 'Ajustes del sistema y administración.' },
        { id: 'pos', label: 'Punto de Venta (POS)', icon: 'point_of_sale', description: 'Módulo de facturación y ventas en vivo.' },
    ];

    useEffect(() => {
        fetchBusinessData();
    }, []);

    const fetchBusinessData = async () => {
        setLoading(true);
        try {
            const businessId = useBusinessStore.getState().id;
            const { data, error } = await supabase
                .from('business')
                .select('*')
                .eq('id', businessId)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setBusinessData({
                    id: data.id,
                    name: data.name || '',
                    address: data.address || '',
                    location: data.location || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    pin: data.pin || '',
                    logo_url: data.logo_url || ''
                });
            }
        } catch (error) {
            console.error('Error fetching business settings:', error);
        } finally {
            setLoading(false);
        }

        // Fetch Security Settings
        try {
            const businessId = useBusinessStore.getState().id;
            const { data: securityData } = await supabase
                .from('business_settings')
                .select('value')
                .eq('business_id', businessId)
                .eq('setting_type', 'security')
                .maybeSingle();

            if (securityData?.value?.protected_modules) {
                setLocalProtectedModules(securityData.value.protected_modules);
            } else {
                // Default if not set
                setLocalProtectedModules(['audit', 'config']);
            }
        } catch (error) {
            console.error('Error fetching security settings:', error);
        }

        // Fetch Printer Settings
        try {
            if (window.electronAPI) {
                const availablePrinters = await window.electronAPI.getPrinters();
                setPrinters(availablePrinters);

                const printerConfig = await window.electronAPI.storageGet('selected-printer');
                if (printerConfig) {
                    setSelectedPrinter(printerConfig);
                }
            }
        } catch (error) {
            console.error('Error fetching printer settings:', error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Update Business Details
            const updates: any = {
                name: businessData.name,
                address: businessData.address,
                location: businessData.location,
                phone: businessData.phone,
                email: businessData.email,
                logo_url: businessData.logo_url
            };

            // 2. Handle PIN Change if requested
            if (showPinInput && newPin) {
                if (newPin !== confirmPin) {
                    alert('Los nuevos PINs no coinciden');
                    setSaving(false);
                    return;
                }
                if (newPin.length < 6) {
                    alert('El PIN debe tener al menos 6 caracteres');
                    setSaving(false);
                    return;
                }

                updates.pin = newPin;

                // Removed Sync with Supabase Auth Password as per user request
                // The PIN is now independent from the Web Login Password
            }

            // Update database record
            if (businessData.id) {
                const { error } = await supabase.from('business').update(updates).eq('id', businessData.id);
                if (error) throw error;
            } else {
                // Fallback: search for single row if ID not in state
                const { data: current } = await supabase.from('business').select('id').maybeSingle();
                if (current) {
                    const { error } = await supabase.from('business').update(updates).eq('id', current.id);
                    if (error) throw error;
                }
            }

            alert('Configuración actualizada correctamente.');
            setNewPin('');
            setConfirmPin('');
            setShowPinInput(false);

            // 3. Save Module Protection Settings
            const businessId = useBusinessStore.getState().id;
            const { error: securityError } = await supabase
                .from('business_settings')
                .upsert({
                    business_id: businessId,
                    setting_type: 'security',
                    value: { protected_modules: localProtectedModules }
                }, { onConflict: 'business_id,setting_type' });

            if (securityError) throw securityError;

            // 4. Save Printer Settings
            if (window.electronAPI && selectedPrinter) {
                await window.electronAPI.storageSet('selected-printer', selectedPrinter);
            }

            // Refresh global stores
            await useBusinessStore.getState().fetchBusinessProfile();

            fetchBusinessData(); // Refresh local

        } catch (error: any) {
            console.error('Error saving settings:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleResetData = async () => {
        if (resetConfirmation !== 'ELIMINAR') {
            alert('Debes escribir la palabra ELIMINAR para confirmar.');
            return;
        }

        const isDeleteAll = resetOptions.sales && resetOptions.customers && resetOptions.products && resetOptions.workers;

        if (!resetOptions.sales && !resetOptions.customers && !resetOptions.products && !resetOptions.workers && !isDeleteAll) {
            alert('Debes seleccionar al menos un módulo para eliminar.');
            return;
        }

        setIsResetting(true);
        try {
            const businessId = useBusinessStore.getState().id;

            const { error } = await supabase.rpc('reset_business_data_modules', {
                p_business_id: businessId,
                p_delete_sales: resetOptions.sales,
                p_delete_customers: resetOptions.customers,
                p_delete_products: resetOptions.products,
                p_delete_workers: resetOptions.workers,
                p_delete_all: isDeleteAll
            });

            if (error) throw error;

            alert('Datos eliminados correctamente.');
            setShowResetModal(false);
            setResetConfirmation('');
            setResetOptions({ sales: false, customers: false, products: false, workers: false });

            // Opcional: recargar la página para limpiar estados globales cacheados
            window.location.reload();

        } catch (error: any) {
            console.error('Error al reiniciar datos:', error);
            alert('Error al reiniciar datos: ' + error.message);
        } finally {
            setIsResetting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando datos del negocio...</div>;

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm">
                    <span className="material-symbols-outlined !text-4xl">store</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Datos del Negocio</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Información visible en tickets y reportes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre del Negocio</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">storefront</span>
                        <input
                            type="text"
                            value={businessData.name}
                            onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-primary outline-none font-medium"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Teléfono / WhatsApp</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">phone</span>
                        <input
                            type="text"
                            value={businessData.phone}
                            onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-primary outline-none font-medium"
                        />
                    </div>
                </div>

                <div className="space-y-2 col-span-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Dirección</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">location_on</span>
                        <input
                            type="text"
                            value={businessData.address}
                            onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-primary outline-none font-medium"
                        />
                    </div>
                </div>

                <div className="space-y-2 col-span-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Ubicación (Ciudad/País)</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">map</span>
                        <input
                            type="text"
                            value={businessData.location}
                            onChange={(e) => setBusinessData({ ...businessData, location: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-primary outline-none font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Dashboard Configuration Section */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-8 mt-8">
                <DashboardSettings />
            </div>

            {/* Logo Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-6">
                <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Logotipo del Negocio</label>
                    <div className="flex items-center gap-6">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="h-24 w-24 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden relative flex items-center justify-center group cursor-pointer hover:border-primary transition-all shadow-md group"
                        >
                            {businessData.logo_url ? (
                                <img src={businessData.logo_url} alt="Logo" className="h-full w-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-slate-300 !text-4xl">add_photo_alternate</span>
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <span className="material-symbols-outlined text-white">edit</span>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                    if (!e.target.files || e.target.files.length === 0) return;
                                    const file = e.target.files[0];
                                    const fileExt = file.name.split('.').pop();
                                    const fileName = `logo_${Math.random()}.${fileExt}`;
                                    const filePath = `${fileName}`;

                                    setSaving(true);
                                    try {
                                        // 1. Upload to Supabase Storage
                                        const { error: uploadError } = await (supabase.storage as any)
                                            .from('business_assets')
                                            .upload(filePath, file);

                                        if (uploadError) throw uploadError;

                                        // 2. Get Public URL
                                        const { data: { publicUrl } } = (supabase.storage as any)
                                            .from('business_assets')
                                            .getPublicUrl(filePath);

                                        // 3. Update State
                                        setBusinessData({ ...businessData, logo_url: publicUrl });

                                        // 4. Also update global store immediately
                                        useBusinessStore.setState({ logoUrl: publicUrl });

                                    } catch (error: any) {
                                        alert('Error subiendo imagen: ' + error.message);
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                            />
                        </div>
                        <div className="text-xs text-slate-500 max-w-[200px]">
                            <p className="font-bold text-slate-700 dark:text-slate-300">Logotipo del Negocio</p>
                            <p className="mt-1">Haz clic en el círculo para subir tu logo.</p>
                            <p className="mt-1 opacity-60 italic">PNG o JPG recomendado.</p>
                        </div>
                    </div >
                </div >

                {/* Printer Settings */}
                < div className="space-y-4" >
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Configuración de Impresora</label>
                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">print</span>
                        <select
                            value={selectedPrinter}
                            onChange={(e) => setSelectedPrinter(e.target.value)}
                            className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-primary transition-all text-slate-700 dark:text-slate-200 font-bold appearance-none cursor-pointer"
                        >
                            <option value="">Seleccionar Impresora Térmica...</option>
                            {printers.map((printer) => (
                                <option key={printer.name} value={printer.name}>
                                    {printer.name} {printer.isDefault ? '(Predeterminada)' : ''}
                                </option>
                            ))}
                        </select>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium italic">
                        * Selecciona la impresora térmica conectada a este equipo para la impresión de tickets.
                    </p>
                </div >
            </div >

            {/* Security Section */}
            < div className="border-t border-slate-100 dark:border-slate-700 pt-8 mt-8" >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                            <span className="material-symbols-outlined !text-3xl">lock</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Seguridad y Acceso</h3>
                            <p className="text-sm text-slate-500">Credenciales del administrador principal.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPinInput(!showPinInput)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${showPinInput ? 'bg-slate-200 text-slate-600' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                    >
                        {showPinInput ? 'Cancelar Cambio' : 'Cambiar PIN Maestro'}
                    </button>
                </div>

                {
                    showPinInput && (
                        <div className="p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-rose-900 dark:text-rose-300">Nuevo PIN Maestro (Mín. 6 chars)</label>
                                    <input
                                        type="password"
                                        value={newPin}
                                        onChange={(e) => setNewPin(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-800 rounded-xl focus:border-rose-500 outline-none"
                                        placeholder="Ingrese nuevo PIN"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-rose-900 dark:text-rose-300">Confirmar Nuevo PIN</label>
                                    <input
                                        type="password"
                                        value={confirmPin}
                                        onChange={(e) => setConfirmPin(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-800 rounded-xl focus:border-rose-500 outline-none"
                                        placeholder="Repita nuevo PIN"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                ✨ Información: Este cambio actualiza <strong>SOLO el PIN Maestro</strong> para los módulos del POS. Tu contraseña de acceso web se mantiene igual.
                            </p>
                        </div>
                    )
                }
            </div >

            {/* Modules Security Section */}
            < div className="border-t border-slate-100 dark:border-slate-700 pt-8 mt-8" >
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined !text-3xl">verified_user</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Crear seguridad a módulos</h3>
                        <p className="text-sm text-slate-500">Seleccione los módulos que requerirán PIN para ingresar.</p>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-100/50 dark:bg-slate-800/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Módulo</th>
                                <th className="px-6 py-4">Descripción</th>
                                <th className="px-6 py-4 text-center">Protegido</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {availableModules.map((module) => (
                                <tr key={module.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-slate-400">{module.icon}</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{module.label}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                        {module.description}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <label className="relative inline-flex items-center cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={localProtectedModules.includes(module.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setLocalProtectedModules([...localProtectedModules, module.id]);
                                                    } else {
                                                        setLocalProtectedModules(localProtectedModules.filter(id => id !== module.id));
                                                    }
                                                }}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary rounded-full"></div>
                                        </label>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-[10px] text-slate-400 mt-4 italic">
                    * Los módulos seleccionados solicitarán el PIN maestro al intentar acceder a ellos.
                </p>
            </div >

            {/* Zona Peligrosa (Data Reset) */}
            <div className="border-t border-red-100 dark:border-red-900/30 pt-8 mt-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400">
                            <span className="material-symbols-outlined !text-3xl">warning</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Zona Peligrosa</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Restablecimiento y limpieza de datos del negocio.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowResetModal(true)}
                        className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg font-bold text-sm transition-colors border border-red-200 dark:border-red-800"
                    >
                        Gestionar Limpieza de Datos
                    </button>
                </div>
            </div>

            <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-primary-hover hover:shadow-blue-500/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {saving ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">save</span>
                            Guardar Toda la Configuración
                        </>
                    )}
                </button>
            </div>

            {/* Modal de Reset de Datos */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                                    <span className="material-symbols-outlined">delete_forever</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Limpiar Datos</h3>
                            </div>

                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Selecciona qué módulos deseas reiniciar. Esta acción es <strong>permanente e irreversible</strong>.
                            </p>

                            <div className="space-y-3 mb-6">
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.sales}
                                        onChange={(e) => setResetOptions({ ...resetOptions, sales: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Ventas y Cajas</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.customers}
                                        onChange={(e) => setResetOptions({ ...resetOptions, customers: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Directorio de Clientes</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.products}
                                        onChange={(e) => setResetOptions({ ...resetOptions, products: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Catálogo de Productos</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.workers}
                                        onChange={(e) => setResetOptions({ ...resetOptions, workers: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Trabajadores (Excepto Dueño)</span>
                                    </div>
                                </label>
                            </div>

                            <button
                                onClick={() => setResetOptions({ sales: true, customers: true, products: true, workers: true })}
                                className="w-full mb-6 py-2 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
                            >
                                Seleccionar Todo (Factory Reset)
                            </button>

                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                                <label className="text-xs font-bold text-red-800 dark:text-red-200 mb-2 block">
                                    Para confirmar, escribe "ELIMINAR"
                                </label>
                                <input
                                    type="text"
                                    value={resetConfirmation}
                                    onChange={(e) => setResetConfirmation(e.target.value)}
                                    placeholder="ELIMINAR"
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowResetModal(false);
                                        setResetConfirmation('');
                                        setResetOptions({ sales: false, customers: false, products: false, workers: false });
                                    }}
                                    className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleResetData}
                                    disabled={resetConfirmation !== 'ELIMINAR' || isResetting}
                                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isResetting ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        'Confirmar Borrado'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
