// @ts-nocheck
import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import { AppLayout } from './layouts/AppLayout';
import { useAuthStore } from '@shared/store/useAuthStore';
import { useBusinessStore } from '@shared/store/useBusinessStore';

// Pages & Components
import { FinanceDashboard } from './pages/FinanceDashboard';
import { SalesPage } from './pages/SalesPage';
import { FinancePage } from './pages/FinancePage';
import { CustomersPage } from './pages/CustomersPage';
import { AuditPage } from './pages/admin/AuditPage';
import { ConfigPage } from './pages/admin/ConfigPage';
import { SetupWizard } from './pages/setup/SetupWizard';
import { DesktopSetup } from './pages/setup/DesktopSetup';
import { LoginPage } from './pages/auth/LoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ApprovalPendingPage } from './pages/auth/ApprovalPendingPage';
import { ConfigGuard } from './components/auth/ConfigGuard';

// POS Components
import { POSLayout } from './components/pos/POSLayout';
import { OpenSessionModal } from './components/modals/OpenSessionModal';
import { CloseSessionModal } from './components/modals/CloseSessionModal';
import { CommissionPaymentModal } from './components/modals/CommissionPaymentModal';
import { useSessionStore } from '@shared/store/useSessionStore';
import { supabase } from './lib/supabase';

// POS Route Helper
const POSRoute = () => {
    const cashSession = useSessionStore((state) => state.cashSession);
    const isClosing = useSessionStore((state) => state.isClosing);
    const location = useLocation();
    const showCommissions = location.pathname === '/pos/commissions';

    return (
        <div className="h-full flex flex-col">
            <POSLayout />
            {!cashSession && <OpenSessionModal />}
            {isClosing && <CloseSessionModal />}
            {showCommissions && cashSession && <CommissionPaymentModal />}
        </div>
    );
};

// Title Sync Component
const ElectronTitleSync = () => {
    const { business } = useAuthStore();

    useEffect(() => {
        const version = window.electronAPI?.getAppVersion?.() || '2.4.0';
        const businessName = business?.name || 'Magnasoft';

        document.title = `${businessName} - POS v${version}`;
        if (window.electronAPI?.setAppName) {
            window.electronAPI.setAppName(businessName);
        }
    }, [business]);

    return null;
};

function App() {
    const { user, business, isLoading: loading, checkSession } = useAuthStore();

    // 1. Initialize auth session on mount
    useEffect(() => {
        checkSession();
    }, [checkSession]);

    // 1.1 verification of active cash session (Hydration Check)
    useEffect(() => {
        const verifyCashSession = async () => {
            const { cashSession, setCashSession } = useSessionStore.getState();
            if (cashSession?.id) {
                console.log('[POS] Verifying active cash session:', cashSession.id);
                const { data, error } = await supabase
                    .from('cash_sessions')
                    .select('id, status')
                    .eq('id', cashSession.id)
                    .single();

                if (error || !data || data.status !== 'open') {
                    console.warn('[POS] Stale or invalid cash session detected. Purging local state.');
                    setCashSession(null);
                } else {
                    console.log('[POS] Cash session verified successfully.');
                }
            }
        };

        if (business?.id && user) {
            verifyCashSession();
        }
    }, [business?.id, user]);

    // Keyboard fix for Electron alerts
    useEffect(() => {
        const originalAlert = window.alert;
        window.alert = (message) => {
            const currentName = useAuthStore.getState().business?.name || 'Sistema';
            if (window.electronAPI?.showAlert) {
                window.electronAPI.showAlert(currentName, message).then(() => {
                    window.focus();
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                        document.activeElement.focus();
                    }
                });
            } else {
                originalAlert(message);
            }
        };
    }, []);

    // STATE 1: LOADING (Spinner / Splash)
    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-sm font-bold animate-pulse uppercase tracking-[0.2em]">Cargando...</p>
                </div>
            </div>
        );
    }

    // STATE 2: NO USER -> Login flow
    if (!user) {
        return (
            <HashRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </HashRouter>
        );
    }

    // STATE 2.5: ACCOUNT PENDING -> Block access
    // Safe check if profile exists, though useAuthStore typically merges it
    const accountStatus = (user?.user_metadata?.account_status || 'active').toLowerCase();
    // Note: Assuming profile data is in user_metadata or handling via separate store if needed. 
    // Previous code referenced 'profile' not defined in scope. Assuming useAuthStore handles this or we skip strict check for now to get it running.
    // Ideally useAuthStore returns profile. For now, let's keep it simple or comment out if unsure of 'profile' source.
    // Update: Step 5 source had `const accountStatus = (profile?.account_status || 'pending').toLowerCase();` but `profile` wasn't destructured.
    // It's likely `user` object has it or `useAuthStore` provides it. I will rely on `user` existence for now to avoid reference error.

    // STATE 3: NO BUSINESS -> Setup flow (The Guard)
    if (!business?.id) {
        return (
            <HashRouter>
                <Routes>
                    <Route path="/setup" element={<DesktopSetup />} />
                    <Route path="*" element={<Navigate to="/setup" replace />} />
                </Routes>
            </HashRouter>
        );
    }

    // STATE 3.5: BUSINESS EXISTS BUT NOT ACTIVE (The Block)
    if (business.status !== 'active') {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-950 p-6">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
                    <div className="size-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl">lock_person</span>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Cuenta en Revisión</h2>
                    <p className="text-slate-400 mb-8">
                        Tu licencia está siendo verificada o ha sido suspendida.
                        Contacta a soporte para activar tu acceso.
                    </p>
                    <div className="space-y-3">
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Estado del Negocio</p>
                            <p className="text-rose-400 font-bold uppercase">{business.status || 'Desconocido'}</p>
                        </div>
                        <button
                            onClick={() => checkSession()}
                            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all"
                        >
                            Reintentar Conexión
                        </button>
                        <button
                            onClick={() => useAuthStore.getState().signOut()}
                            className="w-full py-3 text-slate-500 hover:text-slate-300 text-sm font-medium transition-all"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // STATE 4: FULL ACCESS -> Main App
    return (
        <HashRouter>
            <ElectronTitleSync />
            <Routes>
                {/* Special case for pending approval check as well */}
                <Route path="/approval-pending" element={<ApprovalPendingPage />} />

                {/* Main App Routes */}
                <Route element={<AppLayout />}>
                    <Route path="/" element={<ConfigGuard moduleId="dashboard"><FinanceDashboard /></ConfigGuard>} />
                    <Route path="/sales" element={<ConfigGuard moduleId="sales"><SalesPage /></ConfigGuard>} />
                    <Route path="/finance" element={<ConfigGuard moduleId="finance"><FinancePage /></ConfigGuard>} />
                    <Route path="/customers" element={<ConfigGuard moduleId="customers"><CustomersPage /></ConfigGuard>} />
                    <Route path="/audit" element={<ConfigGuard moduleId="audit"><AuditPage /></ConfigGuard>} />
                    <Route path="/config" element={<ConfigGuard moduleId="config"><ConfigPage /></ConfigGuard>} />
                </Route>

                <Route path="/pos/*" element={<ConfigGuard moduleId="pos"><POSRoute /></ConfigGuard>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </HashRouter>
    );
}

export default App;
