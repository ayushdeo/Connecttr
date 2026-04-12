import React, { useEffect, useState } from "react";
import {
  Search,
  Plus,
  ExternalLink,
  ArrowRight,
  Activity,
  Globe,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  PencilLine,
  Save,
  X,
} from "lucide-react";
import StartNewCampaign from "./StartNewCampaign";
import EnterKeywords from "./EnterKeywords";
import LoadingScreen from "./LoadingScreen";
import { API } from "../config";

const Chip = ({ children }) => (
  <span className="text-[10px] uppercase font-bold text-white bg-white/10 border border-white/5 px-2 py-1 rounded-md">
    {children}
  </span>
);

const arrayToText = (items) => (
  Array.isArray(items) ? items.filter(Boolean).join("\n") : ""
);

const textToArray = (value) => (
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
);

const SectionCard = ({ title, items, text, icon, onEdit }) => (
  <div className="bg-slate rounded-2xl p-6 border border-white/5 hover:border-royal-amethyst/20 transition-colors">
    <div className="flex items-center justify-between gap-2 mb-4 text-soft-violet">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-xs uppercase tracking-wider font-bold">{title}</h3>
      </div>
      {typeof onEdit === "function" && (
        <button
          type="button"
          onClick={onEdit}
          className="p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white transition-colors"
          aria-label={`Edit ${title}`}
        >
          <PencilLine size={14} />
        </button>
      )}
    </div>
    {Array.isArray(items) && items.length > 0 ? (
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-sm text-mist flex items-start gap-2">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-royal-amethyst flex-shrink-0"></span>
            <span className="leading-relaxed opacity-90">{item}</span>
          </li>
        ))}
      </ul>
    ) : (
      <div className="text-sm text-white/50 italic">{text || "No data available"}</div>
    )}
  </div>
);

