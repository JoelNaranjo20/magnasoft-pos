'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';

export default function RootDispatcher() {
  const { isAuthenticated, profile, loading, logout } = useAuth();
  const router = useRouter();

  // 1. Manejar redirecciones
  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && profile) {
      // 0. Security Check: Account Status
      const accountStatus = profile.account_status || 'pending';

      if (accountStatus === 'pending' || accountStatus === 'suspended') {
        router.replace('/approval-pending');
        return;
      }

      const saasRole = String(profile.saas_role || '').toLowerCase().trim();
      const normalRole = String(profile.role || '').toLowerCase().trim();
      const isSuperAdmin = saasRole === 'super_admin' || normalRole === 'super_admin';

      // 2. SUPER ADMIN DISPATCH
      if (isSuperAdmin) {
        router.replace('/saas');
        return;
      }

      // 3. BUSINESS OWNER DISPATCH
      const status = profile.business?.status;

      if (!status || status === 'pending' || status === 'suspended' || status === 'pending_approval') {
        router.replace('/dashboard/downloads');
        return;
      }

      router.replace('/dashboard');
    }
  }, [isAuthenticated, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si no está autenticado, redirigimos al login (ahora manejado en setEffect pero retenemos el null para no hacer flush de ui no deseada)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
      </div>
    );
  }

  // Si está autenticado pero no hay perfil tras cargar (problema de sincronización)
  // Mostramos una pantalla con un botón manual para evitar bucles de redirección
  if (isAuthenticated && !profile && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-8 text-center animate-in fade-in duration-500">
        <div className="size-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-rose-500/10">
          <span className="material-symbols-outlined text-rose-500 text-4xl">lock_person</span>
        </div>
        <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Falta de Permisos</h2>
        <p className="text-slate-400 max-w-md mb-8">No pudimos sincronizar tu cuenta correctamente. Esto ocurre si hubo un problema al crear tu perfil o si no tienes permisos de acceso.</p>

        <button
          onClick={async () => {
            await logout();
            router.replace('/');
          }}
          className="px-10 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center gap-3"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Regresar al Inicio
        </button>

        <p className="mt-8 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Seguridad MagnaSoft</p>
      </div>
    );
  }

  // Mientras se procesan las redirecciones de los useEffects
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
      <p className="text-white font-mono text-xs">Auth: {isAuthenticated ? 'Yes' : 'No'} | Profile: {profile ? 'Yes' : 'No'} | Loading: {loading ? 'Yes' : 'No'}</p>
      {profile && (
        <pre className="text-slate-500 text-[10px] mt-4 max-w-md overflow-auto p-4 bg-slate-900 rounded-xl">
          {JSON.stringify({
            saasRole: profile.saas_role,
            role: profile.role,
            accountStatus: profile.account_status,
            businessStatus: profile?.business?.status,
            businessSlug: profile?.business?.slug
          }, null, 2)}
        </pre>
      )}
    </div>
  );
}
