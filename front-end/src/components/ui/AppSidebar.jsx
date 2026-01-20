
import React from "react";
import {
    LayoutDashboard,
    Briefcase,
    Edit3,
    Inbox,
    BarChart2,
    Settings,
    Send
} from "lucide-react";

const navItems = [
    { page: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { page: "campaigns", label: "Campaigns", icon: <Briefcase size={20} /> },

    { page: "emailhub", label: "Email Hub", icon: <Inbox size={20} /> },
    { page: "analytics", label: "Analytics", icon: <BarChart2 size={20} /> },
    { page: "settings", label: "Settings", icon: <Settings size={20} /> },
];

const AppSidebar = ({ activePage, setActivePage }) => {
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
            </nav>

            {/* User Footer */}
            <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-slate border border-royal-amethyst flex items-center justify-center shadow-lg group-hover:shadow-royal-amethyst/20 transition-all">
                        <span className="text-white font-bold text-sm">AD</span>
                    </div>
                    <div>
                        <p className="font-semibold text-white text-sm">Ayush A. Deo</p>
                        <p className="text-xs text-soft-violet">Founder</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default AppSidebar;
