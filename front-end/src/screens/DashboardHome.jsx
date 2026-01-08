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
    fetch(`${API}/emailhub/leads`)
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
    <div className="flex flex-col p-8 gap-8 bg-[#0257AC] min-h-screen text-[#E0F2FF] font-sans transition-all duration-200 ease-in-out">
      
      {/* Hero Card */}
      <div className="bg-[#023E7D] p-8 rounded-2xl shadow-md shadow-[#013B7A]">
        <h1 className="text-3xl font-semibold">Welcome Ah! Ventures, See intent. Say hello.</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#023E7D] rounded-2xl p-6 shadow-md shadow-[#013B7A]">
          <p className="text-sm text-[#94A3B8]">Leads Found</p>
          <p className="text-2xl font-medium text-[#E0F2FF]">{stats.leads}</p>
        </div>
        <div className="bg-[#023E7D] rounded-2xl p-6 shadow-md shadow-[#013B7A]">
          <p className="text-sm text-[#94A3B8]">Emails Sent</p>
          <p className="text-2xl font-medium text-[#E0F2FF]">{stats.sent}</p>
        </div>
        <div className="bg-[#023E7D] rounded-2xl p-6 shadow-md shadow-[#013B7A]">
          <p className="text-sm text-[#94A3B8]">Open Rate</p>
          <p className="text-2xl font-medium text-[#E0F2FF]">{stats.openRate}%</p>
        </div>
        <div className="bg-[#023E7D] rounded-2xl p-6 shadow-md shadow-[#013B7A]">
          <p className="text-sm text-[#94A3B8]">Response Rate</p>
          <p className="text-2xl font-medium text-[#E0F2FF]">{stats.responseRate}%</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        {onNavigate && (
            <>
                <button 
                  onClick={() => onNavigate("analytics")}
                  className="bg-white text-[#0257AC] font-medium px-6 py-2 rounded-full hover:bg-[#E0F2FF] transition-all duration-200">
                  View Analytics
                </button>
                <button 
                  onClick={() => onNavigate("campaigns")}
                  className="border border-[#94A3B8] text-[#E0F2FF] px-6 py-2 rounded-full hover:bg-[#E0F2FF] hover:text-[#0257AC] transition-all duration-200">
                  View Campaigns
                </button>
            </>
        )}
      </div>
    </div>
  );
}
