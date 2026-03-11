import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Invitation = any;

export const useTeam = () => {
    const [members, setMembers] = useState<Profile[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;
            setMembers(data || []);
        } catch (err: any) {
            console.error('Error fetching members:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchInvitations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await (supabase as any)
                .from('invitations')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setInvitations(data || []);
        } catch (err: any) {
            console.error('Error fetching invitations:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const inviteMember = async (email: string, role: string) => {
        setLoading(true);
        setError(null);
        try {
            // Check if profile already exists
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (existingProfile) {
                throw new Error('Este usuario ya es parte del equipo.');
            }

            // Generate a simple token (in a real app, this would be more secure)
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            const { error: inviteError } = await (supabase as any).from('invitations')
                .insert([{
                    email,
                    role,
                    token,
                    status: 'pending',
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                }]);

            if (inviteError) throw inviteError;

            await fetchInvitations();
            return true;
        } catch (err: any) {
            console.error('Error inviting member:', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const revokeInvitation = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const { error: revokeError } = await (supabase as any)
                .from('invitations')
                .delete()
                .eq('id', id);

            if (revokeError) throw revokeError;

            setInvitations(prev => prev.filter(inv => inv.id !== id));
            return true;
        } catch (err: any) {
            console.error('Error revoking invitation:', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateMemberRole = async (id: string, role: string) => {
        setLoading(true);
        setError(null);
        try {
            const { error: updateError } = await (supabase.from('profiles') as any)
                .update({ role })
                .eq('id', id);

            if (updateError) throw updateError;

            setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
            return true;
        } catch (err: any) {
            console.error('Error updating role:', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const removeMember = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            // Note: In Supabase/Auth, we might also want to delete the user from auth.users
            // but typical RLS only allows deleting FROM profiles.
            const { error: deleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            setMembers(prev => prev.filter(m => m.id !== id));
            return true;
        } catch (err: any) {
            console.error('Error removing member:', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        members,
        invitations,
        loading,
        error,
        fetchMembers,
        fetchInvitations,
        inviteMember,
        revokeInvitation,
        updateMemberRole,
        removeMember
    };
};
