// @ts-nocheck
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

interface AnnualDeletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    year: number;
    onSuccess: () => void;
}

export const AnnualDeletionModal = ({ isOpen, onClose, year, onSuccess }: AnnualDeletionModalProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'confirm' | 'processing' | 'success'>('confirm');
    const [progressLog, setProgressLog] = useState<string[]>([]);
    const [confirmationText, setConfirmationText] = useState('');

    const addLog = (msg: string) => setProgressLog(prev => [...prev, msg]);

    const handleProcess = async () => {
        if (confirmationText !== `BORRAR ${year}`) return;

        setIsProcessing(true);
        setStep('processing');
        setProgressLog([]);
        addLog(`Iniciando proceso de archivado para el año ${year}...`);

        try {
            const startDate = `${year}-01-01 00:00:00`;
            const endDate = `${year}-12-31 23:59:59`;

            // 1. Identify Sessions to Archive
            addLog('Identificando sesiones a archivar...');
            const { data: sessions, error: fetchError } = await supabase
                .from('cash_sessions')
                .select('id')
                .gte('opened_at', startDate)
                .lte('opened_at', endDate);

            if (fetchError) throw fetchError;

            if (!sessions || sessions.length === 0) {
                addLog('No se encontraron sesiones para este año.');
                setStep('success');
                setIsProcessing(false);
                return;
            }

            const sessionIds = sessions.map(s => s.id);
            addLog(`Encontradas ${sessionIds.length} sesiones.`);

            // 2. Unlink Sales (Set session_id to NULL)
            // Ideally we should process in batches if there are too many, but Supabase handles reasonably large sets.
            addLog('Desvinculando ventas de las sesiones (Protección de Datos)...');

            // Note: Since Supabase API doesn't support "UPDATE where IN array" directly for a single value update efficiently without RPC 
            // if the list is huge, we might need a loop or a custom RPC. 
            // However, with client lib we can filter.
            const { error: unlinkError } = await supabase
                .from('sales')
                .update({ session_id: null } as any) // Type cast if needed
                .in('session_id', sessionIds);

            if (unlinkError) throw unlinkError;
            addLog('Ventas desvinculadas correctamente. Historial de clientes asegurado.');

            // 3. Delete Cash Movements
            addLog('Eliminando movimientos de caja detallados...');
            const { error: movementsError } = await supabase
                .from('cash_movements')
                .delete()
                .in('session_id', sessionIds);

            if (movementsError) throw movementsError;
            addLog('Movimientos de caja eliminados.');

            // 4. Delete Cash Sessions
            addLog('Eliminando sesiones de caja...');
            const { error: sessionsError } = await supabase
                .from('cash_sessions')
                .delete()
                .in('id', sessionIds);

            if (sessionsError) throw sessionsError;
            addLog('Sesiones de caja eliminadas.');
            addLog('¡Proceso completado con éxito!');

            setStep('success');
        } catch (error: any) {
            console.error('Error during annual deletion:', error);
            addLog(`ERROR: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-rose-500">warning</span>
                        Consolidar y Archivar {year}
                    </h3>
                </div>

                <div className="p-6">
                    {step === 'confirm' && (
                        <div className="space-y-4">
                            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-xl p-4 text-sm text-rose-800 dark:text-rose-200">
                                <p className="font-bold mb-2">⚠ ¡ACCIÓN IRREVERSIBLE!</p>
                                <ul className="list-disc pl-4 space-y-1 opacity-90">
                                    <li>Se eliminarán permanentemente todas las <strong>Sesiones de Caja</strong> del año {year}.</li>
                                    <li>Se borrarán todos los detalles de <strong>Movimientos de Efectivo</strong> (entradas/salidas manuales).</li>
                                    <li>Las <strong>Ventas y Clientes se MANTENDRÁN</strong>, pero ya no estarán agrupadas por "Turno".</li>
                                    <li>Esta acción libera espacio y acelera el sistema.</li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    Para confirmar, escriba "BORRAR {year}"
                                </label>
                                <input
                                    type="text"
                                    value={confirmationText}
                                    onChange={(e) => setConfirmationText(e.target.value)}
                                    placeholder={`BORRAR ${year}`}
                                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-rose-500 rounded-lg outline-none font-bold text-center uppercase"
                                />
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="space-y-4 text-center py-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-primary mx-auto"></div>
                            <h4 className="font-bold text-slate-900 dark:text-white">Procesando limpieza...</h4>
                            <div className="bg-slate-950 text-emerald-400 font-mono text-xs text-left p-3 rounded-lg h-32 overflow-y-auto custom-scrollbar">
                                {progressLog.map((log, i) => (
                                    <div key={i}>{'>'} {log}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl">check</span>
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¡Año {year} Archivado!</h4>
                            <p className="text-slate-500">La base de datos se ha optimizado correctamente.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end gap-3">
                    {step === 'confirm' && (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleProcess}
                                disabled={confirmationText !== `BORRAR ${year}` || isProcessing}
                                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
                            >
                                <span>Ejecutar Limpieza</span>
                                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                            </button>
                        </>
                    )}

                    {step === 'processing' && (
                        <button disabled className="px-4 py-2 text-slate-400 font-bold cursor-wait">
                            Por favor espere...
                        </button>
                    )}

                    {step === 'success' && (
                        <button
                            onClick={onSuccess}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            Finalizar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
