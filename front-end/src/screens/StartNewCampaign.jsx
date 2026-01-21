
import React, { useState } from "react";
import { API } from "../config";
import { ArrowRight, Globe } from "lucide-react";

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
        credentials: 'include',
        body: JSON.stringify({ website: website || null })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.detail || "Analyze failed");
      if (data.fallback_needed) {
        onNext?.({ step: "fallback", reason: "low_quality", website, brief: data.brief });
        return;
      }

      onNext?.({ step: "brief_ready", website, brief: data.brief });
    } catch (e) {
      onNext?.({ step: "fallback", reason: e.message || "error", website });
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-slate rounded-2xl border border-white/5 p-8 max-w-md w-full text-center shadow-2xl backdrop-blur-sm">
        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
          <Globe className="text-royal-amethyst" size={24} />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Let's Get Started</h2>
        <p className="text-sm text-soft-violet mb-8">Enter your website URL to help our AI learn about your company and products.</p>

        <div className="relative mb-4">
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="e.g. https://www.yourcompany.com"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-royal-amethyst focus:ring-1 focus:ring-royal-amethyst transition-all"
          />
        </div>

        {err && <div className="text-rose-400 text-sm mb-4 bg-rose-400/10 py-2 px-3 rounded-lg border border-rose-400/20">{err}</div>}

        <button
          onClick={handleProceed}
          disabled={loading}
          className="w-full bg-royal-amethyst hover:bg-royal-amethyst/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-royal-amethyst/20 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Analyzing...</span>
          ) : (
            <>
              <span>Proceed</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <div className="mt-6 pt-6 border-t border-white/5 text-sm text-soft-violet">
          <span>Don't have a website?</span>{" "}
          <button
            onClick={() => onNext?.({ step: "fallback", reason: "no_website" })}
            className="text-white hover:text-lilac-mist underline decoration-white/30 hover:decoration-lilac-mist underline-offset-4 transition-all font-medium ml-1"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartNewCampaign;
