import React, { useState, useEffect } from 'react';
import { Users, Mail, UserPlus, ShieldAlert, Trash2, Send, RotateCw, X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../utils/api'; // Assuming you have an axios wrapper or fetch utility
import { useAuth } from '../context/AuthContext';

export default function OrganizationSettings() {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);

    // Invite Form State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [inviting, setInviting] = useState(false);

    // Feedback State
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (user && (user.role === 'owner' || user.role === 'admin')) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [membersRes, invitesRes] = await Promise.all([
                api.get('/orgs/members'),
                api.get('/orgs/invites')
            ]);
            setMembers(membersRes.data);
            setInvites(invitesRes.data);
        } catch (error) {
            showToast('Failed to load organization data', 'error');
            console.error('Error fetching org data:', error);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSendInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setInviting(true);
        try {
            const res = await api.post('/orgs/invites', { email: inviteEmail, role: inviteRole });
            if (res.data.ok) {
                showToast(`Invite sent to ${inviteEmail}`, 'success');
                setInviteEmail('');
                setInviteRole('member');
                fetchData(); // Refresh list to show new invite
            } else {
                showToast(res.data.message || 'Failed to send invite', 'error');
            }
        } catch (error) {
            console.error('Invite error:', error);
            const msg = error.response?.data?.detail?.[0]?.msg || error.response?.data?.detail || 'Rate limit exceeded or error occurred';
            showToast(msg, 'error');
        } finally {
            setInviting(false);
        }
    };

    const handleResendInvite = async (inviteId) => {
        try {
            showToast('Resending invite...', 'success');
            await api.post(`/orgs/invites/${inviteId}/resend`);
            showToast('Invite resent successfully', 'success');
            fetchData();
        } catch (error) {
            showToast('Failed to resend invite', 'error');
            console.error('Resend error:', error);
        }
    };

    const handleRevokeInvite = async (inviteId) => {
        try {
            await api.delete(`/orgs/invites/${inviteId}`);
            showToast('Invite revoked', 'success');
            // Optimistic update
            setInvites(invites.filter(inv => inv.id !== inviteId));
        } catch (error) {
            showToast('Failed to revoke invite', 'error');
            console.error('Revoke error:', error);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;

        try {
            await api.delete(`/orgs/members/${userId}`);
            showToast('Member removed', 'success');
            // Optimistic update
            setMembers(members.filter(m => m.id !== userId));
        } catch (error) {
            const msg = error.response?.data?.detail || 'Failed to remove member';
            showToast(msg, 'error');
            console.error('Remove member error:', error);
        }
    };

    const handleChangeRole = async (userId, newRole) => {
        if (!window.confirm(`Are you sure you want to change role to ${newRole}? If transferring ownership, you will become an admin.`)) return;

        try {
            await api.patch(`/orgs/members/${userId}`, { role: newRole });
            showToast('Role updated successfully', 'success');
            if (newRole === 'owner') {
                // Force a reload or token refresh here if the current user gave up ownership
                window.location.reload();
            } else {
                fetchData();
            }
        } catch (error) {
            const msg = error.response?.data?.detail || 'Failed to change role';
            showToast(msg, 'error');
            console.error('Change role error:', error);
        }
    }


    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
        return (
            <div className="flex flex-col items-center justify-center p-8 min-h-screen text-mist font-sans">
                <ShieldAlert size={48} className="text-rose-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-soft-violet text-center">You do not have permission to view organization settings.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col p-8 min-h-full text-mist font-sans w-full max-w-4xl mx-auto pb-24">

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl animate-in fade-in slide-in-from-top-4 ${toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                    {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Organization Settings</h1>
                <p className="text-soft-violet text-lg">Manage members and invites for your workspace.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Active Members */}
                    <Section title="Active Members" icon={<Users size={18} />}>
                        {loading ? (
                            <div className="p-8 text-center text-soft-violet animate-pulse">Loading members...</div>
                        ) : members.length === 0 ? (
                            <div className="p-8 text-center text-soft-violet">No members found.</div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {members.map(member => (
                                    <MemberRow
                                        key={member.id}
                                        member={member}
                                        currentUser={user}
                                        onRemove={handleRemoveMember}
                                        onChangeRole={handleChangeRole}
                                    />
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* Pending Invites */}
                    <Section title="Pending Invites" icon={<Mail size={18} />}>
                        {loading ? (
                            <div className="p-8 text-center text-soft-violet animate-pulse">Loading invites...</div>
                        ) : invites.length === 0 ? (
                            <div className="p-8 text-center text-soft-violet">No pending invites.</div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {invites.map(invite => (
                                    <InviteRow
                                        key={invite.id}
                                        invite={invite}
                                        onResend={handleResendInvite}
                                        onRevoke={handleRevokeInvite}
                                    />
                                ))}
                            </div>
                        )}
                    </Section>
                </div>

                {/* Sidebar Area */}
                <div className="space-y-6">
                    {/* Invite Form */}
                    <div className="bg-slate rounded-2xl border border-white/5 p-5 shadow-lg relative overflow-hidden">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-royal-amethyst/10 rounded-full blur-[40px] pointer-events-none -translate-y-1/2 translate-x-1/4"></div>

                        <div className="flex items-center gap-2 mb-4 text-white font-semibold">
                            <UserPlus size={18} className="text-royal-amethyst" />
                            <h3>Invite New Member</h3>
                        </div>

                        <form onSubmit={handleSendInvite} className="space-y-4 relative z-10">
                            <div>
                                <label className="block text-xs font-medium text-soft-violet mb-1">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="colleague@company.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full bg-ink/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-royal-amethyst/50 focus:ring-1 focus:ring-royal-amethyst/50 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-soft-violet mb-1">Role</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="w-full bg-ink/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-royal-amethyst/50 focus:ring-1 focus:ring-royal-amethyst/50 transition-all appearance-none"
                                >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                    {/* Only owners can invite other owners (or technically transfer ownership), but we keep simple here */}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={inviting || !inviteEmail}
                                className="w-full flex items-center justify-center gap-2 bg-royal-amethyst hover:bg-royal-amethyst/80 text-white font-medium py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {inviting ? (
                                    <span className="animate-pulse">Sending...</span>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        <span>Send Invite</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Info Card */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 text-sm text-soft-violet">
                        <h4 className="font-semibold text-white flex items-center gap-2 mb-2">
                            <ShieldAlert size={16} className="text-amber-400" />
                            Role Permissions
                        </h4>
                        <ul className="space-y-2 list-inside list-disc opacity-80 pl-1">
                            <li><strong>Members</strong> can run campaigns and view analytics.</li>
                            <li><strong>Admins</strong> can invite peers and manage settings.</li>
                            <li><strong>Owners</strong> govern billing, domains, and transfer ownership.</li>
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    );
}

// --- Subcomponents ---

const Section = ({ title, icon, children }) => (
    <div className="bg-slate rounded-2xl border border-white/5 overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2 bg-white/[0.02]">
            <div className="text-soft-violet">{icon}</div>
            <h3 className="font-bold text-white tracking-wide">{title}</h3>
        </div>
        <div className="p-0">
            {children}
        </div>
    </div>
);

const MemberRow = ({ member, currentUser, onRemove, onChangeRole }) => {
    const isSelf = member.id === currentUser.id;
    const canManageRole = currentUser.role === 'owner' && !isSelf;
    const canRemove = (currentUser.role === 'owner' || currentUser.role === 'admin') && !isSelf && member.role !== 'owner';

    return (
        <div className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-royal-amethyst shrink-0 to-midnight-plum flex items-center justify-center border border-white/10 overflow-hidden">
                    {member.picture ? (
                        <img src={member.picture} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-white font-bold">{member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}</span>
                    )}
                </div>

                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{member.name || 'Unknown User'}</p>
                        {isSelf && <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">You</span>}
                        {member.role === 'owner' && <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Owner</span>}
                    </div>
                    <p className="text-sm text-soft-violet">{member.email}</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {canManageRole ? (
                    <select
                        value={member.role}
                        onChange={(e) => onChangeRole(member.id, e.target.value)}
                        className="bg-ink/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-soft-violet focus:outline-none focus:border-royal-amethyst/50 transition-all cursor-pointer"
                    >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Transfer Ownership</option>
                    </select>
                ) : (
                    <span className="text-xs font-medium text-soft-violet capitalize px-2">{member.role}</span>
                )}

                {canRemove && (
                    <button
                        onClick={() => onRemove(member.id)}
                        className="p-1.5 text-soft-violet hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Remove Member"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};

const InviteRow = ({ invite, onResend, onRevoke }) => {
    const isExpired = new Date(invite.expires_at) < new Date();

    return (
        <div className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-soft-violet shrink-0">
                    <Mail size={18} />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{invite.email}</p>
                        <span className="text-[10px] bg-royal-amethyst/10 text-royal-amethyst px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                            {invite.role}
                        </span>
                        {isExpired && (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                                Expired
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-soft-violet mt-1">
                        Invited • Expires: {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onResend(invite.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-royal-amethyst hover:bg-royal-amethyst/10 rounded-lg transition-colors"
                >
                    <RotateCw size={14} />
                    Resend
                </button>
                <button
                    onClick={() => onRevoke(invite.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                    <X size={14} />
                    Revoke
                </button>
            </div>
        </div>
    );
};
