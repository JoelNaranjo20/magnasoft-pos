import { useAutoUpdater } from '../hooks/useAutoUpdater';
import { Download, RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export function UpdateNotification() {
    const { updateState, quitAndInstall } = useAutoUpdater();
    const [dismissed, setDismissed] = useState(false);

    // Nothing to show
    if (dismissed) return null;
    if (updateState.status === 'idle' || updateState.status === 'not-available' || updateState.status === 'dev') {
        return null;
    }

    const statusConfig: Record<string, { bg: string; border: string; icon: ReactNode; text: string }> = {
        checking: {
            bg: 'bg-blue-950/80',
            border: 'border-blue-500/40',
            icon: <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />,
            text: 'Buscando actualizaciones...',
        },
        available: {
            bg: 'bg-blue-950/80',
            border: 'border-blue-500/40',
            icon: <Download className="w-4 h-4 text-blue-400" />,
            text: `Nueva versión ${updateState.version ?? ''} disponible. Descargando...`,
        },
        downloading: {
            bg: 'bg-blue-950/80',
            border: 'border-blue-500/40',
            icon: <Download className="w-4 h-4 text-blue-400 animate-bounce" />,
            text: `Descargando actualización... ${updateState.percent ?? 0}%`,
        },
        downloaded: {
            bg: 'bg-emerald-950/80',
            border: 'border-emerald-500/40',
            icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
            text: `¡Versión ${updateState.version ?? ''} lista! Reinicia para instalarla.`,
        },
        error: {
            bg: 'bg-red-950/80',
            border: 'border-red-500/40',
            icon: <AlertCircle className="w-4 h-4 text-red-400" />,
            text: `Error al actualizar: ${updateState.message ?? 'Error desconocido'}`,
        },
    };

    const config = statusConfig[updateState.status];
    if (!config) return null;

    return (
        <div
            className={`
                fixed bottom-4 right-4 z-50
                flex items-center gap-3 px-4 py-3 rounded-xl
                border backdrop-blur-md shadow-2xl
                text-sm text-white
                transition-all duration-300 ease-out
                max-w-sm w-full
                ${config.bg} ${config.border}
            `}
            role="status"
            aria-live="polite"
        >
            {/* Icon */}
            <div className="flex-shrink-0">{config.icon}</div>

            {/* Text + progress */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{config.text}</p>

                {/* Download progress bar */}
                {updateState.status === 'downloading' && typeof updateState.percent === 'number' && (
                    <div className="mt-1.5 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="h-full bg-blue-400 rounded-full transition-all duration-300"
                            style={{ width: `${updateState.percent}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Action button for "downloaded" state */}
            {updateState.status === 'downloaded' && (
                <button
                    onClick={quitAndInstall}
                    className="
                        flex-shrink-0 px-3 py-1.5 rounded-lg
                        bg-emerald-500 hover:bg-emerald-400
                        text-white text-xs font-semibold
                        transition-colors duration-150
                        whitespace-nowrap
                    "
                >
                    Reiniciar ahora
                </button>
            )}

            {/* Dismiss button (only for non-critical states) */}
            {(updateState.status === 'checking' || updateState.status === 'error') && (
                <button
                    onClick={() => setDismissed(true)}
                    className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors duration-150"
                    aria-label="Cerrar notificación"
                >
                    <X className="w-3.5 h-3.5 text-white/60" />
                </button>
            )}
        </div>
    );
}
