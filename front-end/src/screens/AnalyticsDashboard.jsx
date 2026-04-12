import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Mail,
  MousePointer2,
  MessageSquare,
  ArrowUpRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { API } from "../config";

const EMAIL_SENT_STATUSES = ["Sent", "Opened", "Responded", "Bounced", "SpamComplaint"];
const EMAIL_OPEN_STATUSES = ["Opened", "Responded"];
const CHANNELS = ["email", "linkedin", "web"];

const safeTimestamp = (value) => (
  typeof value === "number" && !Number.isNaN(value) ? value * 1000 : null
);

const getStatusCount = (leads, allowedStatuses) => (
  leads.filter((lead) => allowedStatuses.includes(lead.status)).length
);

const buildTrend = (leads, days = 12) => {
  const validDates = leads
    .map((lead) => safeTimestamp(lead.created_at))
    .filter(Boolean)
    .map((timestamp) => new Date(timestamp));
  const now = validDates.length > 0
    ? new Date(Math.max(...validDates.map((date) => date.getTime())))
    : new Date();
  const buckets = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    date.setHours(0, 0, 0, 0);
    buckets.push({
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: 0,
    });
  }

  const counts = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  leads.forEach((lead) => {
    const timestamp = safeTimestamp(lead.created_at);
    if (!timestamp) return;
    const key = new Date(timestamp).toISOString().slice(0, 10);
    if (counts.has(key)) {
      counts.get(key).count += 1;
    }
  });

  return buckets;
};

const buildCampaignPerformance = (campaigns, leads) => {
  const leadsByCampaign = leads.reduce((accumulator, lead) => {
    if (!lead.campaign_id) return accumulator;
    const current = accumulator.get(lead.campaign_id) || [];
    current.push(lead);
    accumulator.set(lead.campaign_id, current);
    return accumulator;
  }, new Map());

  return campaigns
    .map((campaign) => {
      const items = leadsByCampaign.get(campaign.id) || [];
      const sent = getStatusCount(items, EMAIL_SENT_STATUSES);
      const opened = getStatusCount(items, EMAIL_OPEN_STATUSES);
      const replied = items.filter((lead) => lead.status === "Responded").length;

      return {
        id: campaign.id,
        name: campaign.name || "Untitled Campaign",
        sent,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      };
    })
    .filter((campaign) => campaign.sent > 0)
    .sort((left, right) => {
      if (right.replyRate !== left.replyRate) return right.replyRate - left.replyRate;
      return right.sent - left.sent;
    })
    .slice(0, 3);
};

const buildEngagementLine = (points) => {
  if (points.length === 0) return "";

  return points.map((point, index) => {
    const x = index === 0 ? 0 : (index / (points.length - 1)) * 100;
    const y = 100 - point.value;
    return `${x},${y}`;
  }).join(" ");
};

