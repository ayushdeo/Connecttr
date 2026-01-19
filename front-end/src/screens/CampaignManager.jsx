
import React, { useEffect, useState } from "react";
import StartNewCampaign from "./StartNewCampaign";
import EnterKeywords from "./EnterKeywords";
import LoadingScreen from "./LoadingScreen";
import { API } from "../config";
import { Search, Plus, ExternalLink, ArrowRight, Activity, Globe, FileText, Check } from "lucide-react";

// Helper components
const Chip = ({ children }) => (
  <span className="text-[10px] uppercase font-bold text-white bg-white/10 border border-white/5 px-2 py-1 rounded-md">{children}</span>
);

const SectionCard = ({ title, items, text, icon }) => (
  <div className="bg-slate rounded-2xl p-6 border border-white/5 hover:border-royal-amethyst/20 transition-colors">
    <div className="flex items-center gap-2 mb-4 text-soft-violet">
      {icon}
      <h3 className="text-xs uppercase tracking-wider font-bold">{title}</h3>
    </div>
    {Array.isArray(items) && items.length > 0 ? (
      <ul className="space-y-2">
        {items.map((s, i) => (
          <li key={i} className="text-sm text-mist flex items-start gap-2">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-royal-amethyst flex-shrink-0"></span>
            <span className="leading-relaxed opacity-90">{s}</span>
          </li>
        ))}
      </ul>
    ) : (
      <div className="text-sm text-white/50 italic">{text || "No data available"}</div>
    )}
  </div>
);

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

        <div className="text-xs text-white/30 pt-4 border-t border-white/5">
          Created on {created}
        </div>
      </div>

      <div className="p-4 bg-white/5 border-t border-white/5 flex items-center gap-3">
        <button
          onClick={onView}
          className="flex-1 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors"
        >
          View Details
        </button>
        <button
          onClick={onGenerate}
          disabled={generating}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all
            ${generating
              ? "bg-white/10 text-white/50 cursor-not-allowed"
              : "bg-royal-amethyst text-white hover:bg-royal-amethyst/90 shadow-lg shadow-royal-amethyst/20"}`}
        >
          {generating ? "Working..." : "Find Leads"}
        </button>
      </div>
    </div>
  );
};

const CampaignManager = ({ onNavigate = () => { } }) => {
  // Recompile trigger
  const [stage, setStage] = useState("list"); // list | collect | fallback | review | view
  const [campaigns, setCampaigns] = useState([]);
  const [draft, setDraft] = useState(null);   // { website, brief }
  const [current, setCurrent] = useState(null);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingDone, setLoadingDone] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [busy, setBusy] = useState(false);

  const domainFromUrl = (u) => {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
  };
  const faviconFor = (u) =>
    u ? `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(u)}` : null;

  const filtered = campaigns
    .filter(c =>
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.website || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return (b.created_at || 0) - (a.created_at || 0);
    });

  async function generateForCampaign(c) {
    if (busyId) return;
    setBusyId(c.id);
    setShowLoading(true);
    setLoadingDone(false);
    try {
      const r = await fetch(`${API}/campaigns/${c.id}/discover`, { method: "POST" });
      if (!r.ok) {
        throw new Error(`Discover failed (${r.status})`);
      }
      const data = await r.json().catch(() => ({}));
      console.log("Imported", data.imported, "leads for", c.name);
      setLoadingDone(true);
    } catch (e) {
      alert(e.message || "Lead discovery failed.");
      setShowLoading(false);
    } finally {
      setBusyId(null);
    }
  }

  async function generateLeads() {
    if (!current?.id || busy) return;
    setBusy(true);
    setShowLoading(true);
    setLoadingDone(false);
    try {
      const r = await fetch(`${API}/campaigns/${current.id}/discover`, { method: "POST" });
      if (!r.ok) {
        throw new Error(`Discover failed (${r.status})`);
      }
      const { imported } = await r.json().catch(() => ({}));
      setLoadingDone(true);
    } catch (e) {
      console.error(e);
      alert("Lead discovery failed.");
      setShowLoading(false);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    fetch(`${API}/campaigns`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setCampaigns([]));
  }, []);

  const startFlow = () => { setDraft(null); setStage("collect"); };

  const handleWebsiteNext = (payload) => {
    if (payload.step === "brief_ready" && payload.brief) {
      setDraft({ website: payload.website || "", brief: payload.brief });
      setStage("review");
      return;
    }
    setDraft({ website: payload.website || "", brief: null });
    setStage("fallback");
  };

  const saveCampaign = async (name, brief) => {
    const website = draft?.website || null;
    try {
      const res = await fetch(`${API}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, website, brief })
      });
      if (!res.ok) throw new Error("Failed to save");
      const saved = await res.json();
      setCampaigns(prev => [saved, ...prev]);
      setCurrent(saved);
      setStage("view");
    } catch (e) {
      alert("Failed to save campaign");
    }
  };

  // Screens
  if (stage === "collect") {
    return <StartNewCampaign onNext={handleWebsiteNext} />;
  }

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
              defaultValue={nameDefault}
              placeholder="Name your campaign..."
              onKeyDown={(e) => e.key === "Enter" && saveCampaign(e.currentTarget.value, brief)}
            />
            <button
              className="bg-royal-amethyst text-white px-6 py-2 rounded-lg font-semibold hover:bg-royal-amethyst/90 whitespace-nowrap transition-colors"
              onClick={(e) => {
                const input = e.currentTarget.previousSibling;
                saveCampaign(input.value || nameDefault, brief);
              }}
            >
              Save & Create
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SectionCard title="Services" items={brief.services} icon={<Activity size={16} />} />
          <SectionCard title="ICP Summary" text={brief.icp_summary} icon={<FileText size={16} />} />
          <SectionCard title="Lead Signals" items={brief.lead_signals} icon={<Check size={16} />} />
          <SectionCard title="Search Queries" items={brief.search_queries} icon={<Search size={16} />} />
          <SectionCard title="Target Domains" text="Optimized for B2B discovery" icon={<Globe size={16} />} />
          <SectionCard title="Outreach Angles" items={brief.outreach_angles} icon={<ExternalLink size={16} />} />
        </div>

        <div className="mt-8 text-center">
          <button className="text-soft-violet hover:text-white underline decoration-white/20 hover:decoration-white transition-all text-sm" onClick={() => setStage("fallback")}>
            Results looks wrong? Describe it manually instead.
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
        <button
          className="text-sm text-soft-violet hover:text-white flex items-center gap-2 transition-colors"
          onClick={() => setStage("list")}
        >
          <ArrowRight size={14} className="rotate-180" /> Back to Campaigns
        </button>

        {/* Header */}
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
                  <a
                    href={current.website}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors hover:underline"
                  >
                    {domain}
                  </a>
                ) : <span className="opacity-50">No website linked</span>}
              </div>
            </div>
          </div>

          {showLoading && (
            <div className="fixed inset-0 z-[10000]">
              <LoadingScreen
                isDone={loadingDone}
                onComplete={() => {
                  setShowLoading(false);
                  setLoadingDone(false);
                  if (onNavigate) onNavigate("emailhub");
                }}
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStage("fallback")}
              className="px-5 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 transition font-medium"
            >
              Edit Brief
            </button>
            <button
              onClick={generateLeads}
              disabled={busy}
              className={`px-6 py-3 rounded-xl transition font-bold shadow-lg shadow-royal-amethyst/20 flex items-center gap-2
                ${busy ? "bg-white/10 text-white/50" : "bg-royal-amethyst text-white hover:bg-royal-amethyst/90"}`}
            >
              {busy ? "Finding leads…" : "Find More Leads"}
              {!busy && <ArrowRight size={18} />}
            </button>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SectionCard title="Services" items={brief.services} icon={<Activity size={16} />} />
          <SectionCard title="ICP Summary" text={brief.icp_summary} icon={<FileText size={16} />} />
          <SectionCard title="Lead Signals" items={brief.lead_signals} icon={<Check size={16} />} />
          <SectionCard title="Search Queries" items={brief.search_queries} icon={<Search size={16} />} />
          <SectionCard title="Target Domains" items={brief.exclude_domains} text="Standard exclusions applied" icon={<Globe size={16} />} />
          <SectionCard title="Outreach Angles" items={brief.outreach_angles} icon={<ExternalLink size={16} />} />
        </div>
      </div>
    );
  }

  // list
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="text-soft-violet text-sm font-semibold uppercase tracking-wider mb-1">Overview</div>
          <h2 className="text-3xl text-white font-bold">All Campaigns</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center bg-slate/50 p-1.5 rounded-2xl border border-white/5">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-royal-amethyst transition-colors" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-transparent text-white pl-10 pr-4 py-2 w-full md:w-64 placeholder:text-white/20 focus:outline-none"
            />
          </div>
          <div className="h-6 w-px bg-white/10 mx-1 hidden md:block"></div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-white/80 py-2 pl-2 pr-8 text-sm focus:outline-none cursor-pointer hover:text-white"
          >
            <option value="recent" className="bg-slate text-white">Recent</option>
            <option value="name" className="bg-slate text-white">Name</option>
          </select>
          <button
            onClick={startFlow}
            className="bg-royal-amethyst text-white font-semibold px-5 py-2 rounded-xl hover:bg-royal-amethyst/90 transition shadow-lg shadow-royal-amethyst/20 flex items-center gap-2"
          >
            <Plus size={18} />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {showLoading && (
        <div className="fixed inset-0 z-50">
          <LoadingScreen
            isDone={loadingDone}
            onComplete={() => {
              setShowLoading(false);
              setLoadingDone(false);
              if (onNavigate) onNavigate("emailhub");
            }}
          />
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
              onGenerate={() => generateForCampaign(c)}
              generating={busyId === c.id}
            />
          ))}

        </div>
      )}
    </div>
  );
};

export default CampaignManager;