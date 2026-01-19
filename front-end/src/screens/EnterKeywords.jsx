
import React, { useState } from "react";
import { API } from "../config";
import { MessageSquare, ArrowLeft, Sparkles } from "lucide-react";

const EnterKeywords = ({ website, onBack, onReady }) => {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/campaigns/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: description, website: website || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Analyze failed");
      onReady({ brief: data.brief });
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="bg-slate rounded-2xl border border-white/5 p-8 max-w-2xl w-full text-center shadow-2xl backdrop-blur-sm">

        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
          <MessageSquare className="text-royal-amethyst" size={24} />
        </div>

        <h2 className="text-3xl font-bold text-white mb-3">Describe your Target Leads</h2>
        <p className="text-soft-violet mb-6">
          Tell us about the ideal customers you want to reach. What is your product, and who needs it most?
        </p>

        <textarea
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 mb-4 h-40 resize-none focus:outline-none focus:border-royal-amethyst focus:ring-1 focus:ring-royal-amethyst transition-all leading-relaxed"
          placeholder="e.g. We sell enterprise CRM software to mid-sized SaaS companies in North America. We are looking for CTOs and VPs of Engineering..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {err && <div className="text-rose-400 text-sm mb-4 bg-rose-400/10 py-2 px-3 rounded-lg border border-rose-400/20">{err}</div>}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all font-medium flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <button
            onClick={submit}
            disabled={!description.trim() || loading}
            className="flex-1 bg-royal-amethyst hover:bg-royal-amethyst/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-royal-amethyst/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Analyzing...</span>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Generate Brief</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default EnterKeywords;