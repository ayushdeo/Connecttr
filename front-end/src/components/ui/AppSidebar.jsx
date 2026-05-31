import React from "react";
import {
  LayoutDashboard,
  Briefcase,
  Inbox,
  BarChart2,
  Settings,
  LogOut,
  Users,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const navItems = [
  { page: "dashboard", label: "Dashboard",  icon: <LayoutDashboard size={20} /> },
  { page: "campaigns", label: "Campaigns",  icon: <Briefcase size={20} /> },
  { page: "emailhub",  label: "Email Hub",  icon: <Inbox size={20} /> },
  { page: "analytics", label: "Analytics",  icon: <BarChart2 size={20} /> },
  { page: "settings",  label: "Settings",   icon: <Settings size={20} /> },
];

const AppSidebar = ({ activePage, setActivePage }) => {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  const navBtn = (isActive) =>
    isActive
      ? "bg-royal-amethyst text-white shadow-glow-sm scale-[1.02]"
      : "text-soft-violet hover:bg-overlay/8 hover:text-mist";

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col z-20 bg-midnight-plum/90 backdrop-blur-md border-r border-overlay/10 shadow-2xl h-screen sticky top-0 theme-surface">

      {/* Brand */}
      <div className="h-24 flex items-center justify-center border-b border-overlay/10 overflow-hidden">
        <img src="/clogo.png" alt="Connecttr" className="h-full w-auto object-cover scale-150" />
      </div>

      {/* Navigation */}
      <nav className="flex-grow p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = activePage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => setActivePage(item.page)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm group ${navBtn(isActive)}`}
            >
              <span className={isActive ? "text-white" : "text-soft-violet group-hover:text-mist transition-colors"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}

        {["owner", "admin"].includes(user?.role) && (
          <button
            onClick={() => setActivePage("settings/organization")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm group
              ${navBtn(activePage === "settings/organization")}`}
          >
            <span className={activePage === "settings/organization" ? "text-white" : "text-soft-violet group-hover:text-mist transition-colors"}>
              <Users size={20} />
            </span>
            Organization
          </button>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-overlay/10 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-soft-violet hover:bg-overlay/8 hover:text-mist transition-all duration-200 text-sm font-medium group"
        >
          {theme === "dark"
            ? <Sun size={18} className="group-hover:text-yellow-400 transition-colors" />
            : <Moon size={18} className="group-hover:text-royal-amethyst transition-colors" />
          }
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        {/* Sign out */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-soft-violet hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 text-sm font-medium"
        >
          <LogOut size={18} />
          Sign Out
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 p-2.5 mt-1 rounded-xl bg-overlay/5 border border-overlay/8">
          {user?.picture ? (
            <img src={user.picture} alt="Profile" className="w-9 h-9 rounded-full border-2 border-royal-amethyst shadow-glow-sm flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-royal-amethyst/20 border-2 border-royal-amethyst flex items-center justify-center flex-shrink-0">
              <span className="text-royal-amethyst font-bold text-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
          )}
          <div className="overflow-hidden min-w-0">
            <p className="font-semibold text-mist text-sm truncate">{user?.name || "User"}</p>
            <p className="text-xs text-soft-violet truncate">{user?.email || ""}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
