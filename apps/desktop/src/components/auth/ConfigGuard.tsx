import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface ConfigGuardProps {
    children: React.ReactNode;
    moduleId: string;
}

export const ConfigGuard = ({ children, moduleId }: ConfigGuardProps) => {
    // Local state: resets to false every time the component mounts (= every module visit)
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const protectedModules = useBusinessStore((state) => state.protectedModules);

    const isProtected = protectedModules.includes(moduleId);

    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const businessId = useBusinessStore.getState().id;
            const { data: businessInfo, error: fetchError } = await (supabase.from('business') as any)
                .select('pin')
                .eq('id', businessId)
                .single();

            if (fetchError || !businessInfo) {
                throw new Error('No se pudo verificar el PIN.');
            }

            if (pin === (businessInfo as any).pin) {
                setIsAuthenticated(true);
            } else {
                setError('PIN incorrecto.');
                setPin('');
            }
        } catch (err: any) {
            setError(err.message || 'Error de validación.');
        } finally {
            setLoading(false);
        }
    };

    if (!isProtected || isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white dark:bg-[#0d1527] rounded-[2.5rem] p-8 shadow-2xl border border-slate-200/50 dark:border-white/5 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-md text-white">
                        <span className="material-symbols-outlined text-2xl">lock</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight leading-none mt-2">Acceso Restringido</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-widest mt-1">Ingresa tu PIN Maestro</p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                    <div className="space-y-2">
                        <input
                            type="password"
                            inputMode="numeric"
                            autoFocus
                            required
                            placeholder="••••"
                            value={pin}
                            onChange={e => {
                                setPin(e.target.value.replace(/\D/g, ''));
                                setError('');
                            }}
                            className="w-full px-4 py-3.5 text-center text-3xl tracking-[0.4em] font-semibold bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 rounded-2xl focus:border-primary outline-none transition-all dark:text-white"
                            maxLength={8}
                        />
                        {error && (
                            <p className="text-rose-500 text-[11px] font-semibold text-center mt-2">{error}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !pin}
                        className="w-full py-4.5 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-600/95 text-white rounded-2xl font-semibold text-xs shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                                Verificar PIN
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
