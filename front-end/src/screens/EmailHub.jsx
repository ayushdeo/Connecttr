import React, { useEffect, useState, useRef } from "react";
import { API } from "../config";
import {
  Search,
  Plus,
  Send,
  Loader2,
  Sparkles,
  User,
  Building,
  Inbox,
  ChevronDown,
  MoreHorizontal,
  MailOpen,
  MousePointer2,
  Reply,
  AlertCircle
} from "lucide-react";

// Verified Senders
const VERIFIED_SENDERS = [
  { label: "Ayush Deo", email: "ayush@connecttr.com" },
  { label: "Connecttr Team", email: "info@connecttr.com" },
  { label: "Serafim P.", email: "serafim@connecttr.com" }
];

// Helper: Parse Message Content
const parseMessageContent = (text) => {
  if (!text) return { fresh: "", quoted: null };

  // Regex for common reply delimiters
  // 1. On [Date], [Name] wrote:
  // 2. > (standard quote)
  // 3. -----Original Message-----
  const patterns = [
    /\r?\nOn .+, .+ wrote:/,
    /\r?\n> /,
    /\r?\n-{3,}\s?Original Message\s?-{3,}/,
    /\r?\nFrom:\s/
  ];

  for (const p of patterns) {
    const match = text.match(p);
    if (match && match.index > 0) { // Ensure we have some fresh text
      return {
        fresh: text.substring(0, match.index).trim(),
        quoted: text.substring(match.index).trim()
      };
    }
  }

  return { fresh: text, quoted: null };
};

