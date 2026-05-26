// @ts-nocheck
import { useAuthStore, selectIsAdmin } from '@shared/store/useAuthStore';
import { useNavigate } from 'react-router-dom';

interface AdminGuardProps {
    children: React.ReactNode;
}

/**
 * AdminGuard — wraps any route that requires admin (or super_admin) role.
 * Non-admin users are shown a friendly "access denied" screen with a back button.
 * Admins see the wrapped children normally.
 */
export const AdminGuard = ({ children }: AdminGuardProps) => {
    const isAdmin = useAuthStore(selectIsAdmin);
    const navigate = useNavigate();

    if (isAdmin) return <>{children}</>;

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-10 max-w-md w-full">
                <div className="h-20 w-20 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
                    <span className="material-symbols-outlined !text-5xl">lock_person</span>
                </div>

                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    Acceso Restringido
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
                    Esta sección requiere permisos de <strong>Administrador</strong>.
                    Si necesitas acceso, contacta al administrador del sistema.
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-[0.98]"
                    >
                        Volver
                    </button>
                    <button
                        onClick={() => navigate('/pos')}
                        className="flex-[2] py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-[0.98]"
                    >
                        Ir al POS
                    </button>
                </div>
            </div>
        </div>
    );
};
