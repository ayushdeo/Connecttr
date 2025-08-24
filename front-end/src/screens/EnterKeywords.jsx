import React, { useState } from "react";
const API = process.env.REACT_APP_API_BASE || "http://localhost:8000";

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
      onReady({ brief: data.brief }); // hand a real Perplexity brief back up
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] p-10 flex flex-col items-center justify-center text-center">
      <h2 className="text-3xl font-bold text-[#012A4A] mb-6">What kind of leads are you looking for?</h2>
      <textarea
        className="w-full max-w-2xl px-4 py-2 rounded-md border border-gray-300 text-gray-800 placeholder-gray-500 mb-4 h-40 resize-none"
        placeholder="Describe your service and target leads…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {err && <div className="text-red-600 text-sm mb-3">{err}</div>}
      <div className="flex gap-3">
        <button onClick={onBack} className="bg-gray-200 text-[#012A4A] px-6 py-3 rounded-lg">Back</button>
        <button onClick={submit} disabled={!description.trim() || loading} className="bg-[#0257AC] text-white px-6 py-3 rounded-lg hover:bg-[#014A96] transition">
          {loading ? "Analyzing…" : "Proceed"}
        </button>
      </div>
    </div>
  );
};

export default EnterKeywords;