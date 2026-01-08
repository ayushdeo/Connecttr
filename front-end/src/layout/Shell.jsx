import React, { useState, useEffect } from "react";
import { BRAND } from "../brand";
import DashboardHome from "../screens/DashboardHome";
import CampaignManager from "../screens/CampaignManager";
import EmailEditor from "../screens/EmailEditor";
import AnalyticsDashboard from "../screens/AnalyticsDashboard";
import SettingsPanel from "../screens/SettingsPanel";
import EmailHub from "../screens/EmailHub";


const Shell = () => {
  useEffect(() => { document.title = BRAND; }, []);
  const [activePage, setActivePage] = useState("dashboard");
  const [showLanding, setShowLanding] = useState(true);
  const [phase, setPhase] = useState(0); // 0: welcome, 1: tagline, 2: done

  useEffect(() => {
    const timers = [];

    // Phase 1: remove "Welcome to"
    timers.push(setTimeout(() => setPhase(1), 1500));
    // Phase 2: show tagline
    timers.push(setTimeout(() => setPhase(2), 2500));
    // Phase 3: remove landing
    timers.push(setTimeout(() => setShowLanding(false), 6000));

    return () => timers.forEach(clearTimeout);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardHome onNavigate={setActivePage} />;
      case "campaigns":
        return <CampaignManager onNavigate={setActivePage} />;
      case "email":
        return <EmailEditor />;
      case "emailhub":
        return <EmailHub />;
      case "analytics":
        return <AnalyticsDashboard />;
      case "settings":
        return <SettingsPanel />;
      default:
        return <DashboardHome />;
    }
  };

  if (showLanding) {
    return (
      <div className="min-h-screen bg-[#0257AC] flex items-center justify-center font-sans overflow-hidden">
        <div className="text-center transform -translate-y-32 w-full">
          {/* Welcome to */}
          <div
            className={`text-[3.5rem] md:text-[6rem] font-semibold text-white tracking-wide transition-opacity transform duration-1000 ease-in-out ${phase > 0 ? "opacity-0 scale-95" : "opacity-100 scale-100"
              }`}
          >
            Welcome to
          </div>

          {/* Nexus */}
          <div
            className={`text-[5rem] md:text-[8rem] font-extrabold text-white transition-transform duration-700 ${phase > 0 ? "-translate-y-6" : ""
              }`}
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {BRAND}
          </div>

          {/* Tagline with Typing Animation */}
          {phase >= 1 && (
            <div
              className="mt-6 text-2xl md:text-3xl text-[#E0F2FF] tracking-wide mx-auto w-fit"
              style={{ animation: "fadein 0.3s ease-in-out 1s forwards" }}
            >
              <div className="relative inline-block">
                <div
                  className="overflow-hidden whitespace-nowrap"
                  style={{
                    width: "0ch",
                    animation: "typing 2.5s steps(23, end) 1s forwards",
                    fontFamily: "system-ui, sans-serif",
                    color: "#E0F2FF",
                  }}
                >
                  From Intent to Inbox.
                </div>

                {/* Blinking cursor */}
                <span
                  className="absolute top-0"
                  style={{
                    animation: "blink 1s step-end infinite",
                    animationDelay: "3.5s",
                    left: "100%",
                    color: "#E0F2FF",
                  }}
                >
                  |
                </span>

              </div>
            </div>
          )}



          {/* Inline CSS for typing */}
          <style>
            {`
                @keyframes typing {
                from { width: 0ch; }
                to { width: 23ch; }
                }

                @keyframes fadein {
                from { opacity: 0; }
                to { opacity: 1; }
                }

                @keyframes blink {
                0% { opacity: 1; }
                50% { opacity: 0; }
                100% { opacity: 1; }
                }
            `}
          </style>


        </div>
      </div>
    );
  }




  return (
    <div className="flex min-h-screen font-sans text-white bg-[#0257AC] transition-all duration-200 ease-in-out">
      {/* Sidebar */}
      <div className="w-64 bg-[#012A4A] shadow-lg shadow-[#011B33] flex flex-col justify-between py-6 px-4 border-r border-white/10">
        <div>
          <div className="text-xl font-semibold text-white mb-8 px-2">{BRAND}</div>
          <nav className="space-y-2">
            <SidebarLink label="Dashboard" active={activePage === "dashboard"} onClick={() => setActivePage("dashboard")} />
            <SidebarLink label="Campaigns" active={activePage === "campaigns"} onClick={() => setActivePage("campaigns")} />
            <SidebarLink label="Email Editor" active={activePage === "email"} onClick={() => setActivePage("email")} />
            <SidebarLink label="Email Hub" active={activePage === "emailhub"} onClick={() => setActivePage("emailhub")} />
            <SidebarLink label="Analytics" active={activePage === "analytics"} onClick={() => setActivePage("analytics")} />
            <SidebarLink label="Settings" active={activePage === "settings"} onClick={() => setActivePage("settings")} />
          </nav>
        </div>
        <div className="mt-auto text-xs text-white/60">
          © {new Date().getFullYear()} {BRAND}        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {renderPage()}
      </div>
    </div>
  );
};

const SidebarLink = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-200 ease-in-out
      ${active ? "bg-white text-[#0257AC] font-medium" : "text-[#E0F2FF] hover:bg-[#023E7D] hover:text-white"}`}
  >
    {label}
  </button>
);

export default Shell;
