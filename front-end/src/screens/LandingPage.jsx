import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  ArrowRight, Search, BarChart2, Brain,
  Clock, Sun, Moon, Menu, X, Star,
  CheckCircle, Shield, Database, Zap,
} from "lucide-react";
import { BRAND } from "../brand";
import { TypewriterEffectSmooth } from "../components/ui/typewriter-effect";
import { PricingSection } from "../components/ui/pricing";

// ─── Theme palette ────────────────────────────────────────────────────────────
// All inline styles derive from `p` so the toggle works without a full CSS refactor.

// Apple-inspired palette — clean, high-contrast, easy on the eyes
function getPalette(isDark) {
  const accent = isDark ? "#9b72ff" : "#7c3aed";   // brighter purple in dark
  return isDark ? {
    bg:              "#000000",
    navBg:           "rgba(0,0,0,0.75)",
    navBgScrolled:   "rgba(18,18,20,0.94)",
    navBorder:       "rgba(255,255,255,0.09)",
    fg:              "#f5f5f7",
    muted:           (a) => `rgba(235,235,245,${a})`,
    card:            "#1c1c1e",
    cardShadow:      "0 2px 16px rgba(0,0,0,0.4)",
    cardHover:       "#242426",
    border:          "rgba(255,255,255,0.09)",
    borderHover:     "rgba(155,114,255,0.50)",
    sectionBg:       "#111113",
    sectionBorder:   "rgba(255,255,255,0.07)",
    statsBg:         "rgba(155,114,255,0.10)",
    statsBorder:     "rgba(155,114,255,0.20)",
    heroBadgeBg:     "rgba(155,114,255,0.15)",
    heroBadgeBorder: "rgba(155,114,255,0.40)",
    heroBadgeFg:     "#c4b5fd",
    caseHeaderBorder:"rgba(255,255,255,0.08)",
    caseOldBg:       "rgba(255,59,48,0.06)",
    caseNewBg:       "rgba(155,114,255,0.06)",
    divider:         "rgba(255,255,255,0.08)",
    trusted:         "rgba(235,235,245,0.22)",
    inputNavLink:    "rgba(235,235,245,0.65)",
    btnOutlineFg:    "rgba(235,235,245,0.85)",
    btnOutlineBg:    "rgba(255,255,255,0.05)",
    btnOutlineBorder:"rgba(255,255,255,0.14)",
    btnOutlineHoverBg:    "rgba(155,114,255,0.10)",
    btnOutlineHoverBorder:"rgba(155,114,255,0.50)",
    accent,
  } : {
    bg:              "#ffffff",
    navBg:           "rgba(255,255,255,0.72)",
    navBgScrolled:   "rgba(255,255,255,0.92)",
    navBorder:       "rgba(0,0,0,0.08)",
    fg:              "#1d1d1f",
    muted:           (a) => `rgba(60,60,67,${a})`,
    card:            "#ffffff",
    cardShadow:      "0 2px 12px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.04)",
    cardHover:       "#faf9ff",
    border:          "#e5e5ea",
    borderHover:     "rgba(124,58,237,0.40)",
    sectionBg:       "#f5f5f7",
    sectionBorder:   "#e5e5ea",
    statsBg:         "rgba(124,58,237,0.06)",
    statsBorder:     "rgba(124,58,237,0.14)",
    heroBadgeBg:     "rgba(124,58,237,0.08)",
    heroBadgeBorder: "rgba(124,58,237,0.25)",
    heroBadgeFg:     "#6d28d9",
    caseHeaderBorder:"#e5e5ea",
    caseOldBg:       "rgba(255,59,48,0.04)",
    caseNewBg:       "rgba(124,58,237,0.04)",
    divider:         "#e5e5ea",
    trusted:         "rgba(60,60,67,0.25)",
    inputNavLink:    "#6e6e73",
    btnOutlineFg:    "#1d1d1f",
    btnOutlineBg:    "transparent",
    btnOutlineBorder:"#c7c7cc",
    btnOutlineHoverBg:    "rgba(124,58,237,0.05)",
    btnOutlineHoverBorder:"rgba(124,58,237,0.40)",
    accent,
  };
}

// ─── Data ────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  { icon: <Search size={20} />, title: "The List Building Trap",          body: "Scraping directories, fighting outdated databases, and guessing who is actually ready to buy right now." },
  { icon: <Database size={20} />, title: "The Enrichment Black Hole",     body: "Bouncing between three different software tools just to find a single verified email address." },
  { icon: <Clock size={20} />, title: "The Personalization Bottleneck",   body: "Spending 20 minutes researching a prospect's LinkedIn just to write a custom intro that might get opened." },
];

