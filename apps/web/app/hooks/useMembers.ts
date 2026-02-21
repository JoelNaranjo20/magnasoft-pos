'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export interface Member {
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
    updated_at: string;
}

export interface Invitation {
    id: string;
    email: string;
    role: string;
    status: 'pending' | 'accepted' | 'expired';
    created_at: string;
}

export function useMembers() {
    const [members, setMembers] = useState<Member[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const fetchMembers = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch profiles
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesError) throw profilesError;
            setMembers(profiles || []);

            // Fetch invitations
            const { data: invites, error: invitesError } = await supabase
                .from('invitations')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (invitesError) {
                // If table doesn't exist yet or other error, we handle it
                console.warn('Invitations table might not be ready or error:', invitesError);
            } else {
                setInvitations(invites || []);
            }

        } catch (err: any) {
            console.error('Error fetching members:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const sendInvitation = async (email: string, role: string) => {
        try {
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const { data, error } = await supabase
                .from('invitations')
                .insert([
                    {
                        email,
                        role,
                        token,
                        status: 'pending',
                        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            setInvitations(prev => [data, ...prev]);
            return { success: true };
        } catch (err) {
            console.error('Error sending invitation:', err);
            return { success: false, error: err };
        }
    };

    const cancelInvitation = async (invitationId: string) => {
        try {
            const { error } = await supabase
                .from('invitations')
                .delete()
                .eq('id', invitationId);

            if (error) throw error;

            setInvitations(prev => prev.filter(i => i.id !== invitationId));
            return { success: true };
        } catch (err) {
            console.error('Error cancelling invitation:', err);
            return { success: false, error: err };
        }
    };

    const updateMemberRole = async (memberId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole, updated_at: new Date().toISOString() })
                .eq('id', memberId);

            if (error) throw error;

            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
            return { success: true };
        } catch (err) {
            console.error('Error updating member role:', err);
            return { success: false, error: err };
        }
    };

    const removeMember = async (memberId: string) => {
        try {
            // In a real app, you might want to call a server-side function to delete the auth user too
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', memberId);

            if (error) throw error;

            setMembers(prev => prev.filter(m => m.id !== memberId));
            return { success: true };
        } catch (err) {
            console.error('Error removing member:', err);
            return { success: false, error: err };
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    return {
        members,
        invitations,
        loading,
        error,
        refresh: fetchMembers,
        sendInvitation,
        cancelInvitation,
        updateMemberRole,
        removeMember
    };
}
