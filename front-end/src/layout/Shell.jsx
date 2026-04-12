import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BRAND } from "../brand";
import DashboardHome from "../screens/DashboardHome";
import CampaignManager from "../screens/CampaignManager";
import AnalyticsDashboard from "../screens/AnalyticsDashboard";
import SettingsPanel from "../screens/SettingsPanel";
import OrganizationSettings from "../screens/OrganizationSettings";
import EmailHub from "../screens/EmailHub";
import DemoSidebar from "../screens/DemoSidebar";
import AppSidebar from "../components/ui/AppSidebar";

const PAGE_TO_PATH = {
  dashboard: "/dashboard",
  campaigns: "/campaigns",
  emailhub: "/emailhub",
  analytics: "/analytics",
  settings: "/settings",
  "settings/organization": "/settings/organization",
  demo: "/demo",
};

const pathToPage = (pathname) => {
  if (pathname === "/" || pathname === "/dashboard") return "dashboard";
  if (pathname === "/campaigns") return "campaigns";
  if (pathname === "/emailhub" || pathname === "/email-hub") return "emailhub";
  if (pathname === "/analytics") return "analytics";
  if (pathname === "/settings/organization") return "settings/organization";
  if (pathname === "/settings") return "settings";
  if (pathname === "/demo") return "demo";
  return "dashboard";
};

const Shell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = pathToPage(location.pathname);
  useEffect(() => { document.title = BRAND; }, []);
  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem("connecttr-landing-seen") !== "1";
  });
  const [phase, setPhase] = useState(0); // 0: welcome, 1: tagline, 2: done

  useEffect(() => {
    if (location.pathname === "/") {
      navigate("/dashboard", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!showLanding) return undefined;

    const timers = [];

    // Phase 1: remove "Welcome to"
    timers.push(setTimeout(() => setPhase(1), 1500));
    // Phase 2: show tagline
    timers.push(setTimeout(() => setPhase(2), 2500));
    // Phase 3: remove landing
    timers.push(setTimeout(() => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("connecttr-landing-seen", "1");
      }
      setShowLanding(false);
    }, 6000));

    return () => timers.forEach(clearTimeout);
  }, [showLanding]);

  const navigateToPage = (page) => {
    const nextPath = PAGE_TO_PATH[page] || "/dashboard";
    if (nextPath !== location.pathname) {
      navigate(nextPath);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardHome onNavigate={navigateToPage} />;
      case "campaigns":
        return <CampaignManager onNavigate={navigateToPage} />;
      case "emailhub":
        return <EmailHub />;
      case "analytics":
        return <AnalyticsDashboard />;
      case "settings":
      case "settings/organization":
        // Let the URL or activePage state handle this. If it's pure state-based sidebar:
        return activePage === "settings/organization" ? <OrganizationSettings /> : <SettingsPanel onNavigate={navigateToPage} />;
      case "demo":
        return <DemoSidebar />;
      default:
        return <DashboardHome onNavigate={navigateToPage} />;
    }
  };

  if (showLanding) {
    return (
      <div className="min-h-screen bg-midnight-plum flex items-center justify-center font-sans overflow-hidden">
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
            className={`text-[5rem] md:text-[8rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-lilac-mist to-white transition-transform duration-700 ${phase > 0 ? "-translate-y-6" : ""
              }`}
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {BRAND}
          </div>

          {/* Tagline with Typing Animation */}
          {phase >= 1 && (
            <div
              className="mt-6 text-2xl md:text-3xl text-lilac-mist tracking-wide mx-auto w-fit"
              style={{ animation: "fadein 0.3s ease-in-out 1s forwards" }}
            >
              <div className="relative inline-block">
                <div
                  className="overflow-hidden whitespace-nowrap"
                  style={{
                    width: "0ch",
                    animation: "typing 2.5s steps(23, end) 1s forwards",
                    fontFamily: "system-ui, sans-serif",
                    color: "#E6C7E6",
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
                    color: "#A3779D",
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
    <div className="flex min-h-screen font-sans text-mist bg-ink transition-colors duration-300 relative">
      {/* Background blobs for glassmorphism effect across the app */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-royal-amethyst rounded-full blur-[120px] opacity-20 pointer-events-none z-0"></div>
      <div className="fixed bottom-[10%] right-[-5%] w-[30%] h-[40%] bg-midnight-plum rounded-full blur-[100px] opacity-30 pointer-events-none z-0"></div>

      {/* Sidebar */}
      <AppSidebar activePage={activePage} setActivePage={navigateToPage} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto z-10 relative">
        {renderPage()}
      </div>
    </div>
  );
};

export default Shell;
