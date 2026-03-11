import { useState, useEffect } from 'react';
import { useAuthStore } from '@shared/store/useAuthStore';
import { supabase } from '@shared/lib/supabase';

interface ActivationCode {
    id: string;
    code: string;
    status: string;
    max_devices: number;
    created_at: string;
    business_id: string | null;
    business?: { name: string };
}

export const AdminDashboard = () => {
    const { signOut, user } = useAuthStore();
    const [codes, setCodes] = useState<ActivationCode[]>([]);
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'licenses' | 'requests'>('licenses');

    // Form State
    const [clientName, setClientName] = useState('');
    const [plan, setPlan] = useState('PRO');
    const [durationMonths, setDurationMonths] = useState(12);
    const [maxDevices, setMaxDevices] = useState(1);

    useEffect(() => {
        fetchCodes();
        fetchPendingUsers();
    }, []);

    const fetchCodes = async () => {
        try {
            const { data, error } = await supabase
                .from('activation_codes')
                .select('*, business:business_id(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCodes(data as any || []);
        } catch (error) {
            console.error('Error fetching codes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPendingUsers = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('account_status', 'pending');

            if (data) setPendingUsers(data);
        } catch (error) {
            console.error('Error fetching pending users:', error);
        }
    };

    const handleApproveUser = async (userId: string) => {
        if (!confirm('¿Aprobar acceso a este usuario?')) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ account_status: 'active' })
                .eq('id', userId);

            if (error) throw error;

            alert('Usuario aprobado.');
            fetchPendingUsers();
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    };

    const handleRejectUser = async (userId: string) => {
        if (!confirm('¿Rechazar (suspender) a este usuario?')) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ account_status: 'suspended' })
                .eq('id', userId);

            if (error) throw error;

            alert('Usuario suspendido.');
            fetchPendingUsers();
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    };

    const generateCode = async () => {
        setIsGenerating(true);
        try {
            const segment1 = Math.random().toString(36).substring(2, 6).toUpperCase();
            const segment2 = Math.random().toString(36).substring(2, 6).toUpperCase();
            const year = new Date().getFullYear();

            const code = `${plan}-${year}-${segment1}-${segment2}`;

            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

            const { data, error } = await supabase
                .from('activation_codes')
                .insert({
                    code,
                    status: 'generated',
                    max_devices: maxDevices,
                    expires_at: expiresAt.toISOString(),
                    created_by: user?.email
                })
                .select()
                .single();

            if (error) throw error;

            setCodes([data as any, ...codes]);
            setClientName('');
        } catch (error) {
            console.error('Error generating code:', error);
            alert('Error al generar licencia');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Código copiado al portapapeles');
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-display">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-8 py-5 flex justify-between items-center sticky top-0 z-10 shadow-xl">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg shadow-purple-500/20">
                            <span className="material-symbols-outlined text-white">admin_panel_settings</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                Magnasoft Admin
                            </h1>
                            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">Panel de Control Global</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={signOut}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 transition-all font-bold text-sm"
                >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Cerrar Sesión
                </button>
            </header>

            <main className="p-8 max-w-7xl mx-auto">
                <div className="flex gap-4 mb-6 border-b border-slate-700">
                    <button
                        onClick={() => setActiveTab('licenses')}
                        className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'licenses' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        Licencias
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'requests' ? 'border-amber-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        Solicitudes Pendientes ({pendingUsers.length})
                    </button>
                </div>

                {activeTab === 'licenses' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl">
                                <div className="flex items-center gap-2 mb-6 text-purple-400">
                                    <span className="material-symbols-outlined">workspace_premium</span>
                                    <h2 className="text-lg font-black uppercase tracking-wide">Generador de Licencias</h2>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Plan / Prefijo</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['BASIC', 'PRO', 'ENT'].map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => setPlan(p)}
                                                    className={`py-2 rounded-lg text-xs font-black transition-all border-2 ${plan === p
                                                        ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/30'
                                                        : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Duración (Meses)</label>
                                        <input
                                            type="number"
                                            value={durationMonths}
                                            onChange={(e) => setDurationMonths(Number(e.target.value))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-purple-500 transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Dispositivos Máximos</label>
                                        <input
                                            type="number"
                                            value={maxDevices}
                                            onChange={(e) => setMaxDevices(Number(e.target.value))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-purple-500 transition-colors"
                                        />
                                    </div>

                                    <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Referencia Visual (No se guarda)</label>
                                        <input
                                            type="text"
                                            placeholder="Nombre del Cliente..."
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                            className="w-full bg-transparent border-none p-0 text-sm text-slate-300 placeholder:text-slate-600 focus:ring-0"
                                        />
                                    </div>

                                    <button
                                        onClick={generateCode}
                                        disabled={isGenerating}
                                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-purple-900/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isGenerating ? (
                                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined">add_circle</span>
                                                Generar Licencia
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                                    <h3 className="text-slate-500 text-xs font-bold uppercase">Total Licencias</h3>
                                    <p className="text-3xl font-black text-white mt-1">{codes.length}</p>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                                    <h3 className="text-slate-500 text-xs font-bold uppercase">Activas</h3>
                                    <p className="text-3xl font-black text-emerald-400 mt-1">
                                        {codes.filter(c => c.status === 'activated').length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
                                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10">
                                    <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                                        <span className="material-symbols-outlined text-blue-400">list_alt</span>
                                        Historial de Licencias
                                    </h2>
                                    <button onClick={fetchCodes} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined">refresh</span>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-0">
                                    {isLoading ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                            <span className="w-8 h-8 border-2 border-slate-600 border-t-purple-500 rounded-full animate-spin mb-4"></span>
                                            Cargando datos...
                                        </div>
                                    ) : codes.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                            <span className="material-symbols-outlined text-4xl mb-2 opacity-30">inbox</span>
                                            No hay licencias generadas
                                        </div>
                                    ) : (
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-900/50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                                                <tr>
                                                    <th className="px-6 py-4">Código / ID</th>
                                                    <th className="px-6 py-4">Estado</th>
                                                    <th className="px-6 py-4">Dispositivos</th>
                                                    <th className="px-6 py-4">Cliente / Uso</th>
                                                    <th className="px-6 py-4 text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700/50">
                                                {codes.map((code) => (
                                                    <tr key={code.id} className="hover:bg-slate-700/30 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-slate-700/50 rounded-lg font-mono text-xs text-purple-300 font-bold tracking-wider select-all">
                                                                    {code.code}
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 mt-1 font-mono">{code.created_at.split('T')[0]}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border ${code.status === 'activated'
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                                }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${code.status === 'activated' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
                                                                {code.status === 'activated' ? 'Activada' : 'Pendiente'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-bold text-slate-300">{code.max_devices} <span className="text-slate-600 text-xs font-normal ml-1">disp.</span></div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {code.business_id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-slate-500">store</span>
                                                                    <span className="text-sm font-bold text-white hover:text-blue-400 transition-colors cursor-pointer" title={code.business_id}>
                                                                        {code.business?.name || 'Negocio Registrado'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-600 text-xs italic">-- Sin asignar --</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => copyToClipboard(code.code)}
                                                                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                                title="Copiar Código"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500">person_add</span>
                            Solicitudes de Ingreso
                        </h2>

                        {pendingUsers.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                                <p>No hay solicitudes pendientes.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingUsers.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between bg-slate-700/50 p-4 rounded-xl border border-slate-600">
                                        <div>
                                            <p className="font-bold text-white">{user.full_name || 'Sin Nombre'}</p>
                                            <p className="text-sm text-slate-400">{user.email}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-600">
                                                    {new Date(user.updated_at || Date.now()).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleRejectUser(user.id)}
                                                className="px-4 py-2 bg-slate-800 hover:bg-rose-900/30 text-rose-400 rounded-lg font-bold text-xs border border-transparent hover:border-rose-800 transition-all"
                                            >
                                                Rechazar
                                            </button>
                                            <button
                                                onClick={() => handleApproveUser(user.id)}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-lg shadow-emerald-900/20 transition-all"
                                            >
                                                Aprobar Acceso
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
