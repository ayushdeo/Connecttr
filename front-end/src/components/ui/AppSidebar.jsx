
import React from "react";
import {
    LayoutDashboard,
    Briefcase,
    Inbox,
    BarChart2,
    Settings,
    LogOut,
    Users
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navItems = [
    { page: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { page: "campaigns", label: "Campaigns", icon: <Briefcase size={20} /> },

    { page: "emailhub", label: "Email Hub", icon: <Inbox size={20} /> },
    { page: "analytics", label: "Analytics", icon: <BarChart2 size={20} /> },
    { page: "settings", label: "Settings", icon: <Settings size={20} /> },
];

const AppSidebar = ({ activePage, setActivePage }) => {
    const { user, logout } = useAuth();

    return (
        <aside className="w-64 flex-shrink-0 flex flex-col z-20 bg-midnight-plum/90 backdrop-blur-md border-r border-white/10 shadow-2xl h-screen sticky top-0 transition-all duration-300">

            {/* Brand Header */}
            <div className="h-24 flex items-center justify-center border-b border-white/10 overflow-hidden relative">
                <div className="flex items-center justify-center p-4 w-full h-full">
                    <img
                        src="/clogo.png"
                        alt="Connecttr Logo"
                        className="h-full w-auto object-cover transform scale-150"
                    />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = activePage === item.page;
                    return (
                        <button
                            key={item.page}
                            onClick={() => setActivePage(item.page)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-out font-medium group
                ${isActive
                                    ? "bg-royal-amethyst text-white shadow-lg shadow-royal-amethyst/20 scale-[1.02]"
                                    : "text-soft-violet hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            <div className={`${isActive ? "text-white" : "text-soft-violet group-hover:text-white"}`}>
                                {item.icon}
                            </div>
                            <span>{item.label}</span>
                        </button>
                    );
                })}

                {/* Conditional Admin/Owner Org Item */}
                {["owner", "admin"].includes(user?.role) && (
                    <button
                        onClick={() => setActivePage("settings/organization")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-out font-medium group
            ${activePage === "settings/organization"
                                ? "bg-royal-amethyst text-white shadow-lg shadow-royal-amethyst/20 scale-[1.02]"
                                : "text-soft-violet hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        <div className={`${activePage === "settings/organization" ? "text-white" : "text-soft-violet group-hover:text-white"}`}>
                            <Users size={20} />
                        </div>
                        <span>Organization</span>
                    </button>
                )}
            </nav>

            {/* User Footer */}
            <div className="p-4 border-t border-white/10 space-y-2">
                {/* Logout Button */}
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-soft-violet hover:bg-red-500/10 hover:text-red-400 transition-colors duration-200"
                >
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Sign Out</span>
                </button>

                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 transition-colors group">
                    {user?.picture ? (
                        <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full border border-royal-amethyst shadow-lg" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate border border-royal-amethyst flex items-center justify-center shadow-lg group-hover:shadow-royal-amethyst/20 transition-all">
                            <span className="text-white font-bold text-sm">{user?.name ? user.name.charAt(0).toUpperCase() : "U"}</span>
                        </div>
                    )}

                    <div className="overflow-hidden">
                        <p className="font-semibold text-white text-sm truncate">{user?.name || "User"}</p>
                        <p className="text-xs text-soft-violet truncate">{user?.email || "No Email"}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default AppSidebar;
