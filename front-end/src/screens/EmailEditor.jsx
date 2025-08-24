import React, { useEffect, useState } from "react";
const API = process.env.REACT_APP_API_BASE || "http://localhost:8000";

const EmailEditor = ({ lead, onBack }) => {
  const [drafts, setDrafts] = useState(null);
  const [selected, setSelected] = useState("A");
  const [sending, setSending] = useState(false);

  // derive stable primitives for dependencies
  const leadId = lead?.id;
  const campaignId = lead?.campaign_id || "demo";
  const fromEmail = "info@connecttr.com";

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    setDrafts(null); // reset while loading for a new lead

    (async () => {
      try {
        const r = await fetch(`${API}/emailhub/templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: leadId,
            campaign_id: campaignId,
            company_brief: "Client services/ICP from analyzer",
            signal: "found via intent: event buyer",
          }),
        });
        const data = await r.json();
        if (!cancelled) setDrafts(data.templates || {});
      } catch (e) {
        if (!cancelled) setDrafts({});
      }
    })();

    return () => { cancelled = true; };
  }, [leadId, campaignId]); // ✅ include campaignId

if (!drafts) return <div className="p-8 text-white">Generating drafts…</div>;

const current = drafts[selected] || { subject: "", body: "" };

  const send = async () => {
    setSending(true);
    try {
      await fetch(`${API}/emailhub/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          campaign_id: campaignId,
          from_email: fromEmail,
          choice: selected,
          draft: current,
        }),
      });
    } finally {
      setSending(false);
      onBack?.(); // return to list
    }
  };

return (
  <div className="p-8 max-w-5xl mx-auto">
    <button className="underline mb-4 text-[#E0F2FF]" onClick={onBack}>← Back</button>
    <h2 className="text-2xl font-bold text-white mb-4">Choose an email for {lead?.name}</h2>

    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex gap-3 mb-4">
        {["A","B","C"].map(k => (
          <button
            key={k}
            onClick={() => setSelected(k)}
            className={`px-3 py-1 rounded border ${
              selected === k
                ? "bg-[#0257AC] text-white border-[#0257AC]"
                : "border-[#0257AC] text-[#0257AC] bg-white"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mb-3 font-semibold text-slate-900">{current.subject}</div>
      <pre className="whitespace-pre-wrap text-sm text-slate-700">{current.body}</pre>

      <button
        onClick={send}
        disabled={sending}
        className="mt-6 bg-[#0257AC] text-white px-5 py-2 rounded"
      >
        {sending ? "Sending…" : "Send email"}
      </button>
    </div>
  </div>
);
};

export default EmailEditor;