const CASES = [
  {
    label: "Case Study 01",
    title: "The Specialized Tech Consulting Firm",
    situation: "A 15-person cloud consultancy wants to pitch their new AWS migration service to Series B startups.",
    oldWay:     { summary: "A junior partner spends all Thursday hunting for the CTO's email on Google and writing 15 personalized emails.", result: "6 hours of work → 2 replies." },
    newWay:     { summary: "Connecttr ingests the brief, monitors signals for companies posting AWS job openings, pulls verified CTO emails, and drafts 15 tailored pitches referencing their specific stack.", result: "45 seconds → pipeline ready." },
  },
  {
    label: "Case Study 02",
    title: "The Enterprise Management Consulting Group",
    situation: "A boutique HR advisory firm targets Fortune 500 companies undergoing major executive restructuring.",
    oldWay:     { summary: "SDRs manually track press releases and LinkedIn. By the time they verify the new VP's email and write a pitch, a competitor has already booked the meeting.", result: "Days of work → too late." },
    newWay:     { summary: "Connecttr tracks organizational shifts in real-time. The moment a new VP of HR is announced, the system enriches the contact and delivers a tailored intro email to the SDR's inbox.", result: "Instant alert → first mover." },
  },
];

const STEPS = [
  { num: "01", title: "Drop Your Brief",               body: "Tell Connecttr what you sell, your value proposition, and who your ideal customer profile is." },
  { num: "02", title: "AI Uncovers Intent",             body: "Our AI scours the web for real-time buying signals — hiring trends, tech stack changes, funding rounds." },
  { num: "03", title: "Enrichment & Verification",      body: "Connecttr automatically surfaces 100% verified corporate email addresses. No more bounced emails." },
  { num: "04", title: "Hyper-Personalized Drafts",      body: "The platform writes unique, context-aware outreach emails tailored to each prospect's current situation." },
];

const FEATURES = [
  { icon: <Search size={22} />,   title: "Lead Discovery Engine",     body: "Continuous background web tracking that identifies high-intent targets based on real actions, not static dead lists." },
  { icon: <Shield size={22} />,   title: "Identity Enrichment",        body: "Deep identity resolution that uncovers valid email addresses, direct dials, and professional backgrounds instantly." },
  { icon: <Brain size={22} />,    title: "Contextual Email Generator", body: "An LLM-driven engine that reviews a prospect's public footprint to weave genuine personal hooks into every draft." },
  { icon: <BarChart2 size={22} />, title: "Campaign Analytics",        body: "Track delivery rates, opens, replies, and meetings booked. Absolute clarity on your pipeline ROI." },
];

const CONNECTTR_PLANS = [
  {
    name: "Starter",
    info: "For individuals getting started",
    isFree: true,
    price: { monthly: 0, yearly: 0 },
    features: [
      { text: "50 enriched contacts / month" },
      { text: "Basic intent monitoring" },
      { text: "AI email drafts" },
      { text: "Community support", tooltip: "Get answers on our Discord community" },
    ],
    btn: { text: "Get Started Free", href: "/login" },
    highlighted: false,
  },
  {
    name: "Growth",
    info: "For sales teams scaling fast",
    price: { monthly: 99, yearly: Math.round(99 * 12 * 0.88) },
    features: [
      { text: "1,500 enriched contacts / month" },
      { text: "Advanced intent monitoring", tooltip: "Hiring signals, funding rounds, tech stack changes" },
      { text: "CRM integrations" },
      { text: "Campaign analytics" },
      { text: "Priority support", tooltip: "24/7 chat support with our team" },
    ],
    btn: { text: "Start Free Trial", href: "/login" },
    highlighted: true,
  },
  {
    name: "Enterprise",
    info: "For large organisations",
    isCustom: true,
    price: { monthly: 0, yearly: 0 },
    features: [
      { text: "Unlimited enrichment" },
      { text: "Custom workflows" },
      { text: "Advanced security controls" },
      { text: "Dedicated account manager" },
      { text: "Custom onboarding & SLA" },
    ],
    btn: { text: "Contact Sales", href: "/contact" },
    highlighted: false,
  },
];

