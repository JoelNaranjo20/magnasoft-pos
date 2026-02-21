import { useAuthStore } from '@shared/store/useAuthStore';
import { PrePOSLayout } from './PrePOSLayout';
import { Outlet } from 'react-router-dom';

export const AppLayout = () => {
    const { business, isLoading } = useAuthStore();

    if (isLoading) return null; // Or a spinner, but AuthProvider handles initial load

    if (!business) {
        // Fallback or specific case where no business is loaded yet
        return <Outlet />;
    }

    // THE CHAMELEON LOGIC
    // Unified Layout for all business types
    return (
        <PrePOSLayout>
            <Outlet />
        </PrePOSLayout>
    );
};
