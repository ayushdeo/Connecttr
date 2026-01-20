export { default as DashboardHome } from './DashboardHome';
export { default as LeadsPage } from './LeadsPage';
export { default as CampaignManager } from './CampaignManager';

export { default as AnalyticsDashboard } from './AnalyticsDashboard';
export { default as SettingsPanel } from './SettingsPanel';
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Shell from "./screens/Shell";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Shell />
  </BrowserRouter>
);
