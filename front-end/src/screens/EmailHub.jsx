import React, { useEffect, useState } from "react";
import EmailEditor from "./EmailEditor";
import { API } from "../config";

const EmailHub = () => {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/emailhub/leads`)
      .then(r => r.json())
      .then(data => {
        setLeads(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setLeads([]);
        setLoading(false);
      });
  }, []);

  const openLead = async (lead) => {
    setSelectedLead(lead);
    // If we have history or sent, load thread
    if (["Responded", "Opened", "Sent"].includes(lead.status)) {
      try {
        const r = await fetch(`${API}/emailhub/threads/${lead.id}`);
        const data = await r.json();
        setThread(data.messages || []);
      } catch {
        setThread([]);
      }
    } else {
      setThread(null);
    }
  };

  if (selectedLead && selectedLead.status === "New") {
    return <EmailEditor lead={selectedLead} onBack={() => setSelectedLead(null)} />;
  }

  if (selectedLead && thread) {
    return (
      <div className="p-8">
        <button className="underline mb-4 text-[#A9C7E3] hover:text-white" onClick={() => { setSelectedLead(null); setThread(null); }}>← Back</button>
        <h2 className="text-2xl font-bold mb-4 text-white">Thread — {selectedLead.name}</h2>
        <div className="space-y-3">
          {thread.length > 0 ? thread.map(m => (
            <div key={m.id} className={`p-4 rounded-xl border border-white/10 ${m.direction === 'outbound' ? 'bg-[#0B5BB2]/20 ml-8 text-right' : 'bg-[#023E7D]/40 mr-8 text-left'}`}>
              <div className="text-xs text-[#94A3B8] mb-1">{m.direction === 'outbound' ? 'You sent' : 'They replied'} · {new Date(m.created_at * 1000).toLocaleString()}</div>
              <div className="font-semibold text-white mb-1">{m.subject}</div>
              <div className="whitespace-pre-wrap text-sm text-[#E0F2FF]">{m.text}</div>
            </div>
          )) : (
            <div className="text-white/50 italic">No messages found.</div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-4">Outreach Inbox</h2>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading leads...</td></tr>
            ) : leads.length ? leads.map((lead) => {
              // Standardize score access
              const score = lead.score ?? lead.final_score ?? 0;
              // Clean score for display (integer)
              const displayScore = Math.round(typeof score === 'number' ? score : parseFloat(score) || 0);

              return (
                <tr
                  key={lead.id}
                  className="border-t hover:bg-slate-50 cursor-pointer"
                  onClick={() => openLead(lead)}
                >
                  <td className="px-4 py-3 font-medium text-[#0257AC]">{lead.name || "—"}</td>
                  <td className="px-4 py-3">{lead.company || "—"}</td>
                  <td className="px-4 py-3">{lead.role || "—"}</td>
                  <td className="px-4 py-3">{lead.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${displayScore >= 70 ? "bg-green-100 text-green-700" :
                        displayScore >= 40 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                      }`}>{displayScore}</span>
                  </td>
                  <td className="px-4 py-3">{lead.status || "New"}</td>
                </tr>
              );
            }) : (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No leads yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default EmailHub;