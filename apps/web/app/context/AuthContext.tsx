
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
    isAuthenticated: boolean;
    user: any;
    profile: any;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signUp: (email: string, password: string, fullName: string, businessMetadata?: { business_name: string, business_type: string }) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    loading: boolean;
    isSuperAdmin: boolean;
    accountStatus: 'pending' | 'active' | 'suspended';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    // Add accountStatus state for convenience
    const [accountStatus, setAccountStatus] = useState<'pending' | 'active' | 'suspended'>('pending');

    const fetchProfile = async (userId: string) => {
        try {

            // 1. Fetch Profile (Ultra-Safe array fetch to avoid 406/PGRST116)
            const { data: profileRows, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId);

            if (profileError) {
                console.error('Profile Fetch API Error Detailed:', JSON.stringify(profileError, null, 2));
                // Don't throw immediately, let's see if we can fail gracefully or if it's critical
                throw profileError;
            }

            // Handle missing profile row
            if (!profileRows || profileRows.length === 0) {
                console.warn('Profile row missing in DB for user:', userId);
                setProfile(null);
                return;
            }

            const profileData = profileRows[0];
            let finalProfile = profileData;

            // 2. Fetch Business data separately to avoid joins
            if (profileData?.business_id) {
                const { data: businessData, error: businessError } = await supabase
                    .from('business')
                    .select('*')
                    .eq('id', profileData.business_id)
                    .maybeSingle();

                if (!businessError && businessData) {
                    finalProfile = { ...profileData, business: businessData };
                }
            }

            if (finalProfile) {
                setProfile(finalProfile);
                setAccountStatus(finalProfile.account_status || 'pending');
            } else {
                setProfile(null);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setProfile(null);
        }
    };

    useEffect(() => {
        console.log('AuthContext: Initializing session check...');
        const getSession = async () => {
            try {
                setLoading(true);
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                console.log('AuthContext: Session retrieved:', !!session);
                if (session) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                } else {
                    setUser(null);
                    setProfile(null);
                }
            } catch (error) {
                console.error('Session check failed:', error);
                setUser(null);
                setProfile(null);
            } finally {
                console.log('AuthContext: getSession finished.');
                setLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('AuthContext: Auth State Change Event:', event, !!session);

            // Ignore INITIAL_SESSION and redundant SIGNED_IN events to prevent loops
            if (event === 'INITIAL_SESSION') {
                console.log('AuthContext: Ignoring INITIAL_SESSION (already handled by getSession)');
                return;
            }

            // Handle sign out immediately
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setLoading(false);
                return;
            }

            // Only process SIGNED_IN if we don't already have this user
            if (event === 'SIGNED_IN' && session) {
                setUser((prev: any) => {
                    if (prev?.id === session.user.id) {
                        console.log('AuthContext: Ignoring redundant SIGNED_IN for same user');
                        return prev;
                    }
                    // New user, fetch profile
                    setLoading(true);
                    fetchProfile(session.user.id).finally(() => setLoading(false));
                    return session.user;
                });
                return;
            }

            // Handle TOKEN_REFRESHED without re-fetching profile
            if (event === 'TOKEN_REFRESHED') {
                console.log('AuthContext: Token refreshed, no profile refetch needed');
                return;
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Safety timeout to ensure loading doesn't hang forever
    useEffect(() => {
        if (loading) {
            const t = setTimeout(() => {
                console.warn('AuthContext: Loading safety timeout reached (3s). Forcing loading = false.');
                setLoading(false);
            }, 3000);
            return () => clearTimeout(t);
        }
    }, [loading]);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    };

    const signUp = async (email: string, password: string, fullName: string, businessMetadata?: { business_name: string, business_type: string }): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        business_name: businessMetadata?.business_name,
                        business_type: businessMetadata?.business_type
                    }
                }
            });
            if (error) throw error;

            // Auto-login happens if email confirmation is disabled
            if (data.user) {
                // We update the local user state immediately to trigger redirects
                setUser(data.user);
            }

            return { success: true };
        } catch (error: any) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
        } catch (error) {
            console.error('Error logging out:', error);
        } finally {
            setLoading(false);
        }
    };

    const saasRole = String(profile?.saas_role || '').toLowerCase().trim();
    const normalRole = String(profile?.role || '').toLowerCase().trim();
    const isSuperAdmin = saasRole === 'super_admin' || normalRole === 'super_admin';

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, profile, login, signUp, logout, loading, isSuperAdmin, accountStatus }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
