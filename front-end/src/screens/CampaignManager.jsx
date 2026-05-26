import React, { useEffect, useState, useCallback, useRef } from "react";
import StartNewCampaign from "./StartNewCampaign";
import EnterKeywords from "./EnterKeywords";
import LoadingScreen from "./LoadingScreen";
import { API } from "../config";
import {
  Search, Plus, ExternalLink, ArrowRight, Activity, Globe, FileText,
  Check, HelpCircle, Database, Loader2, ArrowUpRight, Trash2, Edit2,
  X, ChevronDown, ChevronUp, Mail, AlertCircle, CheckSquare, Square,
} from "lucide-react";

// ─── Tiny UI atoms ────────────────────────────────────────────────────────────

const Chip = ({ children, className = "" }) => (
  <span className={`text-[10px] uppercase font-bold text-white bg-white/10 border border-white/5 px-2 py-1 rounded-md ${className}`}>
    {children}
  </span>
);

const InfoTooltip = ({ text }) => (
  <div className="group relative inline-flex items-center ml-2 align-middle">
    <HelpCircle size={14} className="text-white/40 hover:text-white/80 transition-colors cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-black/95 border border-white/10 rounded-xl text-xs leading-relaxed text-white/90 normal-case font-normal opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl text-center">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/95" />
    </div>
  </div>
);

const SectionCard = ({ title, items, text, icon, tooltip, className = "" }) => (
  <div className={`bg-slate rounded-2xl p-6 border border-white/5 hover:border-royal-amethyst/20 transition-colors ${className}`}>
    <div className="flex items-center gap-2 mb-4 text-soft-violet">
      {icon}
      <h3 className="text-xs uppercase tracking-wider font-bold flex flex-1 items-center">
        {title}{tooltip && <InfoTooltip text={tooltip} />}
      </h3>
    </div>
    {Array.isArray(items) && items.length > 0 ? (
      <ul className="space-y-2">
        {items.map((s, i) => (
          <li key={i} className="text-sm text-mist flex items-start gap-2">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-royal-amethyst flex-shrink-0" />
            <span className="leading-relaxed opacity-90">{s}</span>
          </li>
        ))}
      </ul>
    ) : (
      <div className="text-sm text-white/50 italic">{text || "No data available"}</div>
    )}
  </div>
);

// ─── Query Builder ─────────────────────────────────────────────────────────────

const PLATFORMS = [
  { value: "linkedin_posts", label: "LinkedIn Posts" },
  { value: "linkedin_profiles", label: "LinkedIn Profiles" },
  { value: "reddit", label: "Reddit" },
  { value: "twitter", label: "Twitter / X" },
  { value: "any", label: "Any Website" },
];

const INTENTS = [
  { value: "open_to_work", label: "Open to Work / Looking for Clients" },
  { value: "hiring", label: "Looking to Hire / Need Help" },
  { value: "recommending", label: "Asking for Recommendations" },
  { value: "showcasing", label: "Showcasing Work / Portfolio" },
];

function buildQuery(platform, intent, keyword, location) {
  const kw = keyword ? ` "${keyword.trim()}"` : "";
  const loc = location ? ` "${location.trim()}"` : "";

  const phrases = {
    open_to_work: '"open to" OR "available for" OR "looking for clients" OR "taking on projects" OR "available for hire" OR "open to work"',
    hiring: '"looking for a" OR "need a" OR "recommend a" OR "hiring a" OR "need help with"',
    recommending: '"recommend" OR "suggestions for" OR "anyone know a" OR "can anyone suggest"',
    showcasing: '"portfolio" OR "my work" OR "check out" OR "just completed" OR "proud to share"',
  };
  const intentPhrase = phrases[intent] || phrases.open_to_work;

  switch (platform) {
    case "linkedin_posts":
      return `site:linkedin.com (inurl:posts OR inurl:pulse) (${intentPhrase})${kw}${loc}`;
    case "linkedin_profiles":
      return `site:linkedin.com/in (${intentPhrase})${kw}${loc}`;
    case "reddit":
      return `site:reddit.com (${intentPhrase})${kw}${loc}`;
    case "twitter":
      return `(site:twitter.com OR site:x.com) (${intentPhrase})${kw}${loc}`;
    default:
      return `(${intentPhrase})${kw}${loc}`;
  }
}

