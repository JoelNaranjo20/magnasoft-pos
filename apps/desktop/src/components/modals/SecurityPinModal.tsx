import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSessionStore } from '@shared/store/useSessionStore';

interface SecurityPinModalProps {
    onSuccess: () => void;
    onCancel: () => void;
    title?: string;
    description?: string;
}

export const SecurityPinModal = ({
    onSuccess,
    onCancel,
    title = 'Acceso Restringido',
    description = 'Ingrese el PIN Maestro del negocio para continuar.'
}: SecurityPinModalProps) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(false);

    const handlePinCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        setChecking(true);
        setError('');

        try {
            const businessId = localStorage.getItem('sv_business_id');
            const { data } = await (supabase as any)
                .from('business')
                .select('pin')
                .eq('id', businessId)
                .maybeSingle();

            if (data && data.pin === pin) {
                // Synchronize config authentication state for this session
                useSessionStore.getState().setConfigAuthenticated(true);
                onSuccess();
            } else {
                setError('PIN Maestro incorrecto');
                setPin('');
            }
        } catch (err) {
            console.error(err);
            setError('Error verificando PIN');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onCancel}
            />

            <div className="relative bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md text-center animate-in zoom-in-95 duration-300">
                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-6">
                    <span className="material-symbols-outlined !text-4xl text-primary">lock</span>
                </div>

                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{title}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">{description}</p>

                <form onSubmit={handlePinCheck} className="space-y-6">
                    <div className="relative">
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="••••"
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-center text-3xl font-bold tracking-[0.5em] focus:border-primary outline-none transition-all dark:text-white"
                            autoFocus
                            maxLength={8}
                        />
                    </div>

                    {error && (
                        <div className="text-rose-500 text-xs font-bold bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl animate-pulse">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-[0.98]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={checking || pin.length < 4}
                            className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {checking ? 'Verificando...' : 'Desbloquear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