// Component: Message Card
const MessageCard = ({ message, isLatest, senderName }) => {
  const [expanded, setExpanded] = useState(false);
  const { fresh, quoted } = parseMessageContent(message.text);
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={`flex w-full mb-8 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative max-w-[85%] min-w-[300px] flex flex-col group transition-all duration-500
        ${isLatest ? "opacity-100 translate-y-0" : "opacity-80 hover:opacity-100"}
      `}>

        {/* Avatar & Sender Info (Outside bubble for clean look) */}
        <div className={`flex items-end gap-3 mb-2 ${isOutbound ? "flex-row-reverse" : "flex-row"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg 
            ${isOutbound ? "bg-royal-amethyst text-white" : "bg-slate border border-white/10 text-soft-violet"}`}>
            {isOutbound ? "You" : senderName.charAt(0)}
          </div>
          <div className={`flex flex-col text-xs ${isOutbound ? "items-end" : "items-start"}`}>
            <span className="font-bold text-white">{isOutbound ? "You" : senderName}</span>
            <span className="text-soft-violet/60">
              {new Date(message.created_at * 1000).toLocaleString(undefined, {
                weekday: 'short', hour: 'numeric', minute: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Bubble */}
        <div className={`rounded-2xl p-5 shadow-xl border backdrop-blur-sm relative overflow-hidden
          ${isOutbound
            ? 'bg-gradient-to-br from-royal-amethyst/20 to-midnight-plum/80 border-royal-amethyst/30 text-mist rounded-tr-sm'
            : 'bg-slate/60 border-white/5 text-mist rounded-tl-sm'
          }
        `}>

          {/* Subject (Only if different context or first message, simplified for now: always show small) */}
          <div className="text-[10px] uppercase tracking-wider font-semibold opacity-40 mb-3 truncate">
            {message.subject}
          </div>

          {/* Body */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed font-light">
            {fresh}
          </div>

          {/* Quoted Section */}
          {quoted && (
            <div className="mt-4 pt-3 border-t border-white/5">
              {!expanded ? (
                <button
                  onClick={() => setExpanded(true)}
                  className="flex items-center gap-2 text-xs text-soft-violet/50 hover:text-soft-violet transition-colors"
                >
                  <MoreHorizontal size={14} /> Show quoted message
                </button>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="pl-3 border-l-2 border-white/10 text-xs text-soft-violet/60 whitespace-pre-wrap font-mono leading-tight">
                    {quoted}
                  </div>
                  <button
                    onClick={() => setExpanded(false)}
                    className="mt-2 text-[10px] text-soft-violet/40 hover:text-soft-violet uppercase tracking-wide"
                  >
                    Hide quote
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* System Events (Divider style) */}
        {message.events && message.events.length > 0 && (
          <div className={`mt-3 flex flex-wrap gap-2 ${isOutbound ? "justify-end" : "justify-start"}`}>
            {message.events.map((ev, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-soft-violet/80 shadow-sm">
                {ev.RecordType === "Open" && <MailOpen size={10} className="text-amber-400" />}
                {ev.RecordType === "Click" && <MousePointer2 size={10} className="text-emerald-400" />}
                {ev.RecordType === "Delivery" && <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />}
                {ev.RecordType === "Bounce" && <AlertCircle size={10} className="text-red-400" />}

                <span className="capitalize">{ev.RecordType}</span>
                {ev.CreatedAt && <span className="opacity-50 border-l border-white/10 pl-1.5 ml-0.5">
                  {new Date(ev.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};


const EmailHub = () => {
  // --- STATE ---
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [selectedLead, setSelectedLead] = useState(null);
  const [thread, setThread] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const threadEndRef = useRef(null);

  // Composer State
  const [composer, setComposer] = useState({
    from_email: VERIFIED_SENDERS[0].email,
    to_email: "",
    subject: "",
    body: ""
  });
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  // AI Drafts
  const [aiDrafts, setAiDrafts] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState("A");

  // --- EFFECTS ---

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [thread, selectedLead]);

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

  useEffect(() => {
    if (!selectedLead) {
      setThread([]);
      return;
    }

    const fetchThread = async () => {
      setLoadingThread(true);
      try {
        const r = await fetch(`${API}/emailhub/threads/${selectedLead.id}`);
        const data = await r.json();
        setThread(data.messages || []);

        // Pre-fill composer for REPLY
        const lastMsg = data.messages?.[data.messages.length - 1];
        const replySubject = lastMsg ? (lastMsg.subject.startsWith("Re:") ? lastMsg.subject : `Re: ${lastMsg.subject}`) : "Connecttr Outreach";

        setComposer(prev => ({
          ...prev,
          to_email: selectedLead.email,
          subject: replySubject,
          body: ""
        }));
        setAiDrafts(null);
      } catch (e) {
        setThread([]);
      } finally {
        setLoadingThread(false);
      }
    };

    fetchThread();
  }, [selectedLead]);

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
        setSelectedDraft("A");
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

    const optimisticMsg = {
      id: "opt-" + Date.now(),
      direction: "outbound",
      subject: composer.subject,
      text: composer.body,
      created_at: Date.now() / 1000,
      events: []
    };

    if (selectedLead) {
      setThread(prev => [...prev, optimisticMsg]);
    }

    try {
      const payload = {
        lead_id: selectedLead?.id || "",
        campaign_id: "default",
        from_email: composer.from_email,
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
      await r.json();

      if (!selectedLead) {
        loadLeads();
        setComposer(prev => ({ ...prev, to_email: "", subject: "", body: "" }));
        alert("Email sent! The lead will appear in your inbox shortly.");
      } else {
        setComposer(prev => ({ ...prev, body: "" }));
        // Background refresh
        const rThread = await fetch(`${API}/emailhub/threads/${selectedLead.id}`);
        const dThread = await rThread.json();
        setThread(dThread.messages || []);
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
      from_email: VERIFIED_SENDERS[0].email,
      to_email: "",
      subject: "",
      body: ""
    });
    setAiDrafts(null);
  };

  const filteredLeads = leads.filter(l => {
    if (search && !l.name?.toLowerCase().includes(search.toLowerCase()) && !l.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "Unread" && l.status !== "Responded") return false;
    if (filter === "Responded" && l.status !== "Responded") return false;
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-ink text-mist font-sans">

      {/* COLUMN 1: LEADS LIST */}
      <div className="w-80 flex flex-col border-r border-white/5 bg-slate/30 backdrop-blur-md">
        <div className="p-4 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Inbox size={18} className="text-royal-amethyst" /> Inbox
            </h2>
            <button onClick={startNewEmail} className="p-2 bg-royal-amethyst hover:bg-royal-amethyst/80 rounded-lg text-white transition-all shadow-lg shadow-royal-amethyst/20">
              <Plus size={18} />
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-2.5 text-soft-violet/50 group-focus-within:text-royal-amethyst transition-colors" size={14} />
            <input
              className="w-full bg-midnight-plum/50 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-royal-amethyst/50 transition-all placeholder:text-white/20"
              placeholder="Search leads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 p-1 bg-midnight-plum/30 rounded-lg border border-white/5">
            {["All", "Responded"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 text-xs py-1.5 rounded-md transition-all font-medium ${filter === f ? "bg-royal-amethyst text-white shadow" : "text-soft-violet hover:text-white hover:bg-white/5"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingLeads ? (
            <div className="p-8 text-center text-soft-violet"><Loader2 className="animate-spin mx-auto mb-2 text-royal-amethyst" />Loading...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-white/20 italic text-sm">No conversations found</div>
          ) : (
            filteredLeads.map(lead => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 group relative
                  ${selectedLead?.id === lead.id ? "bg-white/5 border-l-2 border-l-royal-amethyst" : "border-l-2 border-l-transparent"}
                `}
              >
                <div className="flex justify-between mb-1">
                  <span className={`font-semibold text-sm truncate ${selectedLead?.id === lead.id ? "text-white" : "text-mist"}`}>
                    {lead.name || "Unknown"}
                  </span>
                  <span className="text-[10px] text-soft-violet/70">
                    {new Date(lead.created_at * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="text-xs text-soft-violet truncate mb-2">{lead.company}</div>

                <div className="flex items-center justify-between">
                  <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1
                    ${lead.status === "Responded"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : lead.status === "Opened"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-white/5 text-slate-400 border border-white/5"
                    }`}>
                    {lead.status === "Responded" && <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />}
                    {lead.status}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COLUMN 2: THREAD VIEW */}
      <div className="flex-1 flex flex-col bg-midnight-plum/40 relative">
        {selectedLead ? (
          <>
            {/* Thread Header */}
            <div className="h-16 border-b border-white/5 flex items-center px-6 justify-between bg-ink/50 backdrop-blur-sm z-10 sticky top-0">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  {selectedLead.name}
                  {selectedLead.status === "Responded" && <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>}
                </h3>
                <div className="flex items-center gap-3 text-xs text-soft-violet mt-0.5">
                  <span className="flex items-center gap-1.5"><Building size={10} /> {selectedLead.company}</span>
                  <span className="w-1 h-1 rounded-full bg-white/10"></span>
                  <span className="flex items-center gap-1.5"><User size={10} /> {selectedLead.role}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold bg-gradient-to-br from-royal-amethyst to-soft-violet bg-clip-text text-transparent">
                  {Math.round(selectedLead.score || 0)}
                </div>
                <span className="text-[9px] text-soft-violet/50 uppercase tracking-widest font-semibold">Intent Score</span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2 scroll-smooth">
              {loadingThread ? (
                <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-royal-amethyst" size={32} /></div>
              ) : thread.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-soft-violet/40">
                  <Sparkles size={48} className="mb-4 opacity-20" />
                  <p className="text-sm">Start the conversation with {selectedLead.name.split(' ')[0]}</p>
                </div>
              ) : (
                thread.map((m, idx) => (
                  <MessageCard
                    key={m.id || idx}
                    message={m}
                    senderName={selectedLead.name}
                    isLatest={idx === thread.length - 1}
                  />
                ))
              )}
              <div ref={threadEndRef} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-soft-violet/30">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse">
              <Inbox size={48} className="opacity-50" />
            </div>
            <p className="text-lg font-medium text-white/50">Select a conversation</p>
            <p className="text-sm mt-2">or press "+" to compose a new email</p>
          </div>
        )}
      </div>

      {/* COLUMN 3: COMPOSER */}
      <div className="w-[450px] flex flex-col bg-slate border-l border-white/5 shadow-2xl z-20">
        <div className="p-5 border-b border-white/5 bg-ink/20">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Send size={16} className="text-royal-amethyst" />
            {selectedLead ? "Reply to Thread" : "New Message"}
          </h3>
        </div>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSend} className="space-y-5">

            {/* SENDER SELECT */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-soft-violet uppercase tracking-widest">From</label>
              <div className="relative">
                <select
                  required
                  className="w-full appearance-none bg-midnight-plum border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-royal-amethyst focus:ring-1 focus:ring-royal-amethyst/50 outline-none transition-all cursor-pointer"
                  value={composer.from_email}
                  onChange={e => setComposer({ ...composer, from_email: e.target.value })}
                >
                  {VERIFIED_SENDERS.map(s => (
                    <option key={s.email} value={s.email}>{s.label} &lt;{s.email}&gt;</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 text-soft-violet pointer-events-none">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* RECIPIENT INPUT */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-soft-violet uppercase tracking-widest">To</label>
              <input
                required
                type="email"
                className={`w-full bg-midnight-plum border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-royal-amethyst focus:ring-1 focus:ring-royal-amethyst/50 outline-none transition-all
                  ${selectedLead ? "opacity-50 cursor-not-allowed border-transparent" : ""}
                `}
                placeholder="lead@company.com"
                value={composer.to_email}
                onChange={e => setComposer({ ...composer, to_email: e.target.value })}
                disabled={!!selectedLead}
              />
            </div>

            {/* SUBJECT INPUT */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-soft-violet uppercase tracking-widest">Subject</label>
              <input
                required
                className="w-full bg-midnight-plum border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-royal-amethyst focus:ring-1 focus:ring-royal-amethyst/50 outline-none transition-all font-medium"
                placeholder="Subject line..."
                value={composer.subject}
                onChange={e => setComposer({ ...composer, subject: e.target.value })}
              />
            </div>

            {/* AI GENERATOR */}
            {selectedLead && (
              <div className="py-2">
                {!aiDrafts ? (
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={generating}
                    className="group w-full py-3 border border-dashed border-white/10 rounded-xl text-soft-violet text-xs font-medium hover:bg-white/5 hover:border-royal-amethyst/50 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    {generating ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} className="group-hover:text-royal-amethyst transition-colors" />}
                    Generate Draft with AI
                  </button>
                ) : (
                  <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
                    {["A", "B", "C"].map(k => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setSelectedDraft(k)}
                        className={`flex-1 py-1.5 text-xs rounded-md border font-medium transition-all ${selectedDraft === k ? "bg-royal-amethyst border-royal-amethyst text-white shadow" : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"}`}
                      >
                        Draft {k}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BODY TEXTAREA */}
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-bold text-soft-violet uppercase tracking-widest">Message</label>
              <textarea
                required
                className="w-full h-80 bg-midnight-plum border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-royal-amethyst focus:ring-1 focus:ring-royal-amethyst/50 outline-none resize-none font-mono leading-relaxed custom-scrollbar"
                placeholder="Write your message..."
                value={composer.body}
                onChange={e => setComposer({ ...composer, body: e.target.value })}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={sending || !composer.to_email || !composer.body}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-royal-amethyst to-purple-600 hover:from-purple-600 hover:to-royal-amethyst text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-royal-amethyst/30 hover:shadow-royal-amethyst/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                {selectedLead ? "Send Reply" : "Send Email"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailHub;