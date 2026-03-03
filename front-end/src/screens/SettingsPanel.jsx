
import React from 'react';
import {
    User,
    Users,
    Bell,
    Moon,
    ShieldCheck,
    HelpCircle,
    Info,
    ChevronRight,
    LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function SettingsPanel({ onNavigate }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleNavigation = (path) => {
        if (onNavigate) {
            onNavigate(path);
        } else {
            navigate(`/${path}`);
        }
    };
    return (
        <div className="flex flex-col p-8 min-h-screen text-mist font-sans w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="mb-8 text-center sm:text-left">
                <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                <p className="text-soft-violet text-lg">Manage your account and preferences.</p>
            </div>

            {/* Sections List */}
            <div className="space-y-6">

                {/* Account Section */}
                <SettingsSection title="Account">
                    <SettingsRow
                        icon={<User size={20} />}
                        label="My Profile"
                        subLabel={`${user?.name || 'User'} • ${user?.email || ''}`}
                    />

                    {(user?.role === 'owner' || user?.role === 'admin') && (
                        <SettingsRow
                            icon={<Users size={20} />}
                            label="Organization details"
                            subLabel="Manage members, invites, and roles"
                            onClick={() => handleNavigation('settings/organization')}
                        />
                    )}

                    <SettingsRow
                        icon={<LogOut size={20} />}
                        label="Sign Out"
                        subLabel="Log out of your account on this device"
                        onClick={logout}
                        danger
                    />
                </SettingsSection>

                {/* Preferences */}
                <SettingsSection title="Preferences">
                    <SettingsRow
                        icon={<Bell size={20} />}
                        label="Notifications"
                        subLabel="Manage email and push alerts"
                        badge="On"
                    />
                    <SettingsRow
                        icon={<Moon size={20} />}
                        label="Appearance"
                        subLabel="Theme settings"
                        badge="Dark Mode Locked"
                    />
                </SettingsSection>

                {/* Privacy & Support */}
                <SettingsSection title="Privacy & Support">
                    <SettingsRow
                        icon={<ShieldCheck size={20} />}
                        label="Privacy & Security"
                        subLabel="Password, 2FA, and API Keys"
                    />
                    <SettingsRow
                        icon={<HelpCircle size={20} />}
                        label="Help & Support"
                        subLabel="Documentation and contact support"
                    />
                </SettingsSection>

                {/* Footer Info */}
                <div className="pt-8 text-center text-xs text-soft-violet opacity-60">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Info size={14} />
                        <span>Connecttr V1.2.0 (Stable)</span>
                    </div>
                    <p>Made with 💜 by the Connecttr Team in Los Angeles, CA</p>
                </div>

            </div>
        </div>
    );
}

// --- Subcomponents ---

const SettingsSection = ({ title, children }) => (
    <div className="space-y-3">
        <h3 className="text-sm font-bold text-soft-violet uppercase tracking-wider px-2">{title}</h3>
        <div className="bg-slate rounded-2xl border border-white/5 overflow-hidden shadow-lg">
            {children}
        </div>
    </div>
);

const SettingsRow = ({ icon, label, subLabel, badge, danger, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 transition-colors border-b border-white/5 last:border-0 hover:bg-lilac-mist/5 group`}>
        <div className="flex items-center gap-4">
            <div className={`p-2 rounded-xl transition-colors ${danger
                ? 'bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20'
                : 'bg-white/5 text-soft-violet group-hover:bg-royal-amethyst/20 group-hover:text-royal-amethyst'
                }`}>
                {icon}
            </div>
            <div className="text-left">
                <p className={`font-medium ${danger ? 'text-rose-400' : 'text-white'}`}>{label}</p>
                {subLabel && <p className="text-xs text-soft-violet mt-0.5">{subLabel}</p>}
            </div>
        </div>

        <div className="flex items-center gap-3">
            {badge && (
                <span className="text-[10px] uppercase font-bold text-royal-amethyst bg-royal-amethyst/10 px-2 py-1 rounded-full">{badge}</span>
            )}
            <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
        </div>
    </button>
);
