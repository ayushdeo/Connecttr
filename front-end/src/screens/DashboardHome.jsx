import React from "react";

export default function DashboardHome() {
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
          <p className="text-2xl font-medium text-[#E0F2FF]">22</p>
        </div>
        <div className="bg-[#023E7D] rounded-2xl p-6 shadow-md shadow-[#013B7A]">
          <p className="text-sm text-[#94A3B8]">Emails Sent</p>
          <p className="text-2xl font-medium text-[#E0F2FF]">87</p>
        </div>
        <div className="bg-[#023E7D] rounded-2xl p-6 shadow-md shadow-[#013B7A]">
          <p className="text-sm text-[#94A3B8]">Open Rate</p>
          <p className="text-2xl font-medium text-[#E0F2FF]">64%</p>
        </div>
        <div className="bg-[#023E7D] rounded-2xl p-6 shadow-md shadow-[#013B7A]">
          <p className="text-sm text-[#94A3B8]">Response Rate</p>
          <p className="text-2xl font-medium text-[#E0F2FF]">43%</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button className="bg-white text-[#0257AC] font-medium px-6 py-2 rounded-full hover:bg-[#E0F2FF] transition-all duration-200">
          View Analytics
        </button>
        <button className="border border-[#94A3B8] text-[#E0F2FF] px-6 py-2 rounded-full hover:bg-[#E0F2FF] hover:text-[#0257AC] transition-all duration-200">
          View Campaigns
        </button>
      </div>
    </div>
  );
}
