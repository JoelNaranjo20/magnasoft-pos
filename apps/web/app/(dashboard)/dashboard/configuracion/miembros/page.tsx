'use client';

import { useState } from 'react';
import { useMembers, Member } from '@/app/hooks/useMembers';
import InviteModal from './InviteModal';
import MemberModal from './MemberModal';

export default function MembersPage() {
    const {
        members,
        invitations,
        loading,
        error,
        updateMemberRole,
        sendInvitation,
        cancelInvitation,
        removeMember,
        refresh
    } = useMembers();
    const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);

    const handleInvite = async (email: string, role: string) => {
        const result = await sendInvitation(email, role);
        if (!result.success) {
            alert('Error al enviar invitación: ' + (result.error as any)?.message);
        }
    };

    const handleCancelInvitation = async (id: string) => {
        if (confirm('¿Estás seguro de que deseas cancelar esta invitación?')) {
            const result = await cancelInvitation(id);
            if (!result.success) {
                alert('Error al cancelar invitación');
            }
        }
    };

    const handleRemoveMember = async (id: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar este miembro?')) {
            const result = await removeMember(id);
            if (!result.success) {
                alert('Error al eliminar miembro');
            }
        }
    };

    const handleUpdateMember = async (id: string, newRole: string) => {
        const result = await updateMemberRole(id, newRole);
        if (!result.success) {
            alert('Error al actualizar el rol del miembro');
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin':
                return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
            case 'manager':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            case 'worker':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800';
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Cargando miembros...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 ">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Activos ({members.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pending'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Invitaciones ({invitations.length})
                    </button>
                </div>

                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20"
                >
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                    Invitar Miembro
                </button>
            </div>

            {/* Members List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Usuario</th>
                                <th className="px-6 py-4 font-semibold">Rol</th>
                                <th className="px-6 py-4 font-semibold">Fecha de Registro</th>
                                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {activeTab === 'active' ? (
                                members.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                            No hay miembros activos.
                                        </td>
                                    </tr>
                                ) : (
                                    members.map((member) => (
                                        <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-slate-200 dark:border-slate-600">
                                                        {member.full_name ? member.full_name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 dark:text-white">
                                                            {member.full_name || 'Sin Nombre'}
                                                        </span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">{member.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRoleBadgeColor(member.role)}`}>
                                                    {member.role === 'admin' ? 'Administrador' :
                                                        member.role === 'manager' ? 'Gestor' :
                                                            member.role === 'worker' ? 'Operario' :
                                                                member.role || 'Usuario'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                {new Date(member.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setEditingMember(member)}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveMember(member.id)}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )
                            ) : (
                                invitations.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                            No hay invitaciones pendientes.
                                        </td>
                                    </tr>
                                ) : (
                                    invitations.map((invite) => (
                                        <tr key={invite.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 dark:text-white">{invite.email}</span>
                                                    <span className="text-xs text-slate-400 italic">Pendiente de aceptación</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRoleBadgeColor(invite.role)}`}>
                                                    {invite.role === 'admin' ? 'Administrador' :
                                                        invite.role === 'manager' ? 'Gestor' :
                                                            invite.role === 'worker' ? 'Operario' :
                                                                invite.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                {new Date(invite.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleCancelInvitation(invite.id)}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">cancel</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <InviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onInvite={handleInvite}
            />

            <MemberModal
                isOpen={!!editingMember}
                onClose={() => setEditingMember(null)}
                member={editingMember}
                onUpdate={handleUpdateMember}
            />
        </div>
    );
}
