import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  ArrowRight, Search, Mail, BarChart2, Brain,
  Clock, Sun, Moon, Menu, X, Star,
  CheckCircle, Shield, Database, Zap,
} from "lucide-react";
import { BRAND } from "../brand";

// ─── Theme palette ────────────────────────────────────────────────────────────
// All inline styles derive from `p` so the toggle works without a full CSS refactor.

function getPalette(isDark) {
  return isDark ? {
    bg:              "#0a0612",
    navBg:           "rgba(10,6,18,0.80)",
    navBgScrolled:   "rgba(10,6,18,0.94)",
    navBorder:       "rgba(255,255,255,0.07)",
    fg:              "#f0ebf8",
    muted:           (a) => `rgba(200,185,220,${a})`,
    card:            "rgba(255,255,255,0.03)",
    cardHover:       "rgba(124,58,237,0.07)",
    border:          "rgba(255,255,255,0.07)",
    borderHover:     "rgba(124,58,237,0.35)",
    sectionBg:       "rgba(255,255,255,0.025)",
    sectionBorder:   "rgba(255,255,255,0.06)",
    statsBg:         "rgba(124,58,237,0.08)",
    statsBorder:     "rgba(124,58,237,0.18)",
    heroBadgeBg:     "rgba(124,58,237,0.15)",
    heroBadgeBorder: "rgba(124,58,237,0.35)",
    heroBadgeFg:     "#c4b5fd",
    caseHeaderBorder:"rgba(255,255,255,0.07)",
    caseOldBg:       "rgba(239,68,68,0.04)",
    caseNewBg:       "rgba(124,58,237,0.05)",
    pricingCardBg:   "rgba(255,255,255,0.03)",
    pricingCardBorder:"rgba(255,255,255,0.09)",
    divider:         "rgba(255,255,255,0.06)",
    footerBg:        "transparent",
    trusted:         "rgba(200,185,220,0.28)",
    inputNavLink:    "rgba(200,185,220,0.75)",
    btnOutlineFg:    "rgba(200,185,220,0.85)",
    btnOutlineBg:    "rgba(255,255,255,0.04)",
    btnOutlineBorder:"rgba(255,255,255,0.12)",
    btnOutlineHoverBg:    "rgba(124,58,237,0.08)",
    btnOutlineHoverBorder:"rgba(124,58,237,0.50)",
  } : {
    bg:              "#f9f6ff",
    navBg:           "rgba(249,246,255,0.80)",
    navBgScrolled:   "rgba(249,246,255,0.96)",
    navBorder:       "rgba(124,58,237,0.12)",
    fg:              "#1a0d2e",
    muted:           (a) => `rgba(70,40,110,${a})`,
    card:            "#ffffff",
    cardHover:       "rgba(124,58,237,0.04)",
    border:          "rgba(124,58,237,0.13)",
    borderHover:     "rgba(124,58,237,0.35)",
    sectionBg:       "rgba(124,58,237,0.03)",
    sectionBorder:   "rgba(124,58,237,0.09)",
    statsBg:         "rgba(124,58,237,0.07)",
    statsBorder:     "rgba(124,58,237,0.18)",
    heroBadgeBg:     "rgba(124,58,237,0.10)",
    heroBadgeBorder: "rgba(124,58,237,0.30)",
    heroBadgeFg:     "#6d28d9",
    caseHeaderBorder:"rgba(124,58,237,0.10)",
    caseOldBg:       "rgba(239,68,68,0.03)",
    caseNewBg:       "rgba(124,58,237,0.04)",
    pricingCardBg:   "#ffffff",
    pricingCardBorder:"rgba(124,58,237,0.13)",
    divider:         "rgba(124,58,237,0.10)",
    footerBg:        "transparent",
    trusted:         "rgba(70,40,110,0.28)",
    inputNavLink:    "rgba(70,40,110,0.70)",
    btnOutlineFg:    "rgba(70,40,110,0.85)",
    btnOutlineBg:    "rgba(124,58,237,0.04)",
    btnOutlineBorder:"rgba(124,58,237,0.18)",
    btnOutlineHoverBg:    "rgba(124,58,237,0.08)",
    btnOutlineHoverBorder:"rgba(124,58,237,0.40)",
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
            <div style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(124,58,237,0.20)", border: "1px solid rgba(124,58,237,0.40)" }}>
              <img src="/clogo.png" alt={BRAND} style={{ width: 18, height: 18, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: isDark ? "#fff" : p.fg, letterSpacing: "-0.01em" }}>{BRAND}</span>
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

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", marginBottom: 28, background: p.heroBadgeBg, border: `1px solid ${p.heroBadgeBorder}`, color: p.heroBadgeFg }}>
            <Zap size={12} style={{ fill: "currentColor" }} />
            AI-Powered Outbound Platform
          </div>

          <h1 style={{ fontSize: "clamp(42px,7vw,72px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.02em", marginBottom: 24, color: isDark ? "#fff" : p.fg }}>
            From Intent Signal{" "}
            <br />
            <span style={{ background: "linear-gradient(135deg,#c4b5fd 0%,#7c3aed 50%,#a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              to Inbox.
            </span>
          </h1>

          <p style={{ fontSize: 18, lineHeight: 1.65, maxWidth: 620, margin: "0 auto 40px", color: p.muted(0.72) }}>
            Connecttr takes your company brief, uncovers high-intent B2B prospects across the web, enriches their data, and drafts hyper-personalised outreach. Stop hunting for emails. Start closing.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={handleCTA}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#fff", background: "#7c3aed", border: "none", cursor: "pointer", boxShadow: "0 0 28px rgba(124,58,237,0.45)", transition: "background 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#6d28d9"; e.currentTarget.style.boxShadow = "0 0 38px rgba(124,58,237,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#7c3aed"; e.currentTarget.style.boxShadow = "0 0 28px rgba(124,58,237,0.45)"; }}>
              Get Started Free <ArrowRight size={17} />
            </button>
            <button onClick={() => scrollTo("how-it-works")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 600, color: p.btnOutlineFg, background: p.btnOutlineBg, border: `1px solid ${p.btnOutlineBorder}`, cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = p.btnOutlineHoverBorder; e.currentTarget.style.background = p.btnOutlineHoverBg; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = p.btnOutlineBorder; e.currentTarget.style.background = p.btnOutlineBg; }}>
              See How It Works
            </button>
          </div>

          <p style={{ fontSize: 12, color: p.muted(0.38), marginBottom: 56 }}>
            ✓ No credit card required &nbsp;·&nbsp; ✓ 5-minute setup &nbsp;·&nbsp; ✓ Cancel anytime
          </p>

          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: p.muted(0.35), marginBottom: 20 }}>
            Trusted by high-growth sales teams
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "12px 36px" }}>
            {TRUST_NAMES.map(n => (
              <span key={n} style={{ fontSize: 13, fontWeight: 600, color: p.trusted }}>{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "88px 20px", background: p.sectionBg, borderTop: `1px solid ${p.sectionBorder}`, borderBottom: `1px solid ${p.sectionBorder}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 16 }}>The Problem</p>
            <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 700, color: isDark ? "#fff" : p.fg, marginBottom: 20, lineHeight: 1.2 }}>
              Sales teams spend 70% of their time<br />researching, not selling.
            </h2>
            <p style={{ fontSize: 15, color: p.muted(0.60), maxWidth: 480, margin: "0 auto" }}>
              The manual B2B sales stack is broken. Here's where the hours go.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 20 }}>
            {PROBLEMS.map((item, i) => (
              <div key={i}
                style={{ borderRadius: 16, padding: "28px 28px 28px", background: p.card, border: `1px solid ${p.border}`, transition: "border-color 0.2s, background 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = p.borderHover; e.currentTarget.style.background = p.cardHover; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = p.border; e.currentTarget.style.background = p.card; }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(124,58,237,0.18)", color: "#a78bfa", marginBottom: 20 }}>
                  {item.icon}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? "#fff" : p.fg, marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: p.muted(0.58) }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Case Studies ───────────────────────────────────────────────────── */}
      <section id="use-cases" style={{ padding: "88px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 16 }}>Real-World Scenarios</p>
            <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 700, color: isDark ? "#fff" : p.fg, marginBottom: 20, lineHeight: 1.2 }}>How manual outbound bleeds revenue.</h2>
            <p style={{ fontSize: 15, color: p.muted(0.60), maxWidth: 480, margin: "0 auto" }}>A tale of two firms — and what changes when AI does the heavy lifting.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 24 }}>
            {CASES.map((c, i) => (
              <div key={i} style={{ borderRadius: 20, overflow: "hidden", border: `1px solid ${p.border}`, background: p.card }}>
                <div style={{ padding: "24px 28px", borderBottom: `1px solid ${p.caseHeaderBorder}` }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: "rgba(124,58,237,0.18)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}>{c.label}</span>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? "#fff" : p.fg, margin: "14px 0 8px", lineHeight: 1.3 }}>{c.title}</h3>
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
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 16 }}>How It Works</p>
            <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 700, color: isDark ? "#fff" : p.fg, marginBottom: 20, lineHeight: 1.2 }}>Your entire outbound pipeline.<br />Four steps. Zero manual work.</h2>
            <p style={{ fontSize: 15, color: p.muted(0.60), maxWidth: 480, margin: "0 auto" }}>Connecttr collapses a messy 5-tool stack into a single, cohesive workflow.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 20 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ borderRadius: 16, padding: "24px 24px 28px", background: p.card, border: `1px solid ${p.border}` }}>
                <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, marginBottom: 16, background: "linear-gradient(135deg,rgba(124,58,237,0.6),rgba(124,58,237,0.15))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.num}</div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: isDark ? "#fff" : p.fg, marginBottom: 8 }}>{s.title}</h3>
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
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 16 }}>The Platform</p>
            <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 700, color: isDark ? "#fff" : p.fg, marginBottom: 20, lineHeight: 1.2 }}>The all-in-one command centre.</h2>
            <p style={{ fontSize: 15, color: p.muted(0.60), maxWidth: 480, margin: "0 auto" }}>Every tool your outbound team needs, unified in a single hub.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={i}
                style={{ display: "flex", gap: 20, borderRadius: 16, padding: "24px 28px", background: p.card, border: `1px solid ${p.border}`, transition: "border-color 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = p.borderHover; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = p.border; }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "rgba(124,58,237,0.18)", color: "#a78bfa" }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? "#fff" : p.fg, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: p.muted(0.58) }}>{f.body}</p>
                </div>
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
              <div style={{ fontSize: 40, fontWeight: 900, color: isDark ? "#fff" : p.fg, marginBottom: 8 }}>{s.stat}</div>
              <div style={{ fontSize: 13, color: p.muted(0.65), marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(124,58,237,0.75)" }}>{s.src}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "88px 20px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 16 }}>Pricing</p>
            <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 700, color: isDark ? "#fff" : p.fg, lineHeight: 1.2 }}>Simple, transparent pricing.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 24, maxWidth: 600, margin: "0 auto" }}>
            {/* Starter */}
            <div style={{ borderRadius: 20, padding: 32, background: p.pricingCardBg, border: `1px solid ${p.pricingCardBorder}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: p.muted(0.65), marginBottom: 4 }}>Starter</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: isDark ? "#fff" : p.fg, marginBottom: 4 }}>Free</div>
              <div style={{ fontSize: 12, color: p.muted(0.45), marginBottom: 28 }}>No credit card required</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 12 }}>
                {["1 active campaign", "50 leads / month", "Email enrichment", "AI email drafting"].map(item => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: p.muted(0.70) }}>
                    <CheckCircle size={14} style={{ color: "#a78bfa", flexShrink: 0 }} /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={handleCTA}
                style={{ width: "100%", padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#c4b5fd", background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.35)", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.20)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.10)"; }}>
                Get Started Free
              </button>
            </div>

            {/* Growth */}
            <div style={{ borderRadius: 20, padding: 32, position: "relative", overflow: "hidden", background: isDark ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.45)", boxShadow: "0 0 40px rgba(124,58,237,0.15)" }}>
              <span style={{ position: "absolute", top: 16, right: 16, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: "rgba(124,58,237,0.30)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.50)" }}>Most Popular</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: p.muted(0.65), marginBottom: 4 }}>Growth</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 900, color: isDark ? "#fff" : p.fg }}>$99</span>
                <span style={{ fontSize: 14, color: p.muted(0.55), marginBottom: 8 }}>/mo</span>
              </div>
              <div style={{ fontSize: 12, color: p.muted(0.45), marginBottom: 28 }}>Billed monthly</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 12 }}>
                {["Unlimited campaigns", "1,500 leads / month", "CRM integrations", "Campaign analytics", "Priority support"].map(item => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: p.muted(0.75) }}>
                    <CheckCircle size={14} style={{ color: "#a78bfa", flexShrink: 0 }} /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={handleCTA}
                style={{ width: "100%", padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#fff", background: "#7c3aed", border: "none", cursor: "pointer", boxShadow: "0 0 20px rgba(124,58,237,0.40)", transition: "background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#6d28d9"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#7c3aed"; }}>
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 20px", position: "relative", overflow: "hidden", borderTop: `1px solid ${p.sectionBorder}` }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 60%, rgba(124,58,237,0.18) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 800, color: isDark ? "#fff" : p.fg, marginBottom: 24, lineHeight: 1.1 }}>
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
                <span style={{ fontWeight: 700, fontSize: 14, color: isDark ? "#fff" : p.fg }}>{BRAND}</span>
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
        @media (max-width: 640px) {
          .grid-footer { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 400px) {
          .grid-footer { grid-template-columns: 1fr !important; }
        }
        .hidden { display: none; }
        @media (min-width: 768px) { .hidden { display: flex; } }
        .md\\:hidden { display: flex; }
        @media (min-width: 768px) { .md\\:hidden { display: none !important; } }
      `}</style>
    </div>
  );
};

export default LandingPage;
