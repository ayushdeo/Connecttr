import React, { useEffect, useState } from "react";
import { API } from "../config";
import {
  Search,
  Plus,
  Send,
  Loader2,
  Sparkles,
  User,
  Building,
  Inbox
} from "lucide-react";


const EmailHub = () => {
  // --- STATE ---
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [filter, setFilter] = useState("All"); // All, Unread, Responded
  const [search, setSearch] = useState("");

  const [selectedLead, setSelectedLead] = useState(null);
  const [thread, setThread] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);

  // Composer State
  const [composer, setComposer] = useState({
    to_email: "",
    subject: "",
    body: ""
  });
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  // AI Drafts
  const [aiDrafts, setAiDrafts] = useState(null); // { A: {subject, body}, ... }
  const [selectedDraft, setSelectedDraft] = useState("A");

  // --- EFFECTS ---

  // 1. Load Leads
  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoadingLeads(true);
    try {
      const r = await fetch(`${API}/emailhub/leads`);
      const data = await r.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  };

  // 2. Load Thread when Lead Selected
  useEffect(() => {
    if (!selectedLead) {
      setThread([]);
      // Reset composer for "New Email" mode if explicitly deselected
      // But usually we keep composer clear? 
      // Let's reset composer if we switch to specific lead (reply mode)
      // or keep it empty if new.
      return;
    }

    const fetchThread = async () => {
      setLoadingThread(true);
      try {
        const r = await fetch(`${API}/emailhub/threads/${selectedLead.id}`);
        const data = await r.json();
        setThread(data.messages || []);

        // Pre-fill composer for REPLY
        setComposer({
          to_email: selectedLead.email,
          subject: `Re: ` + (data.messages?.[0]?.subject || "Connecttr Outreach"),
          body: ""
        });
        setAiDrafts(null); // clear old drafts
      } catch (e) {
        setThread([]);
      } finally {
        setLoadingThread(false);
      }
    };

    fetchThread();
  }, [selectedLead]);

  // 3. Handle Draft Selection
  useEffect(() => {
    if (aiDrafts && aiDrafts[selectedDraft]) {
      setComposer(prev => ({
        ...prev,
        subject: aiDrafts[selectedDraft].subject,
        body: aiDrafts[selectedDraft].body
      }));
    }
  }, [selectedDraft, aiDrafts]);


  // --- ACTIONS ---

  const handleGenerateAI = async () => {
    if (!selectedLead) return alert("Select a lead to generate AI drafts contextually.");
    setGenerating(true);
    try {
      const r = await fetch(`${API}/emailhub/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          campaign_id: selectedLead.campaign_id || "default",
          company_brief: "Potential partner/client",
          signal: "manual outreach"
        }),
      });
      const data = await r.json();
      if (data.templates) {
        setAiDrafts(data.templates);
        setSelectedDraft("A"); // Trigger effect to fill composer
      }
    } catch (e) {
      alert("Failed to generate drafts");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      // Logic: 
      // If selectedLead exists, use their ID.
      // If NOT (New Email mode), backend will creating lead.
      // Current backend requires 'campaign_id="default"' for this flow.

      const payload = {
        lead_id: selectedLead?.id || "",
        campaign_id: "default",
        from_email: "ayush@connecttr.com", // Todo: Auth user
        to_email: composer.to_email,
        choice: "manual",
        draft: {
          subject: composer.subject,
          body: composer.body
        }
      };

      const r = await fetch(`${API}/emailhub/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!r.ok) throw new Error("Send failed");

      // Success
      await r.json();

      // If new lead was created, reload list
      if (!selectedLead) {
        loadLeads();
        // Optionally select the new lead? 
        // Too complex to parse resp for now, just reload.
        setComposer({ to_email: "", subject: "", body: "" });
      } else {
        // Refresh thread
        // Just append locally or reload? Reload is safer.
        const rThread = await fetch(`${API}/emailhub/threads/${selectedLead.id}`);
        const dThread = await rThread.json();
        setThread(dThread.messages || []);
        setComposer(prev => ({ ...prev, body: "" })); // Clear body only, keep subject for reply chain?
      }

    } catch (e) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  };

  const startNewEmail = () => {
    setSelectedLead(null);
    setThread([]);
    setComposer({
      to_email: "",
      subject: "",
      body: ""
    });
    setAiDrafts(null);
  };

  // --- FILTERING ---
  const filteredLeads = leads.filter(l => {
    if (search && !l.name?.toLowerCase().includes(search.toLowerCase()) && !l.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "Unread" && l.status !== "Responded") return false; // Approx
    if (filter === "Responded" && l.status !== "Responded") return false;
    return true;
  });

  // --- RENDER ---
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-950 text-slate-200 font-sans">

      {/* COLUMN 1: LEADS LIST */}
      <div className="w-80 flex flex-col border-r border-white/10 bg-slate-900/50 backdrop-blur-md">
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Inbox size={18} /> Inbox
            </h2>
            <button onClick={startNewEmail} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors">
              <Plus size={18} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              className="w-full bg-slate-950/50 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
              placeholder="Search leads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {["All", "Responded"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${filter === f ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingLeads ? (
            <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" />Loading...</div>
          ) : (
            filteredLeads.map(lead => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`p-4 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${selectedLead?.id === lead.id ? "bg-indigo-500/10 border-l-2 border-l-indigo-500" : ""}`}
              >
                <div className="flex justify-between mb-1">
                  <span className={`font-semibold text-sm truncate ${selectedLead?.id === lead.id ? "text-indigo-300" : "text-white"}`}>{lead.name || "Unknown"}</span>
                  <span className="text-[10px] text-slate-500">{new Date(lead.created_at * 1000).toLocaleDateString()}</span>
                </div>
                <div className="text-xs text-slate-400 truncate mb-1">{lead.company}</div>
                <div className={`text-[10px] px-1.5 py-0.5 rounded w-fit ${lead.status === "Responded" ? "bg-green-500/20 text-green-400" : "bg-slate-800 text-slate-500"}`}>
                  {lead.status}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COLUMN 2: THREAD VIEW */}
      <div className="flex-1 flex flex-col border-r border-white/10 bg-slate-900/30">
        {selectedLead ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center px-6 justify-between bg-slate-900/50">
              <div>
                <h3 className="font-bold text-lg text-white">{selectedLead.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Building size={12} /> {selectedLead.company}
                  <span className="text-slate-600">•</span>
                  <User size={12} /> {selectedLead.role}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-indigo-400">{Math.round(selectedLead.score || 0)}</span>
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Score</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingThread ? (
                <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-slate-500" /></div>
              ) : thread.length === 0 ? (
                <div className="text-center text-slate-500 py-10 italic">No messages yet. Start the conversation!</div>
              ) : (
                thread.map(m => (
                  <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${m.direction === 'outbound'
                      ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 rounded-tr-none'
                      : 'bg-slate-800/50 border border-slate-700 text-slate-200 rounded-tl-none'
                      }`}>
                      <div className="flex justify-between items-center gap-4 mb-2 opacity-60 text-xs">
                        <span>{m.direction === 'outbound' ? 'You' : selectedLead.name}</span>
                        <span>{new Date(m.created_at * 1000).toLocaleString()}</span>
                      </div>
                      <div className="font-medium text-sm mb-1">{m.subject}</div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>

                      {/* Events */}
                      {m.events && m.events.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-white/10 flex gap-2 flex-wrap">
                          {m.events.map((ev, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 text-slate-400">
                              {ev.RecordType}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <Inbox size={48} className="mb-4 opacity-20" />
            <p>Select a conversation or start a new email.</p>
          </div>
        )}
      </div>

      {/* COLUMN 3: COMPOSER */}
      <div className="w-96 flex flex-col bg-slate-950 border-l border-white/10">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            {selectedLead ? "Reply" : "New Message"}
          </h3>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase">To</label>
              <input
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-colors"
                placeholder="email@example.com"
                value={composer.to_email}
                onChange={e => setComposer({ ...composer, to_email: e.target.value })}
                disabled={!!selectedLead} // Lock TO if replying
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Subject</label>
              <input
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-colors"
                placeholder="Subject line..."
                value={composer.subject}
                onChange={e => setComposer({ ...composer, subject: e.target.value })}
              />
            </div>

            {/* AI Tools */}
            {selectedLead && (
              <div className="py-2">
                {!aiDrafts ? (
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={generating}
                    className="w-full py-2 border border-dashed border-indigo-500/30 rounded-lg text-indigo-400 text-xs font-medium hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-2"
                  >
                    {generating ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                    Generate Draft with AI
                  </button>
                ) : (
                  <div className="flex gap-2">
                    {["A", "B", "C"].map(k => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setSelectedDraft(k)}
                        className={`flex-1 py-1 text-xs rounded border ${selectedDraft === k ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-800 text-slate-500 hover:border-slate-600"}`}
                      >
                        Draft {k}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1 flex-1">
              <textarea
                className="w-full h-64 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none resize-none font-mono"
                placeholder="Write your message..."
                value={composer.body}
                onChange={e => setComposer({ ...composer, body: e.target.value })}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={sending || !composer.to_email}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                {selectedLead ? "Reply" : "Send Email"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailHub;