import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@shared/store/useAuthStore';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        setSession,
        setProfile,
        setBusiness,
        setLoading,
        isLoading
    } = useAuthStore();

    useEffect(() => {
        // 1. Initialize Session
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    setLoading(false);
                    return;
                }

                setSession(session);
                await refreshProfileAndBusiness(session.user.id);

            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                setLoading(false);
            }
        };

        const refreshProfileAndBusiness = async (userId: string) => {
            try {
                // Fetch Profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*, business:business(*)')
                    .eq('id', userId)
                    .single();

                if (profileError || !profileData) {
                    console.error('Error fetching profile:', profileError);
                    return;
                }

                const profile = profileData as any;
                setProfile(profile);

                // Security Check: Account Status
                const accountStatus = profile.account_status || 'active'; // Fallback to active if not set
                if (accountStatus === 'pending' || accountStatus === 'suspended') {
                    if (location.pathname !== '/approval-pending') {
                        navigate('/approval-pending');
                    }
                    return;
                }

                // Update Business from profile relation
                if (profile.business) {
                    setBusiness(profile.business as any);
                    localStorage.setItem('sv_business_id', profile.business.id);
                } else if (profile.business_id) {
                    // Fallback: fetch separately if join failed or was not desired
                    const { data: business } = await supabase
                        .from('business')
                        .select('*')
                        .eq('id', profile.business_id)
                        .single();
                    if (business) {
                        setBusiness(business as any);
                        localStorage.setItem('sv_business_id', business.id);
                    }
                }

            } catch (err) {
                console.error('Refresh profile/business error:', err);
            }
        };

        initAuth();

        // Listener for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setProfile(null);
                setBusiness(null);
                navigate('/login');
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                setSession(session);
                if (session?.user) {
                    await refreshProfileAndBusiness(session.user.id);
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [navigate, location.pathname]);

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium animate-pulse">Iniciando Magnasoft...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
