'use client';

// Reusing the existing InstallationHub component for the downloads page
import InstallationHub from '@/app/(dashboard)/dashboard/InstallationHub';
import { useAuth } from '@/app/context/AuthContext';

export default function DownloadsPage() {
    const { user } = useAuth();

    return (
        <div className="p-6">
            <InstallationHub user={user} />
        </div>
    );
}
