
import React, { useState, useEffect } from 'react';
import { API } from '../config';
import {
    Users,
    Mail,
    MousePointer2,
    MessageSquare,
    ArrowUpRight,
    ArrowDownRight,
    Database,
    Loader2
} from 'lucide-react';

export default function AnalyticsDashboard({ onNavigate }) {
    const [campaigns, setCampaigns] = useState([]);
    const [leads, setLeads] = useState([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState("");
    const [loadingDb, setLoadingDb] = useState(true);

    useEffect(() => {
        const fetchDb = async () => {
            setLoadingDb(true);
            try {
                const [campRes, leadRes] = await Promise.all([
                    fetch(`${API}/campaigns`, { credentials: 'include' }),
                    fetch(`${API}/emailhub/leads`, { credentials: 'include' })
                ]);
                if (campRes.ok) setCampaigns(await campRes.json());
                if (leadRes.ok) setLeads(await leadRes.json());
            } catch (e) {
                console.error("Failed to load intelligence DB", e);
            } finally {
                setLoadingDb(false);
            }
        };
        fetchDb();
    }, []);

    const filteredLeads = selectedCampaignId 
        ? leads.filter(l => l.campaign_id === selectedCampaignId)
        : leads;

    const handleDraftClick = (leadId) => {
        localStorage.setItem('active_lead_draft_id', leadId);
        if (onNavigate) {
            onNavigate("emailhub");
        }
    };

    return (
        <div className="flex flex-col p-8 gap-8 min-h-screen text-mist font-sans max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
                <p className="text-soft-violet text-lg">Performance insights and campaign metrics.</p>
            </div>

            {/* KPI Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Leads Found"
                    value="1,248"
                    delta="+12%"
                    trend="up"
                    icon={<Users size={18} className="text-royal-amethyst" />}
                />
                <StatCard
                    label="Emails Sent"
                    value="843"
                    delta="+5%"
                    trend="up"
                    icon={<Mail size={18} className="text-lilac-mist" />}
                />
                <StatCard
                    label="Open Rate"
                    value="42.3%"
                    delta="-2%"
                    trend="down"
                    icon={<MousePointer2 size={18} className="text-soft-violet" />}
                />
                <StatCard
                    label="Response Rate"
                    value="8.5%"
                    delta="+1.2%"
                    trend="up"
                    icon={<MessageSquare size={18} className="text-emerald-400" />}
                />
            </div>

            {/* Trends Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Growth Chart Placeholder */}
                <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5 flex flex-col h-80">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-white">Lead Generation Trend</h3>
                        <span className="text-xs text-soft-violet bg-white/5 px-2 py-1 rounded-md">Last 28 days</span>
                    </div>
                    {/* Mock Chart Visual */}
                    <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
                        {[35, 45, 30, 60, 75, 50, 65, 80, 55, 70, 90, 85].map((h, i) => (
                            <div
                                key={i}
                                className="w-full bg-royal-amethyst/30 hover:bg-royal-amethyst/60 transition-colors rounded-t-sm relative group"
                                style={{ height: `${h}%` }}
                            >
                                {/* Tooltip on hover */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">
                                    {h} Leads
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-white/5 mt-2 pt-2 flex justify-between text-xs text-soft-violet">
                        <span>Nov 01</span>
                        <span>Nov 15</span>
                        <span>Nov 30</span>
                    </div>
                </div>

                {/* Email Performance Chart Placeholder */}
                <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5 flex flex-col h-80">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-white">Email Engagement</h3>
                        <span className="text-xs text-soft-violet bg-white/5 px-2 py-1 rounded-md">Last 28 days</span>
                    </div>
                    {/* Mock Line Chart Visual */}
                    <div className="flex-1 relative flex items-center justify-center border-l border-b border-white/10">
                        <div className="absolute inset-0 flex items-center justify-center text-soft-violet/50">
                            <span className="animate-pulse">Chart Data Loading...</span>
                        </div>
                        {/* Decorative line sketch */}
                        <svg className="w-full h-full absolute overflow-visible" preserveAspectRatio="none">
                            <path
                                d="M0,150 C50,100 100,180 150,120 S250,50 300,90 S400,20 500,60"
                                fill="none"
                                stroke="#A3779D"
                                strokeWidth="3"
                                strokeLinecap="round"
                                className="drop-shadow-lg"
                            />
                            <path
                                d="M0,150 C50,100 100,180 150,120 S250,50 300,90 S400,20 500,60 V220 H0 Z"
                                fill="url(#gradient)"
                                opacity="0.2"
                            />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#A3779D" />
                                    <stop offset="100%" stopColor="#2E1A47" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
            </div>

            {/* Breakdown Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Campaigns */}
                <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-4">Top Performing Campaigns</h3>
                    <div className="space-y-4">
                        <CampaignRow name="Q1 Outreach - Tech" sent={240} openRate="45%" replyRate="12%" />
                        <CampaignRow name="Webinar Invite - Nov" sent={180} openRate="38%" replyRate="5%" />
                        <CampaignRow name="Cold Inbound Follow-up" sent={56} openRate="62%" replyRate="24%" />
                    </div>
                </div>

                {/* Breakdown by Channel */}
                <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Channel Breakdown</h3>
                    <div className="flex bg-midnight-plum rounded-full p-1 mb-6">
                        <div className="flex-1 text-center py-1 text-xs font-semibold text-white bg-royal-amethyst rounded-full shadow-md">Email</div>
                        <div className="flex-1 text-center py-1 text-xs font-semibold text-soft-violet">LinkedIn</div>
                        <div className="flex-1 text-center py-1 text-xs font-semibold text-soft-violet">Web</div>
                    </div>
                    <div className="space-y-6 flex flex-col justify-center h-48">
                        <div className="flex items-center gap-4">
                            <span className="text-sm w-16 text-soft-violet">Delivered</span>
                            <div className="flex-1 h-2 bg-midnight-plum rounded-full overflow-hidden">
                                <div className="h-full bg-lilac-mist w-[85%] rounded-full"></div>
                            </div>
                            <span className="text-xs text-white">85%</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm w-16 text-soft-violet">Opened</span>
                            <div className="flex-1 h-2 bg-midnight-plum rounded-full overflow-hidden">
                                <div className="h-full bg-soft-violet w-[45%] rounded-full"></div>
                            </div>
                            <span className="text-xs text-white">45%</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm w-16 text-soft-violet">Replied</span>
                            <div className="flex-1 h-2 bg-midnight-plum rounded-full overflow-hidden">
                                <div className="h-full bg-royal-amethyst w-[12%] rounded-full"></div>
                            </div>
                            <span className="text-xs text-white">12%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Campaign Intelligence Repository */}
            <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5 mt-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Database size={20} className="text-royal-amethyst" />
                            Discovered Leads Repository
                        </h3>
                        <p className="text-sm text-soft-violet mt-1">Review explicit AI matchmaking reasons and initiate organic outreach.</p>
                    </div>
                    
                    <select
                        className="bg-midnight-plum text-white border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-royal-amethyst font-semibold text-sm appearance-none outline-none shadow-inner"
                        value={selectedCampaignId}
                        onChange={(e) => setSelectedCampaignId(e.target.value)}
                    >
                        <option value="">All Campaigns</option>
                        {campaigns.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/5 bg-midnight-plum/20">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-soft-violet bg-midnight-plum/50">
                                <th className="py-4 pl-6 pr-4 font-semibold w-1/4">Contact & Role</th>
                                <th className="py-4 pr-4 font-semibold">Intent Score</th>
                                <th className="py-4 pr-4 font-semibold w-2/5">AI Match Logic</th>
                                <th className="py-4 pr-6 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm align-top">
                            {loadingDb ? (
                                <tr>
                                    <td colSpan="4" className="py-12 text-center text-soft-violet">
                                        <Loader2 size={24} className="animate-spin text-royal-amethyst mx-auto mb-2" />
                                        Syncing datastore...
                                    </td>
                                </tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-12 text-center text-soft-violet italic">
                                        No leads found in datastore for this selection.
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map(lead => (
                                    <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                        <td className="py-5 pl-6 pr-4">
                                            <div className="font-semibold text-white group-hover:text-lilac-mist transition-colors">
                                                {lead.name}
                                            </div>
                                            <div className="text-[11px] text-soft-violet flex items-center gap-1 mt-1 truncate max-w-[200px]">
                                                <span className="truncate">{lead.role || "Target Persona"}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/20 flex-shrink-0"></span>
                                                <span className="truncate">{lead.company}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 pr-4">
                                            <div className="flex flex-col justify-center">
                                                <span className={`text-lg font-bold ${lead.score > 75 ? "text-emerald-400" : lead.score > 50 ? "text-amber-400" : "text-rose-400"}`}>
                                                    {lead.score}
                                                </span>
                                                <span className="text-[10px] uppercase text-soft-violet/50 font-bold tracking-wider">Metric</span>
                                            </div>
                                        </td>
                                        <td className="py-5 pr-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {(lead.match_reasons || []).map((r, i) => (
                                                    <span key={i} className="px-2 py-1 bg-royal-amethyst/10 border border-royal-amethyst/20 text-lilac-mist rounded text-[10px] uppercase font-bold tracking-wide shadow-sm">
                                                        {r}
                                                    </span>
                                                ))}
                                                {(!lead.match_reasons || lead.match_reasons.length === 0) && (
                                                    <span className="text-xs text-white/30 italic">No explicit signals mapped.</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-5 pr-6 text-right align-middle">
                                            <button 
                                                onClick={() => handleDraftClick(lead.id)}
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

// --- Subcomponents ---

const StatCard = ({ label, value, delta, trend, icon }) => (
    <div className="bg-slate rounded-2xl p-6 shadow-xl border border-white/5 hover:border-royal-amethyst/30 transition-all duration-300">
        <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                {icon}
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend === 'up' ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'
                }`}>
                {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {delta}
            </div>
        </div>
        <div>
            <p className="text-2xl font-bold text-white mb-1">{value}</p>
            <p className="text-xs font-semibold text-soft-violet uppercase tracking-wider">{label}</p>
        </div>
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
