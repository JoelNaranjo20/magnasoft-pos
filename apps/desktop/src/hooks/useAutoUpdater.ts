import { useEffect, useState } from 'react';

export type UpdateStatus =
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error'
    | 'dev';

export interface UpdateState {
    status: UpdateStatus;
    version?: string;
    percent?: number;
    message?: string;
}

export function useAutoUpdater() {
    const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });

    useEffect(() => {
        const api = (window as any).electronAPI;
        if (!api?.onUpdateStatus) return; // Not running inside Electron

        // Listen to update events from main process
        api.onUpdateStatus((data: UpdateState) => {
            setUpdateState(data);
        });

        // Cleanup listener on unmount
        return () => {
            api.removeUpdateListener?.();
        };
    }, []);

    const checkForUpdates = async () => {
        const api = (window as any).electronAPI;
        if (!api?.checkForUpdates) return;
        setUpdateState({ status: 'checking' });
        await api.checkForUpdates();
    };

    const quitAndInstall = () => {
        const api = (window as any).electronAPI;
        api?.quitAndInstall?.();
    };

    return { updateState, checkForUpdates, quitAndInstall };
}
