import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';

interface ConfigGuardProps {
    children: React.ReactNode;
    moduleId: string;
}

export const ConfigGuard = ({ children, moduleId }: ConfigGuardProps) => {
    const isConfigAuthenticated = useSessionStore((state) => state.isConfigAuthenticated);
    const setConfigAuthenticated = useSessionStore((state) => state.setConfigAuthenticated);
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
                setConfigAuthenticated(true);
            } else {
                setError('PIN incorrecto.');
            }
        } catch (err: any) {
            setError(err.message || 'Error de validación.');
        } finally {
            setLoading(false);
        }
    };

    if (!isProtected || isConfigAuthenticated) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-700 space-y-8 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-primary text-3xl">lock</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Acceso Restringido</h2>
                    <p className="text-slate-500 text-sm font-medium">Ingresa el PIN de administrador para continuar.</p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                    <div className="space-y-2">
                        <input
                            type="password"
                            inputMode="numeric"
                            autoFocus
                            required
                            placeholder="····"
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            className="w-full px-4 py-5 text-center text-4xl tracking-[0.5em] font-black bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-primary outline-none transition-all dark:text-white"
                            maxLength={8}
                        />
                        {error && (
                            <p className="text-rose-500 text-xs font-bold text-center mt-2">{error}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !pin}
                        className="w-full py-5 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black text-lg shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">verified_user</span>
                                Verificar
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