export default function AnalyticsDashboard() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState("email");

  useEffect(() => {
    let isActive = true;

    const loadAnalytics = async () => {
      setLoading(true);
      setError("");

      try {
        const [leadsResponse, campaignsResponse] = await Promise.all([
          fetch(`${API}/emailhub/leads`, { credentials: "include" }),
          fetch(`${API}/campaigns`, { credentials: "include" }),
        ]);

        const [leadsData, campaignsData] = await Promise.all([
          leadsResponse.ok ? leadsResponse.json() : [],
          campaignsResponse.ok ? campaignsResponse.json() : [],
        ]);

        if (!isActive) return;

        setLeads(Array.isArray(leadsData) ? leadsData : []);
        setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
      } catch (loadError) {
        if (!isActive) return;
        setLeads([]);
        setCampaigns([]);
        setError("Unable to load analytics right now.");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();
    return () => {
      isActive = false;
    };
  }, []);

  const summary = useMemo(() => {
    const sent = getStatusCount(leads, EMAIL_SENT_STATUSES);
    const opened = getStatusCount(leads, EMAIL_OPEN_STATUSES);
    const replied = leads.filter((lead) => lead.status === "Responded").length;
    const bounced = leads.filter((lead) => ["Bounced", "SpamComplaint"].includes(lead.status)).length;
    const delivered = Math.max(sent - bounced, 0);

    return {
      leadsFound: leads.length,
      emailsSent: sent,
      openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
      responseRate: sent > 0 ? Math.round((replied / sent) * 1000) / 10 : 0,
      deliveredRate: sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0,
      bounceRate: sent > 0 ? Math.round((bounced / sent) * 1000) / 10 : 0,
      replied,
      delivered,
      bounced,
    };
  }, [leads]);

  const trend = useMemo(() => buildTrend(leads), [leads]);
  const topCampaigns = useMemo(() => buildCampaignPerformance(campaigns, leads), [campaigns, leads]);

  const engagementPoints = useMemo(() => [
    { label: "Delivered", value: summary.deliveredRate },
    { label: "Opened", value: summary.openRate },
    { label: "Responded", value: summary.responseRate },
    { label: "Bounced", value: summary.bounceRate },
  ], [summary]);

  const channelRows = useMemo(() => {
    if (channel !== "email") {
      return [
        { label: "Delivered", value: 0 },
        { label: "Opened", value: 0 },
        { label: "Replied", value: 0 },
      ];
    }

    return [
      { label: "Delivered", value: summary.deliveredRate },
      { label: "Opened", value: summary.openRate },
      { label: "Replied", value: summary.responseRate },
    ];
  }, [channel, summary]);

  const trendMax = Math.max(...trend.map((point) => point.count), 1);
  const engagementPolyline = buildEngagementLine(engagementPoints);

  return (
    <div className="flex flex-col p-8 gap-8 min-h-screen text-mist font-sans max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-soft-violet text-lg">Live performance insights derived from your current campaigns and inbox data.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-rose-300">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center text-soft-violet gap-3">
          <Loader2 className="animate-spin text-royal-amethyst" />
          <span>Loading analytics...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="Leads Found"
              value={summary.leadsFound.toLocaleString()}
              helper={`${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`}
              icon={<Users size={18} className="text-royal-amethyst" />}
            />
            <StatCard
              label="Emails Sent"
              value={summary.emailsSent.toLocaleString()}
              helper={`${summary.delivered.toLocaleString()} delivered`}
              icon={<Mail size={18} className="text-lilac-mist" />}
            />
            <StatCard
              label="Open Rate"
              value={`${summary.openRate}%`}
              helper={`${summary.deliveredRate}% delivered`}
              icon={<MousePointer2 size={18} className="text-soft-violet" />}
            />
            <StatCard
              label="Response Rate"
              value={`${summary.responseRate}%`}
              helper={`${summary.replied.toLocaleString()} replied`}
              icon={<MessageSquare size={18} className="text-emerald-400" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5 flex flex-col min-h-80">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Lead Generation Trend</h3>
                <span className="text-xs text-soft-violet bg-white/5 px-2 py-1 rounded-md">Last {trend.length} days</span>
              </div>

              <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
                {trend.map((point) => (
                  <div
                    key={point.label}
                    className="w-full bg-royal-amethyst/30 hover:bg-royal-amethyst/60 transition-colors rounded-t-sm relative group"
                    style={{ height: `${Math.max((point.count / trendMax) * 100, point.count > 0 ? 12 : 2)}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">
                      {point.count} lead{point.count === 1 ? "" : "s"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 mt-2 pt-2 flex justify-between text-xs text-soft-violet">
                <span>{trend[0]?.label}</span>
                <span>{trend[Math.floor(trend.length / 2)]?.label}</span>
                <span>{trend[trend.length - 1]?.label}</span>
              </div>
            </div>

            <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5 flex flex-col min-h-80">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Email Engagement</h3>
                <span className="text-xs text-soft-violet bg-white/5 px-2 py-1 rounded-md">Current funnel</span>
              </div>

              <div className="relative h-36 rounded-2xl border border-white/5 bg-midnight-plum/30 px-4 py-6 mb-6">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                  <polyline
                    fill="none"
                    stroke="#A3779D"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={engagementPolyline}
                  />
                </svg>

                <div className="relative z-10 h-full flex items-end justify-between text-xs text-soft-violet">
                  {engagementPoints.map((point) => (
                    <div key={point.label} className="text-center">
                      <div className="text-white font-semibold mb-2">{point.value}%</div>
                      <div>{point.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <EngagementSummary label="Delivered" value={`${summary.delivered.toLocaleString()} of ${summary.emailsSent.toLocaleString() || 0}`} />
                <EngagementSummary label="Bounced" value={`${summary.bounced.toLocaleString()} total`} />
                <EngagementSummary label="Opened" value={`${summary.openRate}% rate`} />
                <EngagementSummary label="Responded" value={`${summary.responseRate}% rate`} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5 lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4">Top Performing Campaigns</h3>
              {topCampaigns.length === 0 ? (
                <div className="text-soft-violet text-sm italic py-6">Campaign performance will appear here once sends start flowing through your campaigns.</div>
              ) : (
                <div className="space-y-4">
                  {topCampaigns.map((campaign) => (
                    <CampaignRow
                      key={campaign.id}
                      name={campaign.name}
                      sent={campaign.sent}
                      openRate={`${campaign.openRate}%`}
                      replyRate={`${campaign.replyRate}%`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-4">Channel Breakdown</h3>
              <div className="flex bg-midnight-plum rounded-full p-1 mb-6">
                {CHANNELS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setChannel(item)}
                    className={`flex-1 text-center py-1 text-xs font-semibold rounded-full transition-colors ${
                      channel === item
                        ? "text-white bg-royal-amethyst shadow-md"
                        : "text-soft-violet hover:text-white"
                    }`}
                  >
                    {item === "email" ? "Email" : item === "linkedin" ? "LinkedIn" : "Web"}
                  </button>
                ))}
              </div>

              <div className="space-y-6 flex flex-col justify-center h-48">
                {channelRows.map((row) => (
                  <div key={row.label} className="flex items-center gap-4">
                    <span className="text-sm w-16 text-soft-violet">{row.label}</span>
                    <div className="flex-1 h-2 bg-midnight-plum rounded-full overflow-hidden">
                      <div className="h-full bg-lilac-mist rounded-full" style={{ width: `${Math.max(row.value, row.value > 0 ? 10 : 0)}%` }}></div>
                    </div>
                    <span className="text-xs text-white">{row.value}%</span>
                  </div>
                ))}

                {channel !== "email" && (
                  <div className="text-xs text-soft-violet/80 bg-white/5 border border-white/5 rounded-xl px-3 py-2">
                    No {channel === "linkedin" ? "LinkedIn" : "web"} channel metrics are being captured yet, so this view stays empty until that tracking exists.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const StatCard = ({ label, value, helper, icon }) => (
  <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5 hover:border-royal-amethyst/30 transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-white/5 rounded-lg border border-white/5">
        {icon}
      </div>
      <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full text-emerald-400 bg-emerald-400/10">
        <ArrowUpRight size={12} />
        Live
      </div>
    </div>
    <div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs font-semibold text-soft-violet uppercase tracking-wider">{label}</p>
      <p className="text-xs text-soft-violet mt-3">{helper}</p>
    </div>
  </div>
);

const EngagementSummary = ({ label, value }) => (
  <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
    <div className="text-xs uppercase tracking-wider text-soft-violet">{label}</div>
    <div className="text-sm font-semibold text-white mt-1">{value}</div>
  </div>
);

const CampaignRow = ({ name, sent, openRate, replyRate }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 transition-colors hover:bg-white/10 hover:border-white/10 group cursor-default">
    <div>
      <p className="font-semibold text-white group-hover:text-lilac-mist transition-colors">{name}</p>
      <p className="text-xs text-soft-violet">{sent} emails sent</p>
    </div>
    <div className="flex items-center gap-6 text-right">
      <div>
        <p className="text-sm font-bold text-white">{openRate}</p>
        <p className="text-[10px] text-soft-violet uppercase">Open</p>
      </div>
      <div>
        <p className="text-sm font-bold text-royal-amethyst">{replyRate}</p>
        <p className="text-[10px] text-soft-violet uppercase">Reply</p>
      </div>
    </div>
  </div>
);
