import React, { useState } from 'react';
import { LicenseService } from '../../services/LicenseService';

interface Props {
    onActivated: (businessId: string) => void;
}

export const ActivationScreen: React.FC<Props> = ({ onActivated }) => {
    const [serial, setSerial] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hwid, setHwid] = useState('Cargando...');

    React.useEffect(() => {
        LicenseService.getHWID().then(setHwid);
    }, []);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (serial.length < 5) return;

        setLoading(true);
        setError('');

        const result = await LicenseService.activateSerial(serial);

        if (result.isValid && result.businessId) {
            onActivated(result.businessId);
        } else {
            setError(result.message || 'Error al activar licencia.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 select-none">
            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-4">
                    <div className="size-20 mx-auto bg-sky-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-sky-500/20">
                        <span className="material-symbols-outlined text-4xl">key</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Activación de Software</h1>
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">SISTEMA DE GESTIÓN POS</p>
                    </div>
                </div>

                <form onSubmit={handleActivate} className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-800 shadow-3xl space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2 text-center pb-2 border-b border-slate-800">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ID de Hardware (HWID)</p>
                            <code className="text-[10px] font-mono text-sky-400 bg-sky-400/5 px-3 py-1 rounded-full border border-sky-400/20 tracking-wider">
                                {hwid}
                            </code>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Código de Activación (Serial)</label>
                            <input
                                type="text"
                                required
                                value={serial}
                                onChange={e => setSerial(e.target.value.toUpperCase())}
                                placeholder="SV-XXXX-XXXX-XXXX"
                                className="w-full px-5 py-4 bg-slate-800/50 border-2 border-transparent focus:border-sky-500 rounded-2xl outline-none transition-all text-white font-mono text-center tracking-[0.3em] placeholder:tracking-normal placeholder:font-sans"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 animate-shake">
                            <span className="material-symbols-outlined text-rose-500 text-[20px]">error</span>
                            <p className="text-rose-500 text-[11px] font-bold leading-tight">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || serial.length < 5}
                        className="w-full py-5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-sky-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <div className="animate-spin size-5 border-b-2 border-white rounded-full"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">rocket_launch</span>
                                Activar Ahora
                            </>
                        )}
                    </button>

                    <p className="text-center text-[9px] text-slate-500 font-medium">
                        ¿No tienes un serial? Contacta a tu administrador para adquirir una licencia profesional.
                    </p>
                </form>

                <p className="text-center text-slate-600 text-[9px] font-black uppercase tracking-[0.3em]">
                    © 2026 Joel Naranjo - SaaS Edition
                </p>
            </div>
        </div>
    );
};
