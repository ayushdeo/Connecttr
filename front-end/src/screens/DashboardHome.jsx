import React, { useEffect, useState } from "react";
import { API } from "../config";

export default function DashboardHome({ onNavigate }) {
  const [stats, setStats] = useState({
    leads: 0,
    sent: 0,
    openRate: 0,
    responseRate: 0
  });

  useEffect(() => {
    // Fetch all leads to compute stats locally
    // In a real large-scale app, you'd want a dedicated /stats endpoint.
    fetch(`${API}/emailhub/leads`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;

        const totalLeads = data.length;
        const sent = data.filter(l => ["Sent", "Opened", "Responded"].includes(l.status)).length;
        const opened = data.filter(l => ["Opened", "Responded"].includes(l.status)).length;
        const responded = data.filter(l => l.status === "Responded").length;

        setStats({
          leads: totalLeads,
          sent: sent,
          openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
          responseRate: sent > 0 ? Math.round((responded / sent) * 100) : 0
        });
      })
      .catch(err => console.error("Failed to load stats", err));
  }, []);

  return (
    <div className="flex flex-col p-8 gap-8 min-h-screen text-mist font-sans max-w-7xl mx-auto w-full">

      {/* Hero Card */}
      <div className="bg-gradient-to-r from-midnight-plum to-royal-amethyst p-10 rounded-3xl shadow-2xl relative overflow-hidden border border-white/5">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome Back!</h1>
          <p className="text-lilac-mist text-lg">See intent. Say hello.</p>
        </div>
        {/* Subtle decorative circle */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Leads Found" value={stats.leads} />
        <MetricCard label="Emails Sent" value={stats.sent} />
        <MetricCard label="Open Rate" value={`${stats.openRate}%`} />
        <MetricCard label="Response Rate" value={`${stats.responseRate}%`} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mt-4">
        {onNavigate && (
          <>
            <button
              onClick={() => onNavigate("analytics")}
              className="bg-royal-amethyst text-white font-medium px-8 py-3 rounded-xl shadow-lg shadow-royal-amethyst/30 hover:bg-[#7B42BC] hover:-translate-y-0.5 transition-all duration-200">
              View Analytics
            </button>
            <button
              onClick={() => onNavigate("campaigns")}
              className="border border-white/20 text-lilac-mist px-8 py-3 rounded-xl hover:bg-white/5 hover:text-white transition-all duration-200">
              Manage Campaigns
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const MetricCard = ({ label, value }) => (
  <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5 hover:border-royal-amethyst/30 transition-colors duration-300">
    <p className="text-xs font-bold text-soft-violet uppercase tracking-wider mb-2">{label}</p>
    <p className="text-4xl font-semibold text-white">{value}</p>
  </div>
);