const FOOTER_LINKS = [
  { heading: "Product",  links: [["Features", "/features"], ["Pricing", "/pricing"], ["Changelog", "/changelog"]] },
  { heading: "Company",  links: [["About", "/about"], ["Careers", "/careers"], ["Contact", "/contact"]] },
  { heading: "Legal",    links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["GDPR", "/gdpr"]] },
];

const TRUST_NAMES = ["AdBlockify", "VEED", "GetInbox", "Landing.ai", "Descript"];

// ─── Component ───────────────────────────────────────────────────────────────

const LandingPage = () => {
  const { user, loading } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isDark = theme === "dark";
  const p = getPalette(isDark);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleCTA = () => { if (!loading) navigate(user ? "/dashboard" : "/login"); };
  const scrollTo  = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); };
  const goTo      = (path) => navigate(path);

  return (
    <div style={{ background: p.bg, color: p.fg, minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", overflowX: "hidden" }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? p.navBgScrolled : p.navBg,
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${scrolled ? p.navBorder : "transparent"}`,
        transition: "background 0.2s, border-color 0.2s",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>

          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            {/* Solid accent background so logo is always visible in both modes */}
            <div style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: p.accent, flexShrink: 0 }}>
              <img src="/clogo.png" alt={BRAND} style={{ width: 20, height: 20, objectFit: "contain", filter: "brightness(10)" }} onError={e => { e.target.style.display = "none"; }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: isDark ? "#f5f5f7" : "#1d1d1f", letterSpacing: "-0.02em" }}>{BRAND}</span>
          </a>

          {/* Desktop nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }} className="hidden md:flex">
            {[["Features", "features"], ["How It Works", "how-it-works"], ["Use Cases", "use-cases"], ["Pricing", "pricing"]].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 500, color: p.inputNavLink, background: "transparent", border: "none", cursor: "pointer", transition: "color 0.15s, background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = isDark ? "#fff" : p.fg; e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(124,58,237,0.07)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = p.inputNavLink; e.currentTarget.style.background = "transparent"; }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="hidden md:flex">
            <button onClick={toggle}
              style={{ padding: 8, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", color: p.muted(0.6), transition: "color 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = isDark ? "#fff" : p.fg; }}
              onMouseLeave={e => { e.currentTarget.style.color = p.muted(0.6); }}>
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {user ? (
              <button onClick={handleCTA}
                style={{ padding: "8px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff", background: "rgba(124,58,237,0.85)", border: "1px solid rgba(124,58,237,0.6)", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#6d28d9"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.85)"; }}>
                Go to Dashboard
              </button>
            ) : (<>
              <button onClick={handleCTA}
                style={{ padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 500, color: p.inputNavLink, background: "transparent", border: "none", cursor: "pointer", transition: "color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = isDark ? "#fff" : p.fg; }}
                onMouseLeave={e => { e.currentTarget.style.color = p.inputNavLink; }}>
                Sign In
              </button>
              <button onClick={handleCTA}
                style={{ padding: "8px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff", background: "#7c3aed", border: "none", cursor: "pointer", boxShadow: "0 0 18px rgba(124,58,237,0.35)", transition: "background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#6d28d9"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#7c3aed"; }}>
                Create Free Account
              </button>
            </>)}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setMenuOpen(o => !o)}
            style={{ padding: 8, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", color: p.muted(0.8) }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div style={{ background: isDark ? "rgba(10,6,18,0.97)" : "rgba(249,246,255,0.98)", padding: "8px 20px 16px", borderTop: `1px solid ${p.navBorder}` }} className="md:hidden">
            {[["Features", "features"], ["How It Works", "how-it-works"], ["Use Cases", "use-cases"], ["Pricing", "pricing"]].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 8px", fontSize: 14, fontWeight: 500, color: p.muted(0.8), background: "transparent", border: "none", cursor: "pointer" }}>
                {label}
              </button>
            ))}
            <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={handleCTA}
                style={{ padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#fff", background: "#7c3aed", border: "none", cursor: "pointer" }}>
                {user ? "Go to Dashboard" : "Create Free Account"}
              </button>
              {!user && (
                <button onClick={handleCTA}
                  style={{ padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 500, color: p.muted(0.75), background: "transparent", border: `1px solid ${p.border}`, cursor: "pointer" }}>
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 144, paddingBottom: 96, padding: "144px 20px 96px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 800, height: 500, background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto" }}>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 36, background: p.heroBadgeBg, border: `1px solid ${p.heroBadgeBorder}`, color: p.heroBadgeFg }}>
            <Zap size={13} style={{ fill: "currentColor" }} />
            AI-Powered Outbound Platform
          </div>

          {/* Two-line headline: static + animated — prevents typewriter clipping */}
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: "clamp(44px,7vw,76px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.025em", color: isDark ? "#f5f5f7" : "#1d1d1f", margin: 0 }}>
              From Intent Signal
            </p>
          </div>
          <TypewriterEffectSmooth
            words={[
              { text: "to",     className: isDark ? "!text-[#f5f5f7]" : "!text-[#1d1d1f]" },
              { text: "Inbox.", className: "!text-violet-500" },
            ]}
            className="mb-10"
            cursorClassName={isDark ? "!bg-violet-400" : "!bg-violet-600"}
          />

          <p style={{ fontSize: 20, lineHeight: 1.7, maxWidth: 580, margin: "0 auto 44px", color: p.muted(0.70) }}>
            Connecttr takes your company brief, uncovers high-intent B2B prospects across the web, enriches their data, and drafts hyper-personalised outreach. Stop hunting for emails. Start closing.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={handleCTA}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px", borderRadius: 14, fontSize: 16, fontWeight: 600, color: "#fff", background: p.accent, border: "none", cursor: "pointer", boxShadow: isDark ? "0 0 28px rgba(155,114,255,0.40)" : "0 4px 20px rgba(124,58,237,0.35)", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
              Get Started Free <ArrowRight size={18} />
            </button>
            <button onClick={() => scrollTo("how-it-works")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px", borderRadius: 14, fontSize: 16, fontWeight: 600, color: p.btnOutlineFg, background: p.btnOutlineBg, border: `1px solid ${p.btnOutlineBorder}`, cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = p.btnOutlineHoverBorder; e.currentTarget.style.background = p.btnOutlineHoverBg; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = p.btnOutlineBorder; e.currentTarget.style.background = p.btnOutlineBg; }}>
              See How It Works
            </button>
          </div>

          <p style={{ fontSize: 13, color: p.muted(0.42), marginBottom: 64 }}>
            ✓ No credit card required &nbsp;·&nbsp; ✓ 5-minute setup &nbsp;·&nbsp; ✓ Cancel anytime
          </p>

          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: p.muted(0.35), marginBottom: 24 }}>
            Trusted by high-growth sales teams
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "16px 48px" }}>
            {TRUST_NAMES.map(n => (
              <span key={n} style={{ fontSize: 14, fontWeight: 600, color: p.trusted }}>{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "88px 20px", background: p.sectionBg, borderTop: `1px solid ${p.sectionBorder}`, borderBottom: `1px solid ${p.sectionBorder}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: p.accent, marginBottom: 18 }}>The Problem</p>
            <h2 style={{ fontSize: "clamp(30px,4vw,44px)", fontWeight: 700, color: isDark ? "#f5f5f7" : "#1d1d1f", marginBottom: 20, lineHeight: 1.15 }}>
              Sales teams spend 70% of their time<br />researching, not selling.
            </h2>
            <p style={{ fontSize: 17, color: p.muted(0.65), maxWidth: 500, margin: "0 auto" }}>
              The manual B2B sales stack is broken. Here's where the hours go.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 20 }}>
            {PROBLEMS.map((item, i) => (
              <div key={i}
                style={{ borderRadius: 18, padding: "32px", background: p.card, border: `1px solid ${p.border}`, boxShadow: p.cardShadow, transition: "border-color 0.2s, background 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = p.borderHover; e.currentTarget.style.background = p.cardHover; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = p.border; e.currentTarget.style.background = p.card; }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "rgba(155,114,255,0.18)" : "rgba(124,58,237,0.10)", color: p.accent, marginBottom: 22 }}>
                  {item.icon}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: isDark ? "#f5f5f7" : "#1d1d1f", marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: p.muted(0.65) }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Case Studies ───────────────────────────────────────────────────── */}
      <section id="use-cases" style={{ padding: "88px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: p.accent, marginBottom: 18 }}>Real-World Scenarios</p>
            <h2 style={{ fontSize: "clamp(30px,4vw,44px)", fontWeight: 700, color: isDark ? "#f5f5f7" : "#1d1d1f", marginBottom: 20, lineHeight: 1.15 }}>How manual outbound bleeds revenue.</h2>
            <p style={{ fontSize: 17, color: p.muted(0.65), maxWidth: 520, margin: "0 auto" }}>A tale of two firms — and what changes when AI does the heavy lifting.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 24 }}>
            {CASES.map((c, i) => (
              <div key={i} style={{ borderRadius: 20, overflow: "hidden", border: `1px solid ${p.border}`, background: p.card }}>
                <div style={{ padding: "24px 28px", borderBottom: `1px solid ${p.caseHeaderBorder}` }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: "rgba(124,58,237,0.18)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}>{c.label}</span>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? "#f5f5f7" : "#1d1d1f", margin: "14px 0 8px", lineHeight: 1.3 }}>{c.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: p.muted(0.55) }}><span style={{ fontWeight: 600, color: p.muted(0.75) }}>The situation: </span>{c.situation}</p>
                </div>
                <div style={{ padding: "20px 28px", borderBottom: `1px solid ${p.caseHeaderBorder}`, background: p.caseOldBg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.20)", flexShrink: 0 }}>
                      <X size={11} style={{ color: "#f87171" }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f87171" }}>The Old Way</span>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: p.muted(0.58), marginBottom: 12 }}>{c.oldWay.summary}</p>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.20)" }}>{c.oldWay.result}</span>
                </div>
                <div style={{ padding: "20px 28px", background: p.caseNewBg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(124,58,237,0.25)", flexShrink: 0 }}>
                      <CheckCircle size={11} style={{ color: "#a78bfa" }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a78bfa" }}>The Connecttr Way</span>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: p.muted(0.65), marginBottom: 12 }}>{c.newWay.summary}</p>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: "rgba(124,58,237,0.18)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.30)" }}>{c.newWay.result}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "88px 20px", background: p.sectionBg, borderTop: `1px solid ${p.sectionBorder}`, borderBottom: `1px solid ${p.sectionBorder}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: p.accent, marginBottom: 18 }}>How It Works</p>
            <h2 style={{ fontSize: "clamp(30px,4vw,44px)", fontWeight: 700, color: isDark ? "#f5f5f7" : "#1d1d1f", marginBottom: 20, lineHeight: 1.15 }}>Your entire outbound pipeline.<br />Four steps. Zero manual work.</h2>
            <p style={{ fontSize: 17, color: p.muted(0.65), maxWidth: 520, margin: "0 auto" }}>Connecttr collapses a messy 5-tool stack into a single, cohesive workflow.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 20 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ borderRadius: 16, padding: "24px 24px 28px", background: p.card, border: `1px solid ${p.border}` }}>
                <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, marginBottom: 16, background: "linear-gradient(135deg,rgba(124,58,237,0.6),rgba(124,58,237,0.15))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.num}</div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: isDark ? "#f5f5f7" : "#1d1d1f", marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.55, color: p.muted(0.55) }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "88px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: p.accent, marginBottom: 18 }}>The Platform</p>
            <h2 style={{ fontSize: "clamp(30px,4vw,44px)", fontWeight: 700, color: isDark ? "#f5f5f7" : "#1d1d1f", marginBottom: 20, lineHeight: 1.15 }}>The all-in-one command centre.</h2>
            <p style={{ fontSize: 17, color: p.muted(0.65), maxWidth: 500, margin: "0 auto" }}>Every tool your outbound team needs, unified in a single hub.</p>
          </div>
          {/* 4-in-a-row on desktop, 2 on tablet, 1 on mobile */}
          <div className="features-grid" style={{ display: "grid", gap: 18 }}>
            {FEATURES.map((f, i) => (
              <div key={i}
                style={{ borderRadius: 18, padding: "28px 24px", background: p.card, border: `1px solid ${p.border}`, boxShadow: p.cardShadow, transition: "border-color 0.2s, transform 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = p.borderHover; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = p.border; e.currentTarget.style.transform = "none"; }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "rgba(155,114,255,0.16)" : "rgba(124,58,237,0.09)", color: p.accent, marginBottom: 20 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#f5f5f7" : "#1d1d1f", marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: p.muted(0.62) }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: "64px 20px", background: p.statsBg, borderTop: `1px solid ${p.statsBorder}`, borderBottom: `1px solid ${p.statsBorder}` }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, textAlign: "center" }}>
          {[{ stat: "50%", label: "reduction in customer acquisition cost", src: "McKinsey" }, { stat: "70%", label: "of sales time reclaimed from manual research", src: "Salesforce" }, { stat: "3×", label: "more meetings booked vs. manual outreach", src: "Connecttr data" }].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 40, fontWeight: 900, color: isDark ? "#f5f5f7" : "#1d1d1f", marginBottom: 8 }}>{s.stat}</div>
              <div style={{ fontSize: 13, color: p.muted(0.65), marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(124,58,237,0.75)" }}>{s.src}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "88px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: p.accent, marginBottom: 18, textAlign: "center" }}>Pricing</p>
          <PricingSection
            heading="Plans that Scale with You"
            description="Whether you're just starting out or growing fast, our flexible pricing has you covered — no hidden costs."
            plans={CONNECTTR_PLANS}
          />
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 20px", position: "relative", overflow: "hidden", borderTop: `1px solid ${p.sectionBorder}` }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 60%, rgba(124,58,237,0.18) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 800, color: isDark ? "#f5f5f7" : "#1d1d1f", marginBottom: 24, lineHeight: 1.1 }}>
            Ready to take the friction out<br />of your growth?
          </h2>
          <p style={{ fontSize: 17, color: p.muted(0.62), marginBottom: 40, lineHeight: 1.6 }}>
            Join the modern sales teams using Connecttr to collapse research and expand revenue. Set up your pipeline in less than 5 minutes.
          </p>
          <button onClick={handleCTA}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 36px", borderRadius: 14, fontSize: 16, fontWeight: 700, color: "#fff", background: "#7c3aed", border: "none", cursor: "pointer", boxShadow: "0 0 32px rgba(124,58,237,0.50)", transition: "background 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#6d28d9"; e.currentTarget.style.boxShadow = "0 0 44px rgba(124,58,237,0.60)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#7c3aed"; e.currentTarget.style.boxShadow = "0 0 32px rgba(124,58,237,0.50)"; }}>
            Build Your First Pipeline Free <ArrowRight size={18} />
          </button>
          <p style={{ fontSize: 12, color: p.muted(0.35), marginTop: 16 }}>No credit card required · Cancel anytime</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 48 }}>
            {[...Array(5)].map((_, i) => <Star key={i} size={16} style={{ color: "#7c3aed", fill: "#7c3aed" }} />)}
            <span style={{ marginLeft: 8, fontSize: 13, color: p.muted(0.50) }}>Loved by sales teams</span>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{ padding: "48px 20px", borderTop: `1px solid ${p.divider}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }} className="grid-footer">

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(124,58,237,0.20)", border: "1px solid rgba(124,58,237,0.40)" }}>
                  <img src="/clogo.png" alt={BRAND} style={{ width: 16, height: 16, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: isDark ? "#f5f5f7" : "#1d1d1f" }}>{BRAND}</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: p.muted(0.45) }}>From Intent to Inbox.<br />The B2B outbound platform.</p>
            </div>

            {FOOTER_LINKS.map(col => (
              <div key={col.heading}>
                <h4 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: p.muted(0.40), marginBottom: 16 }}>{col.heading}</h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(([label, path]) => (
                    <li key={label}>
                      <button onClick={() => goTo(path)}
                        style={{ fontSize: 13, color: p.muted(0.50), background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", transition: "color 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.color = isDark ? "#fff" : p.fg; }}
                        onMouseLeave={e => { e.currentTarget.style.color = p.muted(0.50); }}>
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, paddingTop: 24, borderTop: `1px solid ${p.divider}` }}>
            <p style={{ fontSize: 12, color: p.muted(0.30) }}>© {new Date().getFullYear()} {BRAND}. All rights reserved.</p>
            <button onClick={toggle}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "6px 14px", borderRadius: 8, border: `1px solid ${p.border}`, background: "transparent", cursor: "pointer", color: p.muted(0.40), transition: "color 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = isDark ? "#fff" : p.fg; }}
              onMouseLeave={e => { e.currentTarget.style.color = p.muted(0.40); }}>
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
              {isDark ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>
      </footer>

      <style>{`
        /* Features — 4 columns desktop, 2 tablet, 1 mobile */
        .features-grid { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 860px)  { .features-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px)  { .features-grid { grid-template-columns: 1fr; } }

        /* Footer grid */
        @media (max-width: 640px) { .grid-footer { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 400px) { .grid-footer { grid-template-columns: 1fr !important; } }

        /* Nav responsive */
        .hidden { display: none; }
        @media (min-width: 768px) { .hidden { display: flex; } }
        .md\\:hidden { display: flex; }
        @media (min-width: 768px) { .md\\:hidden { display: none !important; } }
      `}</style>
    </div>
  );
};

export default LandingPage;