const CampaignCard = ({
  campaign,
  favicon,
  domain,
  onView,
  onGenerate,
  generating,
  expanded,
  onToggleExpanded,
}) => {
  const created = campaign.created_at
    ? new Date(campaign.created_at * 1000).toLocaleDateString()
    : "—";
  const services = campaign.brief?.services || [];
  const visibleServices = expanded ? services : services.slice(0, 3);

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
              <h3 className="text-white font-bold text-lg leading-tight group-hover:text-lilac-mist transition-colors">
                {campaign.name || "Untitled"}
              </h3>
              <a
                href={campaign.website}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-soft-violet hover:text-white transition-colors truncate block max-w-[200px] mt-0.5"
              >
                {domain || "No domain"}
              </a>
            </div>
          </div>
        </div>

        <div className={`flex flex-wrap gap-2 mb-4 ${expanded ? "min-h-[3.5rem]" : "h-14 content-start overflow-hidden"}`}>
          {visibleServices.map((service, index) => (
            <Chip key={index}>{service}</Chip>
          ))}
          {services.length > 3 && (
            <button
              type="button"
              onClick={onToggleExpanded}
              className="text-[10px] text-soft-violet py-1 px-2 rounded-md border border-white/5 bg-white/[0.03] hover:bg-white/10 hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <span>{expanded ? "Show less" : `+${services.length - 3} more`}</span>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
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
          className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            generating
              ? "bg-white/10 text-white/50 cursor-not-allowed"
              : "bg-royal-amethyst text-white hover:bg-royal-amethyst/90 shadow-lg shadow-royal-amethyst/20"
          }`}
        >
          {generating ? "Working..." : "Find Leads"}
        </button>
      </div>
    </div>
  );
};

const TextAreaField = ({ label, value, onChange, placeholder, rows = 5, autoFocus = false }) => (
  <label className="space-y-2">
    <span className="text-xs font-semibold uppercase tracking-wider text-soft-violet">{label}</span>
    <textarea
      rows={rows}
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      placeholder={placeholder}
      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-royal-amethyst focus:ring-1 focus:ring-royal-amethyst resize-none"
    />
  </label>
);

const BriefEditorModal = ({ campaign, saving, focusField, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: "",
    website: "",
    services: "",
    icpSummary: "",
    leadSignals: "",
    searchQueries: "",
    targetDomains: "",
    outreachAngles: "",
  });

  useEffect(() => {
    if (!campaign) return;

    const brief = campaign.brief || {};
    setForm({
      name: campaign.name || "",
      website: campaign.website || "",
      services: arrayToText(brief.services),
      icpSummary: brief.icp_summary || "",
      leadSignals: arrayToText(brief.lead_signals),
      searchQueries: arrayToText(brief.search_queries),
      targetDomains: arrayToText(brief.exclude_domains),
      outreachAngles: arrayToText(brief.outreach_angles),
    });
  }, [campaign]);

  if (!campaign) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSave({
      name: form.name.trim() || campaign.name || "Untitled Campaign",
      website: form.website.trim() || null,
      brief: {
        ...(campaign.brief || {}),
        services: textToArray(form.services),
        icp_summary: form.icpSummary.trim(),
        lead_signals: textToArray(form.leadSignals),
        search_queries: textToArray(form.searchQueries),
        exclude_domains: textToArray(form.targetDomains),
        outreach_angles: textToArray(form.outreachAngles),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-ink/80 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="max-w-5xl mx-auto bg-slate border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/5 flex items-start justify-between gap-4">
          <div>
            <div className="text-soft-violet text-sm font-semibold uppercase tracking-wider mb-1">
              Campaign Editor
            </div>
            <h3 className="text-2xl font-bold text-white">Edit Brief</h3>
            <p className="text-sm text-soft-violet mt-2">
              Update the saved campaign instead of being sent into the new-campaign flow.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-soft-violet hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close editor"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 grid lg:grid-cols-2 gap-6">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-soft-violet">Campaign Name</span>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              autoFocus={focusField === "name"}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-royal-amethyst focus:ring-1 focus:ring-royal-amethyst"
              placeholder="Photo studio rental"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-soft-violet">Website</span>
            <input
              value={form.website}
              onChange={(event) => updateField("website", event.target.value)}
              autoFocus={focusField === "website"}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-royal-amethyst focus:ring-1 focus:ring-royal-amethyst"
              placeholder="https://fdphotostudio.com"
            />
          </label>

          <TextAreaField
            label="Services"
            value={form.services}
            onChange={(event) => updateField("services", event.target.value)}
            placeholder="One service per line"
            rows={6}
            autoFocus={focusField === "services"}
          />
          <TextAreaField
            label="ICP Summary"
            value={form.icpSummary}
            onChange={(event) => updateField("icpSummary", event.target.value)}
            placeholder="Describe your ideal customer profile"
            rows={6}
            autoFocus={focusField === "icp_summary"}
          />
          <TextAreaField
            label="Lead Signals"
            value={form.leadSignals}
            onChange={(event) => updateField("leadSignals", event.target.value)}
            placeholder="One signal per line"
            rows={6}
            autoFocus={focusField === "lead_signals"}
          />
          <TextAreaField
            label="Search Queries"
            value={form.searchQueries}
            onChange={(event) => updateField("searchQueries", event.target.value)}
            placeholder="One query per line"
            rows={6}
            autoFocus={focusField === "search_queries"}
          />
          <TextAreaField
            label="Target Domains"
            value={form.targetDomains}
            onChange={(event) => updateField("targetDomains", event.target.value)}
            placeholder="One domain per line"
            rows={6}
            autoFocus={focusField === "exclude_domains"}
          />
          <TextAreaField
            label="Outreach Angles"
            value={form.outreachAngles}
            onChange={(event) => updateField("outreachAngles", event.target.value)}
            placeholder="One angle per line"
            rows={6}
            autoFocus={focusField === "outreach_angles"}
          />
        </div>

        <div className="px-6 py-5 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-royal-amethyst text-white hover:bg-royal-amethyst/90 transition-colors font-semibold shadow-lg shadow-royal-amethyst/20 inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

const CampaignManager = ({ onNavigate = () => {} }) => {
  const [stage, setStage] = useState("list");
  const [campaigns, setCampaigns] = useState([]);
  const [draft, setDraft] = useState(null);
  const [current, setCurrent] = useState(null);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingDone, setLoadingDone] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [busy, setBusy] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFocusField, setEditFocusField] = useState(null);

  const domainFromUrl = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };

  const faviconFor = (url) => (
    url
      ? `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`
      : null
  );

  const filtered = campaigns
    .filter((campaign) => (
      (campaign.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (campaign.website || "").toLowerCase().includes(search.toLowerCase())
    ))
    .sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return (b.created_at || 0) - (a.created_at || 0);
    });

  const toggleServices = (campaignId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [campaignId]: !prev[campaignId],
    }));
  };

  const openBriefEditor = (focusField = null) => {
    setEditFocusField(focusField);
    setIsEditingBrief(true);
  };

  const closeBriefEditor = () => {
    setIsEditingBrief(false);
    setEditFocusField(null);
  };

  const loadCampaigns = () => {
    fetch(`${API}/campaigns`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setCampaigns([]));
  };

  async function generateForCampaign(campaign) {
    if (busyId) return;
    setBusyId(campaign.id);
    setShowLoading(true);
    setLoadingDone(false);
    try {
      const response = await fetch(`${API}/campaigns/${campaign.id}/discover`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Discover failed (${response.status})`);
      }
      const data = await response.json().catch(() => ({}));
      console.log("Imported", data.imported, "leads for", campaign.name);
      setLoadingDone(true);
    } catch (error) {
      alert(error.message || "Lead discovery failed.");
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
      const response = await fetch(`${API}/campaigns/${current.id}/discover`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Discover failed (${response.status})`);
      }
      await response.json().catch(() => ({}));
      setLoadingDone(true);
    } catch (error) {
      console.error(error);
      alert("Lead discovery failed.");
      setShowLoading(false);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  const startFlow = () => {
    setDraft(null);
    setStage("collect");
  };

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
      const response = await fetch(`${API}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, website, brief }),
      });
      if (!response.ok) throw new Error("Failed to save");
      const saved = await response.json();
      setCampaigns((prev) => [saved, ...prev]);
      setCurrent(saved);
      setStage("view");
    } catch (error) {
      alert("Failed to save campaign");
    }
  };

  const saveBriefEdits = async (payload) => {
    if (!current?.id) return;

    setSavingEdit(true);
    try {
      const response = await fetch(`${API}/campaigns/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update campaign");
      }

      const updated = await response.json();
      setCurrent(updated);
      setCampaigns((prev) => prev.map((campaign) => (
        campaign.id === updated.id ? updated : campaign
      )));
      closeBriefEditor();
    } catch (error) {
      alert(error.message || "Failed to update campaign");
    } finally {
      setSavingEdit(false);
    }
  };

  if (stage === "collect") {
    return (
      <StartNewCampaign
        onNext={handleWebsiteNext}
        onBack={() => setStage("list")}
      />
    );
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
        <button
          className="text-sm text-soft-violet hover:text-white mb-6 flex items-center gap-2 transition-colors"
          onClick={() => setStage("collect")}
        >
          <ArrowRight size={14} className="rotate-180" /> Back
        </button>

        <div className="flex flex-col md:flex-row gap-6 items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Review Campaign Brief</h2>
            <div className="text-mist opacity-70">
              Website: <span className="text-white">{draft?.website || "—"}</span>
            </div>
          </div>

          <div className="w-full md:w-auto bg-slate p-1 rounded-xl border border-white/10 flex items-center gap-2">
            <input
              className="bg-transparent border-none text-white px-4 py-2 w-full md:w-64 focus:ring-0 placeholder:text-white/30"
              defaultValue={nameDefault}
              placeholder="Name your campaign..."
              onKeyDown={(event) => event.key === "Enter" && saveCampaign(event.currentTarget.value, brief)}
            />
            <button
              className="bg-royal-amethyst text-white px-6 py-2 rounded-lg font-semibold hover:bg-royal-amethyst/90 whitespace-nowrap transition-colors"
              onClick={(event) => {
                const input = event.currentTarget.previousSibling;
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
          <SectionCard title="Target Domains" items={brief.exclude_domains} text="Optimized for B2B discovery" icon={<Globe size={16} />} />
          <SectionCard title="Outreach Angles" items={brief.outreach_angles} icon={<ExternalLink size={16} />} />
        </div>

        <div className="mt-8 text-center">
          <button
            className="text-soft-violet hover:text-white underline decoration-white/20 hover:decoration-white transition-all text-sm"
            onClick={() => setStage("fallback")}
          >
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
          onClick={() => {
            setIsEditingBrief(false);
            setStage("list");
          }}
        >
          <ArrowRight size={14} className="rotate-180" /> Back to Campaigns
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-slate p-6 rounded-2xl border border-white/5 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              {favicon ? (
                <img src={favicon} alt="" className="w-8 h-8 rounded-md" />
              ) : (
                <Globe className="text-royal-amethyst" size={32} />
              )}
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
                ) : (
                  <span className="opacity-50">No website linked</span>
                )}
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
                  onNavigate("emailhub");
                }}
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => openBriefEditor()}
              className="px-5 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 transition font-medium inline-flex items-center gap-2"
            >
              <PencilLine size={16} />
              <span>Edit Brief</span>
            </button>
            <button
              onClick={generateLeads}
              disabled={busy}
              className={`px-6 py-3 rounded-xl transition font-bold shadow-lg shadow-royal-amethyst/20 flex items-center gap-2 ${
                busy ? "bg-white/10 text-white/50" : "bg-royal-amethyst text-white hover:bg-royal-amethyst/90"
              }`}
            >
              {busy ? "Finding leads..." : "Find More Leads"}
              {!busy && <ArrowRight size={18} />}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SectionCard title="Services" items={brief.services} icon={<Activity size={16} />} onEdit={() => openBriefEditor("services")} />
          <SectionCard title="ICP Summary" text={brief.icp_summary} icon={<FileText size={16} />} onEdit={() => openBriefEditor("icp_summary")} />
          <SectionCard title="Lead Signals" items={brief.lead_signals} icon={<Check size={16} />} onEdit={() => openBriefEditor("lead_signals")} />
          <SectionCard title="Search Queries" items={brief.search_queries} icon={<Search size={16} />} onEdit={() => openBriefEditor("search_queries")} />
          <SectionCard title="Target Domains" items={brief.exclude_domains} text="Standard exclusions applied" icon={<Globe size={16} />} onEdit={() => openBriefEditor("exclude_domains")} />
          <SectionCard title="Outreach Angles" items={brief.outreach_angles} icon={<ExternalLink size={16} />} onEdit={() => openBriefEditor("outreach_angles")} />
        </div>

        {isEditingBrief && (
          <BriefEditorModal
            campaign={current}
            saving={savingEdit}
            focusField={editFocusField}
            onClose={closeBriefEditor}
            onSave={saveBriefEdits}
          />
        )}
      </div>
    );
  }

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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search..."
              className="bg-transparent text-white pl-10 pr-4 py-2 w-full md:w-64 placeholder:text-white/20 focus:outline-none"
            />
          </div>
          <div className="h-6 w-px bg-white/10 mx-1 hidden md:block"></div>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
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
              onNavigate("emailhub");
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
          <button onClick={startFlow} className="text-white font-semibold hover:underline">
            Create your first campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              favicon={faviconFor(campaign.website)}
              domain={domainFromUrl(campaign.website || "")}
              onView={() => {
                setCurrent(campaign);
                closeBriefEditor();
                setStage("view");
              }}
              onGenerate={() => generateForCampaign(campaign)}
              generating={busyId === campaign.id}
              expanded={!!expandedCards[campaign.id]}
              onToggleExpanded={() => toggleServices(campaign.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CampaignManager;