const QueryBuilder = ({ queries, onChange }) => {
  const [rows, setRows] = useState(() =>
    (queries || []).map((q, i) => ({ id: i, raw: q, editing: false }))
  );
  const [builderOpen, setBuilderOpen] = useState(false);
  const [draft, setDraft] = useState({ platform: "linkedin_posts", intent: "open_to_work", keyword: "", location: "" });

  const pushChanges = (next) => {
    setRows(next);
    onChange(next.map((r) => r.raw));
  };

  const updateRaw = (id, value) => {
    pushChanges(rows.map((r) => (r.id === id ? { ...r, raw: value } : r)));
  };

  const deleteRow = (id) => pushChanges(rows.filter((r) => r.id !== id));

  const toggleEdit = (id) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, editing: !r.editing } : r)));
  };

  const addBuilt = () => {
    const q = buildQuery(draft.platform, draft.intent, draft.keyword, draft.location);
    const next = [...rows, { id: Date.now(), raw: q, editing: false }];
    pushChanges(next);
    setDraft({ platform: "linkedin_posts", intent: "open_to_work", keyword: "", location: "" });
    setBuilderOpen(false);
  };

  const preview = buildQuery(draft.platform, draft.intent, draft.keyword, draft.location);

  return (
    <div className="bg-slate rounded-2xl p-6 border border-white/5">
      <div className="flex items-center gap-2 mb-4 text-soft-violet">
        <Search size={16} />
        <h3 className="text-xs uppercase tracking-wider font-bold flex flex-1 items-center">
          AI Discovery Paths
          <InfoTooltip text="The exact search queries the scraper will run. Edit freely — each row is one Google search." />
        </h3>
      </div>

      {/* Existing query rows */}
      <div className="space-y-2 mb-3">
        {rows.map((row) => (
          <div key={row.id} className="group flex items-start gap-2">
            <span className="mt-2.5 w-1 h-1 rounded-full bg-royal-amethyst flex-shrink-0" />
            {row.editing ? (
              <input
                className="flex-1 bg-white/5 border border-royal-amethyst/40 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-royal-amethyst font-mono"
                value={row.raw}
                onChange={(e) => updateRaw(row.id, e.target.value)}
                onBlur={() => toggleEdit(row.id)}
                autoFocus
              />
            ) : (
              <span className="flex-1 text-xs text-mist leading-relaxed opacity-90 pt-1 font-mono break-all">
                {row.raw}
              </span>
            )}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1">
              <button onClick={() => toggleEdit(row.id)} className="p-1 text-white/40 hover:text-white transition-colors">
                <Edit2 size={12} />
              </button>
              <button onClick={() => deleteRow(row.id)} className="p-1 text-white/40 hover:text-rose-400 transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-white/30 italic">No queries yet — build one below.</p>
        )}
      </div>

      {/* Build new query */}
      <div className="border-t border-white/5 pt-3">
        <button
          onClick={() => setBuilderOpen(!builderOpen)}
          className="flex items-center gap-2 text-xs text-royal-amethyst hover:text-lilac-mist transition-colors font-semibold"
        >
          <Plus size={14} />
          Build new query
          {builderOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {builderOpen && (
          <div className="mt-3 p-4 bg-white/3 border border-white/5 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-soft-violet font-bold mb-1 block">Platform</label>
                <select
                  value={draft.platform}
                  onChange={(e) => setDraft({ ...draft, platform: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-royal-amethyst"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value} className="bg-slate">{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-soft-violet font-bold mb-1 block">Intent Type</label>
                <select
                  value={draft.intent}
                  onChange={(e) => setDraft({ ...draft, intent: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-royal-amethyst"
                >
                  {INTENTS.map((it) => (
                    <option key={it.value} value={it.value} className="bg-slate">{it.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-soft-violet font-bold mb-1 block">Keyword / Profession</label>
                <input
                  className="w-full bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-royal-amethyst placeholder-white/20"
                  placeholder='e.g. photographer, designer'
                  value={draft.keyword}
                  onChange={(e) => setDraft({ ...draft, keyword: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-soft-violet font-bold mb-1 block">Location (optional)</label>
                <input
                  className="w-full bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-royal-amethyst placeholder-white/20"
                  placeholder='e.g. New York, London'
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                />
              </div>
            </div>
            <div className="bg-black/30 rounded-lg p-2">
              <p className="text-[9px] uppercase text-soft-violet font-bold mb-1">Query Preview</p>
              <p className="text-[10px] text-white/60 font-mono break-all">{preview}</p>
            </div>
            <button
              onClick={addBuilt}
              disabled={!draft.keyword.trim()}
              className="w-full py-2 bg-royal-amethyst hover:bg-royal-amethyst/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Add This Query
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Lead Review Modal ─────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: "verified", label: "Verified Email", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { key: "guessed", label: "Guessed Email", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { key: "needs_email", label: "No Email Found", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
];

const LeadReviewModal = ({ leads, summary, campaign, onConfirm, onCancel, loading }) => {
  const [activeTab, setActiveTab] = useState("verified");
  const [localLeads, setLocalLeads] = useState(() =>
    leads.map((l) => ({
      ...l,
      _selected: l.status !== "Needs Email", // default-check verified + guessed
      _emailInput: "",
    }))
  );

  const byTab = {
    verified: localLeads.filter((l) => l.status === "New"),
    guessed: localLeads.filter((l) => l.status === "Guessed"),
    needs_email: localLeads.filter((l) => l.status === "Needs Email"),
  };

  const toggle = (id) =>
    setLocalLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, _selected: !l._selected } : l))
    );

  const setEmail = (id, val) =>
    setLocalLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, _emailInput: val, email: val, _selected: !!val, status: val ? "Guessed" : "Needs Email" } : l
      )
    );

  const toggleAll = (tab, val) => {
    const ids = new Set(byTab[tab].map((l) => l.id));
    setLocalLeads((prev) => prev.map((l) => (ids.has(l.id) ? { ...l, _selected: val } : l)));
  };

  const selected = localLeads.filter((l) => l._selected && l.email);
  const doConfirm = () => {
    const payload = selected.map(({ _selected, _emailInput, ...rest }) => rest);
    onConfirm(payload);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0d0b1a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white">Review Discovered Leads</h2>
            <p className="text-sm text-soft-violet mt-0.5">
              {summary.total} leads found for <span className="text-white font-medium">{campaign?.name}</span>
            </p>
          </div>
          <button onClick={onCancel} className="p-2 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex gap-3 px-6 py-3 border-b border-white/5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Check size={12} /> {summary.verified} verified
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <Mail size={12} /> {summary.guessed} guessed
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
            <AlertCircle size={12} /> {summary.needs_email} no email
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-6">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === tab.key
                  ? `border-royal-amethyst ${tab.color}`
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              {tab.label} ({byTab[tab.key].length})
            </button>
          ))}
        </div>

        {/* Lead list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {byTab[activeTab].length === 0 && (
            <p className="text-center text-white/30 italic py-8 text-sm">No leads in this category.</p>
          )}

          {byTab[activeTab].length > 0 && (
            <div className="flex items-center justify-between mb-2 px-2">
              <button onClick={() => toggleAll(activeTab, true)} className="text-[10px] text-royal-amethyst hover:text-lilac-mist">
                Select all
              </button>
              <button onClick={() => toggleAll(activeTab, false)} className="text-[10px] text-white/30 hover:text-white/60">
                Deselect all
              </button>
            </div>
          )}

          {byTab[activeTab].map((lead) => (
            <div
              key={lead.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                lead._selected
                  ? "bg-white/5 border-white/10"
                  : "bg-transparent border-white/5 opacity-50"
              }`}
              onClick={() => activeTab !== "needs_email" && toggle(lead.id)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggle(lead.id); }}
                className="mt-0.5 flex-shrink-0 text-white/40 hover:text-white transition-colors"
              >
                {lead._selected ? <CheckSquare size={16} className="text-royal-amethyst" /> : <Square size={16} />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white truncate">{lead.name || "Unknown"}</span>
                  {lead.role && (
                    <span className="text-[10px] text-soft-violet bg-white/5 px-2 py-0.5 rounded-full">{lead.role}</span>
                  )}
                  {lead.company && (
                    <span className="text-[10px] text-white/40 truncate max-w-[120px]">{lead.company}</span>
                  )}
                </div>

                {activeTab === "needs_email" ? (
                  <input
                    className="mt-2 w-full bg-white/5 border border-white/10 focus:border-royal-amethyst text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none placeholder-white/20"
                    placeholder="Enter email manually..."
                    value={lead._emailInput}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEmail(lead.id, e.target.value)}
                  />
                ) : (
                  <div className="text-xs text-soft-violet mt-0.5 truncate">{lead.email}</div>
                )}
              </div>

              <div className={`text-lg font-bold flex-shrink-0 ${lead.score > 70 ? "text-emerald-400" : lead.score > 45 ? "text-amber-400" : "text-rose-400"}`}>
                {lead.score}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            {selected.length} leads selected for import
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 transition font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={doConfirm}
              disabled={selected.length === 0 || loading}
              className="px-6 py-2.5 rounded-xl bg-royal-amethyst hover:bg-royal-amethyst/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition shadow-lg shadow-royal-amethyst/20 flex items-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Import {selected.length} leads
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Campaign Card ─────────────────────────────────────────────────────────────

const CampaignCard = ({ campaign, favicon, domain, onView, onGenerate, generating }) => {
  const created = campaign.created_at
    ? new Date(campaign.created_at * 1000).toLocaleDateString()
    : "—";
  const chips = (campaign.brief?.services || []).slice(0, 3);

  return (
    <div className="group bg-slate rounded-2xl border border-white/5 hover:border-royal-amethyst/40 transition-all duration-300 hover:shadow-2xl hover:shadow-royal-amethyst/10 flex flex-col h-full overflow-hidden">
      <div className="p-6 flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              {favicon && favicon !== "/favicon.ico" ? (
                <img src={favicon} alt="" className="w-6 h-6 rounded-md" />
              ) : (
                <Globe size={18} className="text-royal-amethyst" />
              )}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight group-hover:text-lilac-mist transition-colors">{campaign.name || "Untitled"}</h3>
              <a href={campaign.website} target="_blank" rel="noreferrer" className="text-xs text-soft-violet hover:text-white transition-colors truncate block max-w-[200px] mt-0.5">
                {domain || "No domain"}
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4 h-14 content-start">
          {chips.map((s, i) => <Chip key={i}>{s}</Chip>)}
          {campaign.brief?.services?.length > 3 && (
            <span className="text-[10px] text-soft-violet py-1 px-1">+{campaign.brief.services.length - 3}</span>
          )}
        </div>
        <div className="text-xs text-white/30 pt-4 border-t border-white/5">Created on {created}</div>
      </div>
      <div className="p-4 bg-white/5 border-t border-white/5 flex items-center gap-3">
        <button onClick={onView} className="flex-1 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors">
          View Details
        </button>
        <button
          onClick={onGenerate}
          disabled={generating}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            generating
              ? "bg-white/10 text-white/50 cursor-not-allowed"
              : "bg-royal-amethyst text-white hover:bg-royal-amethyst/90 shadow-lg shadow-royal-amethyst/20"
          }`}
        >
          {generating ? "Finding..." : "Find Leads"}
        </button>
      </div>
    </div>
  );
};

// ─── Main CampaignManager ──────────────────────────────────────────────────────

const CampaignManager = ({ onNavigate = () => {} }) => {
  const [stage, setStage] = useState("list");
  const [campaigns, setCampaigns] = useState([]);
  const [draft, setDraft] = useState(null);
  const [current, setCurrent] = useState(null);
  const [showLoading, setShowLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [campaignLeads, setCampaignLeads] = useState([]);
  const [loadingCampaignLeads, setLoadingCampaignLeads] = useState(false);

  // Review modal state
  const [reviewData, setReviewData] = useState(null); // { leads, summary, campaign }
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [importResult, setImportResult] = useState(null); // { count, campaign }

  // Query builder state — lives at top level to avoid hook-in-conditional violation
  const [queries, setQueries] = useState([]);
  const [campaignNameInput, setCampaignNameInput] = useState("");
  const nameRef = useRef(null);

  useEffect(() => {
    if (stage === "view" && current) {
      setLoadingCampaignLeads(true);
      fetch(`${API}/emailhub/leads`, { credentials: "include" })
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setCampaignLeads(data.filter((l) => l.campaign_id === current.id)))
        .catch(() => {})
        .finally(() => setLoadingCampaignLeads(false));
    }
  }, [stage, current]);

  // Sync query builder + name input whenever the user reaches the review stage with a new draft
  useEffect(() => {
    if (draft?.brief) {
      setQueries(draft.brief.search_queries || []);
      const def = (draft.brief.services && draft.brief.services[0]) || "New Campaign";
      setCampaignNameInput(def);
    }
  }, [draft]);

  const domainFromUrl = (u) => {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
  };
  const faviconFor = (u) =>
    u ? `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(u)}` : null;

  const filtered = campaigns
    .filter((c) =>
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.website || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortBy === "name"
        ? (a.name || "").localeCompare(b.name || "")
        : (b.created_at || 0) - (a.created_at || 0)
    );

  // Stream handler — collects all progress then fires review modal
  const handleStreamingDiscovery = useCallback(async (r, c) => {
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.detail || e.message || `Discover failed (${r.status})`);
    }

    const reader = r.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let isDone = false;

    while (!isDone) {
      const { value, done } = await reader.read();
      isDone = done;
      if (!value) continue;

      const lines = decoder.decode(value, { stream: true }).split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === "progress") {
            setLoadingProgress(data.progress);
            setLoadingMessage(data.step);
          } else if (data.type === "final") {
            setShowLoading(false);
            setReviewData({ leads: data.leads || [], summary: data.summary || {}, campaign: c });
          } else if (data.type === "error") {
            throw new Error(data.message);
          }
        } catch (e) {
          if (e.message?.startsWith("Server Error")) throw e;
        }
      }
    }
  }, []);

  const runDiscovery = useCallback(async (c) => {
    setBusyId(c.id);
    setShowLoading(true);
    setLoadingProgress(0);
    setLoadingMessage("Connecting to search cluster...");
    setErrorMsg("");
    try {
      const r = await fetch(`${API}/campaigns/${c.id}/discover`, { method: "POST", credentials: "include" });
      await handleStreamingDiscovery(r, c);
    } catch (e) {
      setErrorMsg(e.message || "Lead discovery failed.");
      setShowLoading(false);
    } finally {
      setBusyId(null);
      setBusy(false);
    }
  }, [handleStreamingDiscovery]);

  const confirmImport = async (selectedLeads) => {
    if (!reviewData) return;
    setConfirmLoading(true);
    try {
      const r = await fetch(`${API}/campaigns/${reviewData.campaign.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ leads: selectedLeads }),
      });
      if (!r.ok) throw new Error("Import failed");
      const res = await r.json();
      setImportResult({ count: res.imported, campaign: reviewData.campaign });
      setReviewData(null);
      setStage("success");
    } catch (e) {
      setErrorMsg(e.message || "Import failed — try again.");
    } finally {
      setConfirmLoading(false);
    }
  };

  useEffect(() => {
    fetch(`${API}/campaigns`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setCampaigns([]));
  }, []);

  const startFlow = () => { setDraft(null); setStage("collect"); };

  const handleWebsiteNext = (payload) => {
    if (payload.step === "brief_ready" && payload.brief) {
      setDraft({ website: payload.website || "", brief: payload.brief });
      setStage("review");
    } else {
      setDraft({ website: payload.website || "", brief: null });
      setStage("fallback");
    }
  };

  const saveCampaign = async (name, brief) => {
    const website = draft?.website || null;
    try {
      const res = await fetch(`${API}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, website, brief }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const saved = await res.json();
      setCampaigns((prev) => [saved, ...prev]);
      setCurrent(saved);
      setStage("view");
    } catch {
      alert("Failed to save campaign. Please try again.");
    }
  };

  // ── Sub-screens ────────────────────────────────────────────────────────────

  if (stage === "collect") return <StartNewCampaign onNext={handleWebsiteNext} />;

  if (stage === "fallback") {
    return (
      <EnterKeywords
        website={draft?.website}
        onBack={() => setStage("collect")}
        onReady={({ brief }) => {
          setDraft({ website: draft?.website || "", brief });
          setStage("review");
        }}
      />
    );
  }

  if (stage === "review") {
    const brief = draft?.brief || {};
    const nameDefault = (brief.services && brief.services[0]) || "New Campaign";

    const handleSave = () => {
      saveCampaign(campaignNameInput || nameDefault, { ...brief, search_queries: queries });
    };

    return (
      <div className="p-8 max-w-7xl mx-auto min-h-screen animate-in fade-in duration-300">
        <button className="text-sm text-soft-violet hover:text-white mb-6 flex items-center gap-2 transition-colors" onClick={() => setStage("collect")}>
          <ArrowRight size={14} className="rotate-180" /> Back
        </button>

        <div className="flex flex-col md:flex-row gap-6 items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Review Campaign Brief</h2>
            <div className="text-mist opacity-70">Website: <span className="text-white">{draft?.website || "—"}</span></div>
          </div>
          <div className="w-full md:w-auto bg-slate p-1 rounded-xl border border-white/10 flex items-center gap-2">
            <input
              className="bg-transparent border-none text-white px-4 py-2 w-full md:w-64 focus:ring-0 placeholder:text-white/30"
              value={campaignNameInput}
              onChange={(e) => setCampaignNameInput(e.target.value)}
              placeholder="Name your campaign..."
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <button
              className="bg-royal-amethyst text-white px-6 py-2 rounded-lg font-semibold hover:bg-royal-amethyst/90 whitespace-nowrap transition-colors"
              onClick={handleSave}
            >
              Save & Create
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <SectionCard title="Target Audience (ICP)" text={brief.icp_summary} icon={<FileText size={16} />}
            tooltip="Ideal Customer Profile — who has the problem your product solves."
            className="md:col-span-2" />
          <SectionCard title="Identified Offerings" items={brief.services} icon={<Activity size={16} />}
            tooltip="Core products or services our AI identified from the website." />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <SectionCard title="Buying Signals" items={brief.lead_signals} icon={<Check size={16} />}
            tooltip="Intent markers people use on social channels when they need your service." />
          {/* Editable query builder in place of static list */}
          <div className="lg:col-span-2">
            <QueryBuilder queries={queries} onChange={setQueries} />
          </div>
          <SectionCard title="Messaging Angles" items={brief.outreach_angles} icon={<ExternalLink size={16} />}
            tooltip="Suggestions for how the AI Email Writer will draft outbound campaigns." />
        </div>

        <div className="mt-8 text-center">
          <button className="text-soft-violet hover:text-white underline decoration-white/20 hover:decoration-white transition-all text-sm" onClick={() => setStage("fallback")}>
            Results look wrong? Describe it manually instead.
          </button>
        </div>
      </div>
    );
  }

  if (stage === "view" && current) {
    const brief = current.brief || {};
    const domain = domainFromUrl(current.website || "");
    const favicon = faviconFor(current.website);

    return (
      <div className="p-8 space-y-8 animate-in fade-in duration-300">
        <button className="text-sm text-soft-violet hover:text-white flex items-center gap-2 transition-colors" onClick={() => setStage("list")}>
          <ArrowRight size={14} className="rotate-180" /> Back to Campaigns
        </button>

        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start justify-between">
            <div className="text-rose-400 text-sm font-medium">{errorMsg}</div>
            <button onClick={() => setErrorMsg("")} className="text-white/50 hover:text-white">✕</button>
          </div>
        )}

        {/* Review modal (rendered on top of view stage) */}
        {reviewData && (
          <LeadReviewModal
            leads={reviewData.leads}
            summary={reviewData.summary}
            campaign={reviewData.campaign}
            loading={confirmLoading}
            onConfirm={confirmImport}
            onCancel={() => setReviewData(null)}
          />
        )}

        {showLoading && (
          <div className="fixed inset-0 z-[10000] pointer-events-auto">
            <LoadingScreen progress={loadingProgress} message={loadingMessage} />
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-slate p-6 rounded-2xl border border-white/5 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              {favicon ? <img src={favicon} alt="" className="w-8 h-8 rounded-md" /> : <Globe className="text-royal-amethyst" size={32} />}
            </div>
            <div>
              <h2 className="text-3xl text-white font-bold">{current.name}</h2>
              <div className="text-sm text-mist mt-1 flex items-center gap-2">
                <Globe size={12} className="text-soft-violet" />
                {current.website ? (
                  <a href={current.website} target="_blank" rel="noreferrer" className="hover:text-white transition-colors hover:underline">{domain}</a>
                ) : <span className="opacity-50">No website linked</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStage("fallback")} className="px-5 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 transition font-medium">
              Edit Brief
            </button>
            <button
              onClick={() => { setBusy(true); runDiscovery(current); }}
              disabled={busy}
              className={`px-6 py-3 rounded-xl transition font-bold shadow-lg shadow-royal-amethyst/20 flex items-center gap-2 ${busy ? "bg-white/10 text-white/50" : "bg-royal-amethyst text-white hover:bg-royal-amethyst/90"}`}
            >
              {busy ? "Finding leads…" : "Find More Leads"}
              {!busy && <ArrowRight size={18} />}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <SectionCard title="Target Audience (ICP)" text={brief.icp_summary} icon={<FileText size={16} />}
            tooltip="Ideal Customer Profile." className="md:col-span-2" />
          <SectionCard title="Identified Offerings" items={brief.services} icon={<Activity size={16} />} />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SectionCard title="Buying Signals" items={brief.lead_signals} icon={<Check size={16} />} />
          <SectionCard title="AI Discovery Paths" items={brief.search_queries} icon={<Search size={16} />}
            tooltip="The search queries that ran to find these leads." />
          <SectionCard title="Platform Filters" items={brief.exclude_domains}
            text={brief.exclude_domains?.length ? undefined : "Standard exclusions applied"} icon={<Globe size={16} />} />
          <SectionCard title="Messaging Angles" items={brief.outreach_angles} icon={<ExternalLink size={16} />} />
        </div>

        <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Database size={20} className="text-royal-amethyst" />
                Discovered Leads Repository
              </h3>
              <p className="text-sm text-soft-violet mt-1">Review AI match reasons and initiate outreach for this campaign.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5 bg-midnight-plum/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-soft-violet bg-midnight-plum/50">
                  <th className="py-4 pl-6 pr-4 font-semibold w-1/4">Contact & Role</th>
                  <th className="py-4 pr-4 font-semibold">Score</th>
                  <th className="py-4 pr-4 font-semibold w-2/5">Match Signals</th>
                  <th className="py-4 pr-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm align-top">
                {loadingCampaignLeads ? (
                  <tr><td colSpan="4" className="py-12 text-center text-soft-violet">
                    <Loader2 size={24} className="animate-spin text-royal-amethyst mx-auto mb-2" />
                    Loading leads...
                  </td></tr>
                ) : campaignLeads.length === 0 ? (
                  <tr><td colSpan="4" className="py-12 text-center text-soft-violet italic">
                    No leads yet. Click "Find More Leads" above.
                  </td></tr>
                ) : (
                  campaignLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="py-5 pl-6 pr-4">
                        <div className="font-semibold text-white group-hover:text-lilac-mist transition-colors">{lead.name}</div>
                        <div className="text-[11px] text-soft-violet flex items-center gap-1 mt-1 truncate max-w-[200px]">
                          <span className="truncate">{lead.role || "Target Persona"}</span>
                          {lead.company && <><span className="w-1 h-1 rounded-full bg-white/20 flex-shrink-0" /><span className="truncate">{lead.company}</span></>}
                        </div>
                        {lead.status === "Guessed" && (
                          <div className="text-[9px] bg-amber-500/20 text-amber-400 mt-1 uppercase px-1 rounded-sm inline-block font-semibold">Guessed Email</div>
                        )}
                      </td>
                      <td className="py-5 pr-4">
                        <span className={`text-lg font-bold ${lead.score > 75 ? "text-emerald-400" : lead.score > 50 ? "text-amber-400" : "text-rose-400"}`}>
                          {lead.score}
                        </span>
                      </td>
                      <td className="py-5 pr-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(lead.match_reasons || []).map((r, i) => (
                            <span key={i} className="px-2 py-1 bg-royal-amethyst/10 border border-royal-amethyst/20 text-lilac-mist rounded text-[10px] uppercase font-bold tracking-wide shadow-sm">{r}</span>
                          ))}
                          {(!lead.match_reasons || lead.match_reasons.length === 0) && (
                            <span className="text-xs text-white/30 italic">No signals mapped.</span>
                          )}
                        </div>
                      </td>
                      <td className="py-5 pr-6 text-right align-middle">
                        <button
                          onClick={() => { localStorage.setItem("active_lead_draft_id", lead.id); onNavigate("emailhub"); }}
                          className="px-4 py-2 bg-white/5 hover:bg-royal-amethyst hover:text-white border border-white/10 hover:border-royal-amethyst rounded-xl transition-all text-xs font-bold text-mist inline-flex items-center gap-2 shadow-lg shadow-transparent hover:shadow-royal-amethyst/20"
                        >
                          Draft Email <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "success" && importResult) {
    const { count, campaign } = importResult;
    return (
      <div className="p-8 max-w-4xl mx-auto min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
        <div className="bg-slate rounded-3xl border border-white/5 p-10 w-full shadow-2xl backdrop-blur-sm text-center">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
            <Check size={40} className="text-green-400" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">Import Complete!</h2>
          <p className="text-mist mb-8 text-lg">
            <span className="text-white font-bold">{count} leads</span> imported to <span className="text-white font-bold">{campaign?.name}</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button
              onClick={() => { setImportResult(null); setStage("list"); }}
              className="px-6 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 transition font-medium"
            >
              Back to Campaigns
            </button>
            <button
              onClick={() => onNavigate && onNavigate("emailhub")}
              className="px-8 py-3 rounded-xl text-white font-bold bg-royal-amethyst hover:bg-royal-amethyst/90 transition shadow-lg shadow-royal-amethyst/20 flex items-center justify-center gap-2"
            >
              Go to Email Hub <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Campaign list ──────────────────────────────────────────────────────────
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      {errorMsg && (
        <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start justify-between">
          <div className="text-rose-400 text-sm font-medium">{errorMsg}</div>
          <button onClick={() => setErrorMsg("")} className="text-white/50 hover:text-white">✕</button>
        </div>
      )}

      {/* Review modal can also appear from the list stage */}
      {reviewData && (
        <LeadReviewModal
          leads={reviewData.leads}
          summary={reviewData.summary}
          campaign={reviewData.campaign}
          loading={confirmLoading}
          onConfirm={confirmImport}
          onCancel={() => setReviewData(null)}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="text-soft-violet text-sm font-semibold uppercase tracking-wider mb-1">Overview</div>
          <h2 className="text-3xl text-white font-bold">All Campaigns</h2>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:items-center bg-slate/50 p-1.5 rounded-2xl border border-white/5">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-royal-amethyst transition-colors" size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
              className="bg-transparent text-white pl-10 pr-4 py-2 w-full md:w-64 placeholder:text-white/20 focus:outline-none" />
          </div>
          <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-white/80 py-2 pl-2 pr-8 text-sm focus:outline-none cursor-pointer hover:text-white">
            <option value="recent" className="bg-slate text-white">Recent</option>
            <option value="name" className="bg-slate text-white">Name</option>
          </select>
          <button onClick={startFlow}
            className="bg-royal-amethyst text-white font-semibold px-5 py-2 rounded-xl hover:bg-royal-amethyst/90 transition shadow-lg shadow-royal-amethyst/20 flex items-center gap-2">
            <Plus size={18} /><span>New Campaign</span>
          </button>
        </div>
      </div>

      {showLoading && (
        <div className="fixed inset-0 z-50">
          <LoadingScreen progress={loadingProgress} message={loadingMessage} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-soft-violet bg-slate border-dashed border-2 border-white/10 rounded-2xl p-16 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
            <Search className="text-white/20" size={32} />
          </div>
          <p>No campaigns found.</p>
          <button onClick={startFlow} className="text-white font-semibold hover:underline">Create your first campaign</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              favicon={faviconFor(c.website)}
              domain={domainFromUrl(c.website || "")}
              onView={() => { setCurrent(c); setStage("view"); }}
              onGenerate={() => runDiscovery(c)}
              generating={busyId === c.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CampaignManager;
