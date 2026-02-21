// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@shared/store/useAuthStore';

export const SetupWizard = () => {
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [step, setStep] = useState<'serial' | 'details'>('serial');

    // Step 1: Serial
    const [serial, setSerial] = useState('');
    const [serialError, setSerialError] = useState('');
    const [validCodeData, setValidCodeData] = useState<any>(null); // To store checked code info

    // Step 2: Details
    const [businessName, setBusinessName] = useState('');
    const [businessType, setBusinessType] = useState('car_wash');
    const [address, setAddress] = useState('');
    const [location, setLocation] = useState('');
    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const [logo, setLogo] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleValidateSerial = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSerialError('');
        setStatusMessage('Verificando serial...');

        try {
            // Trim and uppercase
            const cleanSerial = serial.trim().toUpperCase();

            const { data, error } = await supabase
                .from('activation_codes')
                .select('*, business_id')
                .eq('code', cleanSerial)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                setSerialError('Serial no válido. Verifica e intenta nuevamente.');
                setLoading(false);
                return;
            }

            if (data.status === 'activated') {
                setSerialError('Este serial ya ha sido utilizado.');
                setLoading(false);
                return;
            }

            // Valid!
            setValidCodeData(data);
            setStatusMessage('Serial Válido');
            setTimeout(() => {
                setStep('details');
                setLoading(false);
            }, 500);

        } catch (err: any) {
            console.error(err);
            setSerialError('Error de conexión al verificar serial.');
            setLoading(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFinish = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatusMessage('Configurando tu entorno...');

        try {
            if (pin.length < 4) throw new Error('El PIN debe tener al menos 4 dígitos.');
            if (pin !== confirmPin) throw new Error('Los PINs no coinciden.');

            const businessId = validCodeData?.business_id;

            // Scenario: Code exists, but might not be linked to business if we just generated it
            // Actually, in our Web logic, we LINKED it. So businessId should be there.
            // If not found (edge case), we might need to handle it, but let's assume standard flow.

            if (!businessId) {
                // If the code is generic (unassigned), we would create the business here.
                // But per requirements, the flow started on Web which created the business (pending).
                // So businessId SHOULD be present.
                throw new Error('Error crítico: El serial no está vinculado a un negocio existente.');
            }

            // 1. Update Business Details
            const { error: updateError } = await supabase
                .from('business')
                .update({
                    name: businessName,
                    business_type: businessType === 'car_wash' ? 'automotive' : businessType === 'restaurant' ? 'restaurant' : 'retail',
                    address,
                    location,
                    phone,
                    pin,
                    logo_url: logo,
                    status: 'active', // ACTIVATE BUSINESS
                    module_pos: true,
                    module_inventory: true
                })
                .eq('id', businessId);

            if (updateError) throw updateError;

            // 2. Mark Code as Activated
            await supabase
                .from('activation_codes')
                .update({
                    status: 'activated',
                    activated_at: new Date().toISOString(),
                    hwid: 'desktop-client-initial' // Placeholder
                })
                .eq('id', validCodeData.id);

            // 3. Local Storage Set
            localStorage.setItem('sv_business_id', businessId); // Legacy key support
            localStorage.setItem('ov_business_config', JSON.stringify({
                name: businessName,
                logo: logo,
                setup_complete: true
            }));

            setStatusMessage('¡Todo listo! Iniciando sistema...');

            // Reload to trigger AuthProvider fetch
            setTimeout(() => {
                window.location.href = '/'; // Force reload/nav
            }, 1000);

        } catch (error: any) {
            console.error('Setup Error:', error);
            alert('Error: ' + error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20"></div>
                    <div className="relative z-10">
                        <div className="size-16 mx-auto bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/10">
                            <span className="material-symbols-outlined text-3xl text-white">
                                {step === 'serial' ? 'key' : 'store'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                            {step === 'serial' ? 'Activación' : 'Configuración'}
                        </h1>
                        <p className="text-slate-400 font-medium text-sm mt-1">
                            {step === 'serial' ? 'Ingresa tu licencia para continuar' : 'Personaliza tu experiencia MagnaSoft'}
                        </p>
                    </div>
                </div>

                {step === 'serial' ? (
                    <form onSubmit={handleValidateSerial} className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest pl-1">
                                Serial de Producto
                            </label>
                            <input
                                type="text"
                                required
                                value={serial}
                                onChange={e => setSerial(e.target.value)}
                                placeholder="PRO-202X-XXXX-XXXX"
                                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono text-center text-lg uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
                            />
                            {serialError && (
                                <p className="text-red-500 text-xs font-bold pl-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">error</span>
                                    {serialError}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !serial}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Verificando...' : 'Validar Licencia'}
                            {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleFinish} className="p-8 space-y-5">

                        {/* Logo Upload */}
                        <div className="flex justify-center -mt-2 mb-4">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="size-24 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors overflow-hidden relative group"
                            >
                                {logo ? (
                                    <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-3xl text-slate-400">add_a_photo</span>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-[10px] font-bold uppercase">Cambiar</span>
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest pl-1 mb-1">Nombre del Negocio</label>
                                <input
                                    type="text"
                                    required
                                    value={businessName}
                                    onChange={e => setBusinessName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest pl-1 mb-1">Tipo de Negocio</label>
                                <select
                                    value={businessType}
                                    onChange={e => setBusinessType(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                >
                                    <option value="car_wash">Lavadero Automotriz</option>
                                    <option value="restaurant">Restaurante / Retail</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest pl-1 mb-1">PIN Acceso</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={4}
                                        maxLength={6}
                                        value={pin}
                                        onChange={e => setPin(e.target.value)}
                                        placeholder="Min 4"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center font-mono tracking-widest"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest pl-1 mb-1">Confirmar</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={4}
                                        maxLength={6}
                                        value={confirmPin}
                                        onChange={e => setConfirmPin(e.target.value)}
                                        placeholder="Repetir"
                                        className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-center font-mono tracking-widest ${pin && confirmPin && pin !== confirmPin ? 'border-rose-500' : 'focus:ring-2 focus:ring-indigo-500'}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? statusMessage : 'Finalizar Configuración'}
                            {!loading && <span className="material-symbols-outlined">check_circle</span>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
