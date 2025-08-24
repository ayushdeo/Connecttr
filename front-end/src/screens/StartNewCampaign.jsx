import React, { useState } from "react";
import { API } from "../config";
const StartNewCampaign = ({ onNext }) => {
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleProceed = async () => {
    setErr(""); setLoading(true);
    try {
      const res = await fetch(`${API}/campaigns/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: website || null })
      });
      const data = await res.json();

      // If backend suggests fallback OR request failed badly
      if (!res.ok) throw new Error(data?.detail || "Analyze failed");
      if (data.fallback_needed) {
        onNext?.({ step: "fallback", reason: "low_quality", website, brief: data.brief });
        return;
      }

      // Good brief → go straight to campaign config
      onNext?.({ step: "brief_ready", website, brief: data.brief });
    } catch (e) {
      // No website or fetch failed → go to fallback prompt step
      onNext?.({ step: "fallback", reason: e.message || "error", website });
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fbffe1] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-[#002C5F] mb-2">Let's Get Started</h2>
        <p className="text-sm text-gray-600 mb-6">Enter your website to help us learn more about your company.</p>

        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="e.g. https://www.YourWebsiteHere.com/"
          className="w-full px-4 py-2 rounded-md border border-gray-300 text-gray-800 placeholder-gray-400 mb-3"
        />

        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}

        <button
          onClick={handleProceed}
          disabled={loading}
          className="w-full bg-[#0257AC] hover:bg-[#013F7F] disabled:opacity-60 text-white font-medium py-2 rounded-md transition duration-200"
        >
          {loading ? "Analyzing…" : "Proceed"}
        </button>

        <div className="mt-4 text-sm text-[#0257AC]">
          or{" "}
          <span onClick={() => onNext?.({ step: "fallback", reason: "no_website" })} className="underline cursor-pointer hover:text-[#013F7F]">
            I don't have a website
          </span>
        </div>
      </div>
    </div>
  );
};

export default StartNewCampaign;
