import React, { useState, useEffect } from "react";
import { BRAND } from "../brand";
import DashboardHome from "../screens/DashboardHome";
import CampaignManager from "../screens/CampaignManager";
import AnalyticsDashboard from "../screens/AnalyticsDashboard";
import SettingsPanel from "../screens/SettingsPanel";
import OrganizationSettings from "../screens/OrganizationSettings";
import EmailHub from "../screens/EmailHub";
import DemoSidebar from "../screens/DemoSidebar";
import AppSidebar from "../components/ui/AppSidebar";

const Shell = () => {
  useEffect(() => { document.title = BRAND; }, []);
  const [activePage, setActivePage] = useState("dashboard");
  const [showLanding, setShowLanding] = useState(true);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1500),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setShowLanding(false), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":     return <DashboardHome onNavigate={setActivePage} />;
      case "campaigns":     return <CampaignManager onNavigate={setActivePage} />;
      case "emailhub":      return <EmailHub />;
      case "analytics":     return <AnalyticsDashboard onNavigate={setActivePage} />;
      case "settings":      return <SettingsPanel onNavigate={setActivePage} />;
      case "settings/organization": return <OrganizationSettings />;
      case "demo":          return <DemoSidebar />;
      default:              return <DashboardHome />;
    }
  };

  /* Landing is always dark — it's a cinematic splash, theme-independent */
  if (showLanding) {
    return (
      <div className="dark min-h-screen bg-[#2E1A47] flex items-center justify-center overflow-hidden">
        <div className="text-center transform -translate-y-32 w-full">
          <div
            className={`text-[3.5rem] md:text-[6rem] font-semibold text-white tracking-wide transition-opacity transform duration-1000 ease-in-out
              ${phase > 0 ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
          >
            Welcome to
          </div>

          <div
            className={`text-[5rem] md:text-[8rem] font-extrabold text-transparent bg-clip-text
              bg-gradient-to-r from-[#E6C7E6] to-white transition-transform duration-700
              ${phase > 0 ? "-translate-y-6" : ""}`}
          >
            {BRAND}
          </div>

          {phase >= 1 && (
            <div className="mt-6 text-2xl md:text-3xl text-[#E6C7E6] tracking-wide mx-auto w-fit"
              style={{ animation: "fadein 0.3s ease-in-out 1s forwards" }}>
              <div className="relative inline-block">
                <div className="overflow-hidden whitespace-nowrap"
                  style={{ width: "0ch", animation: "typing 2.5s steps(23, end) 1s forwards", color: "#E6C7E6" }}>
                  From Intent to Inbox.
                </div>
                <span className="absolute top-0" style={{ animation: "blink 1s step-end infinite", animationDelay: "3.5s", left: "100%", color: "#A3779D" }}>|</span>
              </div>
            </div>
          )}

          <style>{`
            @keyframes typing { from { width: 0ch; } to { width: 23ch; } }
            @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
            @keyframes blink  { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen font-sans text-mist bg-ink transition-colors duration-200 relative">
      {/* Atmospheric gradient blobs — adapt via CSS vars in both themes */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-royal-amethyst rounded-full blur-[120px] opacity-[0.15] pointer-events-none z-0" />
      <div className="fixed bottom-[10%] right-[-5%] w-[30%] h-[40%] bg-midnight-plum rounded-full blur-[100px] opacity-20 pointer-events-none z-0" />

      <AppSidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="flex-1 overflow-y-auto z-10 relative">
        {renderPage()}
      </div>
    </div>
  );
};

export default Shell;
