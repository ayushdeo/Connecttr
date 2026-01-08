import React, { useEffect, useState } from "react";
import StartNewCampaign from "./StartNewCampaign";
import EnterKeywords from "./EnterKeywords";
import LoadingScreen from "./LoadingScreen";
import { API } from "../config";

const CampaignManager = ({ onNavigate = () => { } }) => {
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
    u ? `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(u)}` : "/favicon.ico";

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
      console.log(`Imported ${imported ?? 0} leads`);
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
      <div className="p-8 max-w-5xl mx-auto">
        <button className="text-sm text-[#94A3B8] hover:underline" onClick={() => setStage("collect")}>← Back</button>
        <h2 className="text-2xl font-semibold text-white mt-2 mb-4">Review What We Learned</h2>
        <div className="text-sm text-[#94A3B8] mb-3">Website: {draft?.website || "—"}</div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Services" items={brief.services} />
          <Card title="ICP Summary" text={brief.icp_summary} />
          <Card title="Lead Signals" items={brief.lead_signals} />
          <Card title="Search Queries" items={brief.search_queries} />
          <Card title="Exclude Terms" items={brief.exclude_terms} />
          <Card title="Exclude Domains" items={brief.exclude_domains} />
          <Card title="Outreach Angles" items={brief.outreach_angles} />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <input
            className="border rounded-md px-3 py-2 w-80 text-black"
            defaultValue={nameDefault}
            onKeyDown={(e) => e.key === "Enter" && saveCampaign(e.currentTarget.value, brief)}
          />
          <button className="bg-white text-[#0257AC] px-4 py-2 rounded-md" onClick={(e) => {
            const input = e.currentTarget.previousSibling;
            saveCampaign(input.value || nameDefault, brief);
          }}>
            Looks good — Save
          </button>
          <button className="text-white/80 underline" onClick={() => setStage("fallback")}>
            Not accurate? Describe it instead
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
      <div className="p-8 space-y-6">
        <button
          className="text-sm text-[#AFC7E6] hover:underline"
          onClick={() => setStage("list")}
        >
          ← Back to Campaigns
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={favicon} alt="" className="w-10 h-10 rounded-md ring-1 ring-white/20" />
            <div>
              <h2 className="text-3xl text-white font-semibold">{current.name}</h2>
              <div className="text-sm text-[#AFC7E6]">
                Website:{" "}
                {current.website ? (
                  <a
                    href={current.website}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-white/90"
                    title={current.website}
                  >
                    {domain}
                  </a>
                ) : "—"}
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
              className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 border border-white/10 transition"
            >
              Edit Brief
            </button>
            <button
              onClick={generateLeads}
              disabled={busy}
              className={`px-4 py-2 rounded-xl transition
                ${busy ? "bg-white text-[#0257AC] opacity-90" : "bg-white text-[#0257AC] hover:bg-slate-100"}`}
            >
              {busy ? "Finding leads…" : "Generate Leads"}
            </button>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid md:grid-cols-2 gap-5">
          <SectionCard title="Services" items={brief.services} />
          <SectionCard title="Lead Signals" items={brief.lead_signals} />
          <SectionCard title="Search Queries" items={brief.search_queries} />
          <SectionCard title="Exclude Terms" items={brief.exclude_terms} />
          <SectionCard title="Exclude Domains" items={brief.exclude_domains} />
          <SectionCard title="Outreach Angles" items={brief.outreach_angles} />
        </div>
      </div>
    );
  }

  // list
  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl text-[#E0F2FF] font-semibold">All Campaigns</h2>

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or website…"
            className="bg-white/90 text-slate-800 rounded-xl px-4 py-2 w-full md:w-72 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6CA7FF]"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white/90 text-slate-800 rounded-xl px-3 py-2"
          >
            <option value="recent">Sort: Recent</option>
            <option value="name">Sort: Name</option>
          </select>
          <button
            onClick={startFlow}
            className="bg-white text-[#0257AC] font-semibold px-4 py-2 rounded-xl hover:bg-slate-100 transition"
          >
            + New Campaign
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
        <div className="text-[#94A3B8] bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
          No campaigns yet. Click <span className="text-white font-medium">New Campaign</span> to start.
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

const Card = ({ title, items, text }) => (
  <div className="bg-[#023E7D] rounded-2xl p-4 text-white">
    <div className="text-sm text-[#94A3B8] mb-2">{title}</div>
    {Array.isArray(items) ? (
      items && items.length ? (
        <ul className="list-disc list-inside space-y-1 text-sm">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
      ) : <div className="text-[#94A3B8] text-sm">—</div>
    ) : <div className="text-[#94A3B8] text-sm whitespace-pre-wrap">{text || "—"}</div>}
  </div>
);

// --- UI helpers (one copy only)
const btnBase = "px-3 py-2 rounded-lg text-sm font-semibold transition focus:outline-none";
const btnPrimary = "bg-white text-[#0257AC] hover:bg-slate-100 focus:ring-2 focus:ring-white/60";
const btnSecondary = "bg-white/10 text-white border border-white/20 hover:bg-white/15 focus:ring-2 focus:ring-white/30";

const Chip = ({ children }) => (
  <span className="text-xs bg-white/12 text-white/90 px-2 py-1 rounded-lg">{children}</span>
);

// Card used in the campaign grid
const CampaignCard = ({ campaign, favicon, domain, onView, onGenerate, generating }) => {
  const created = campaign.created_at
    ? new Date(campaign.created_at * 1000).toLocaleString()
    : "—";
  const chips = (campaign.brief?.services || []).slice(0, 3);

  return (
    <div
      className="
        h-full flex flex-col
        overflow-hidden rounded-2xl
        bg-gradient-to-br from-[#0E65C4]/25 via-[#0B5BB2]/18 to-[#073B7A]/12
        border border-white/15 shadow-md
        hover:border-white/25 hover:shadow-lg transition-all
      "
    >
      {/* body */}
      <div className="p-5 flex items-start gap-3">
        <img alt="" src={favicon} className="w-8 h-8 rounded-md ring-1 ring-white/25" />
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">
            {campaign.name || "Untitled Campaign"}
          </h3>
          <div className="mt-1 text-xs text-[#AFC7E6]">
            Created: <span className="text-white/90">{created}</span>
          </div>
          <div className="mt-1 text-xs text-[#AFC7E6] truncate">
            Website: <span className="text-white/90">{domain || "—"}</span>
          </div>

          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((s, i) => <Chip key={i}>{s}</Chip>)}
              {campaign.brief?.services?.length > 3 && (
                <span className="text-xs text-white/70">+{campaign.brief.services.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* footer — sticks to bottom-left */}
      <div className="mt-auto px-5 pb-5 flex items-center gap-3">
        <button onClick={onView} className={`${btnBase} ${btnSecondary}`}>View</button>
        <button
          onClick={onGenerate}
          disabled={generating}
          className={`${btnBase} ${btnPrimary} ${generating ? "opacity-90 cursor-not-allowed" : ""}`}
        >
          {generating ? "Finding leads…" : "Generate Leads"}
        </button>
      </div>
    </div>
  );
};

const SectionCard = ({ title, items, text }) => (
  <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
    <div className="text-sm text-[#AFC7E6] mb-2">{title}</div>
    {Array.isArray(items) && items.length > 0 ? (
      <ul className="list-disc list-inside text-white/90 space-y-1 text-sm max-h-64 overflow-auto pr-1">
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    ) : (
      <div className="text-sm text-[#AFC7E6] whitespace-pre-wrap">{text || "—"}</div>
    )}
  </div>
);

export default CampaignManager;