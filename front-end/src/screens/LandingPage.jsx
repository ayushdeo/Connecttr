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

// ─── Data ────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    icon: <Search size={20} />,
    title: "The List Building Trap",
    body: "Scraping directories, fighting outdated databases, and guessing who is actually ready to buy right now.",
  },
  {
    icon: <Database size={20} />,
    title: "The Enrichment Black Hole",
    body: "Bouncing between three different software tools just to find a single verified email address.",
  },
  {
    icon: <Clock size={20} />,
    title: "The Personalization Bottleneck",
    body: "Spending 20 minutes researching a prospect's LinkedIn just to write a custom intro that might get opened.",
  },
];

const CASES = [
  {
    label: "Case Study 01",
    title: "The Specialized Tech Consulting Firm",
    situation: "A 15-person cloud consultancy wants to pitch their new AWS migration service to Series B startups.",
    oldWay: {
      summary: "A junior partner spends all Thursday hunting for the CTO's email on Google and writing 15 personalized emails.",
      result: "6 hours of work → 2 replies.",
    },
    newWay: {
      summary: "Connecttr ingests the brief, monitors web signals for companies posting AWS job openings, pulls verified CTO emails, and drafts 15 tailored pitches referencing their specific job stack.",
      result: "45 seconds → pipeline ready.",
    },
  },
  {
    label: "Case Study 02",
    title: "The Enterprise Management Consulting Group",
    situation: "A boutique HR advisory firm targets Fortune 500 companies undergoing major executive restructuring.",
    oldWay: {
      summary: "SDRs manually track press releases and LinkedIn. By the time they verify the new VP's email and write a pitch, a competitor has already booked the meeting.",
      result: "Days of work → too late.",
    },
    newWay: {
      summary: "Connecttr tracks organizational shifts in real-time. The moment a new VP of HR is announced, the system enriches the contact and delivers a tailored intro email to the SDR's inbox.",
      result: "Instant alert → first mover advantage.",
    },
  },
];

const STEPS = [
  {
    num: "01",
    title: "Drop Your Brief",
    body: "Tell Connecttr what you sell, your value proposition, and who your ideal customer profile is.",
  },
  {
    num: "02",
    title: "AI Uncovers Intent",
    body: "Our AI scours the web for real-time buying signals — hiring trends, tech stack changes, and funding rounds.",
  },
  {
    num: "03",
    title: "Enrichment & Verification",
    body: "Connecttr automatically surfaces 100% verified corporate email addresses. No more bounced emails.",
  },
  {
    num: "04",
    title: "Hyper-Personalized Drafts",
    body: "The platform writes unique, context-aware outreach emails tailored to each prospect's current business situation.",
  },
];

const FEATURES = [
  {
    icon: <Search size={22} />,
    title: "Lead Discovery Engine",
    body: "Continuous background web tracking that identifies high-intent targets based on real actions, not static dead lists.",
  },
  {
    icon: <Shield size={22} />,
    title: "Identity Enrichment",
    body: "Deep identity resolution that uncovers valid email addresses, direct dials, and professional backgrounds instantly.",
  },
  {
    icon: <Brain size={22} />,
    title: "Contextual Email Generator",
    body: "An LLM-driven engine that reviews a prospect's public footprint to weave genuine personal hooks into every draft.",
  },
  {
    icon: <BarChart2 size={22} />,
    title: "Campaign Analytics",
    body: "Track delivery rates, opens, replies, and meetings booked. Absolute clarity on your pipeline ROI.",
  },
];

const TRUST_NAMES = ["AdBlockify", "VEED", "GetInbox", "Landing.ai", "Descript"];

// ─── Component ───────────────────────────────────────────────────────────────

const LandingPage = () => {
  const { user, loading } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleCTA = () => {
    if (loading) return;
    navigate(user ? "/dashboard" : "/login");
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div className="dark min-h-screen font-sans overflow-x-hidden" style={{ background: "#0a0612", color: "#f0ebf8" }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
        style={{
          background: scrolled ? "rgba(10,6,18,0.92)" : "rgba(10,6,18,0.75)",
          backdropFilter: "blur(16px)",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-6">

          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.4)" }}>
              <img src="/clogo.png" alt={BRAND} className="w-4.5 h-4.5 object-contain"
                   onError={e => { e.target.style.display = "none"; }} />
            </div>
            <span className="font-bold text-base text-white tracking-tight">{BRAND}</span>
          </a>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-1">
            {[["Features", "features"], ["How It Works", "how-it-works"], ["Use Cases", "use-cases"], ["Pricing", "pricing"]].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: "rgba(200,185,220,0.75)" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(200,185,220,0.75)"; e.currentTarget.style.background = "transparent"; }}>
                {label}
              </button>
            ))}
          </div>

          {/* Right actions — desktop */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-lg transition-colors"
                    style={{ color: "rgba(200,185,220,0.6)" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(200,185,220,0.6)"; }}>
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {user ? (
              <button onClick={handleCTA}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150 active:scale-[0.97]"
                style={{ background: "rgba(124,58,237,0.85)", border: "1px solid rgba(124,58,237,0.6)" }}>
                Go to Dashboard
              </button>
            ) : (
              <>
                <button onClick={handleCTA}
                  className="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: "rgba(200,185,220,0.75)" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(200,185,220,0.75)"; }}>
                  Sign In
                </button>
                <button onClick={handleCTA}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150 active:scale-[0.97]"
                  style={{ background: "#7c3aed", boxShadow: "0 0 18px rgba(124,58,237,0.35)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#6d28d9"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#7c3aed"; }}>
                  Create Free Account
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 rounded-lg" style={{ color: "rgba(200,185,220,0.8)" }}
                  onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden px-5 pb-4 pt-2 border-t" style={{ background: "rgba(10,6,18,0.97)", borderColor: "rgba(255,255,255,0.07)" }}>
            {[["Features", "features"], ["How It Works", "how-it-works"], ["Use Cases", "use-cases"], ["Pricing", "pricing"]].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium block"
                style={{ color: "rgba(200,185,220,0.8)" }}>
                {label}
              </button>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <button onClick={handleCTA} className="w-full py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#7c3aed" }}>
                {user ? "Go to Dashboard" : "Create Free Account"}
              </button>
              {!user && (
                <button onClick={handleCTA} className="w-full py-3 rounded-xl text-sm font-medium"
                  style={{ color: "rgba(200,185,220,0.75)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-5 text-center relative overflow-hidden">

        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
             style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.22) 0%, transparent 70%)" }} />

        <div className="relative z-10 max-w-4xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-7 tracking-wide"
               style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)", color: "#c4b5fd" }}>
            <Zap size={12} className="fill-current" />
            AI-Powered Outbound Platform
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6 text-white">
            From Intent Signal{" "}
            <br className="hidden sm:block" />
            <span style={{
              background: "linear-gradient(135deg, #c4b5fd 0%, #7c3aed 50%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              to Inbox.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
             style={{ color: "rgba(200,185,220,0.72)" }}>
            Connecttr takes your company brief, uncovers high-intent B2B prospects across the web,
            enriches their data, and drafts hyper-personalised outreach.
            Stop hunting for emails. Start closing.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
            <button onClick={handleCTA}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white transition-all duration-150 active:scale-[0.97]"
              style={{ background: "#7c3aed", boxShadow: "0 0 28px rgba(124,58,237,0.45)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#6d28d9"; e.currentTarget.style.boxShadow = "0 0 36px rgba(124,58,237,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#7c3aed"; e.currentTarget.style.boxShadow = "0 0 28px rgba(124,58,237,0.45)"; }}>
              Get Started Free <ArrowRight size={17} />
            </button>
            <button onClick={() => scrollTo("how-it-works")}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold transition-all duration-150 active:scale-[0.97]"
              style={{ color: "rgba(200,185,220,0.85)", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; e.currentTarget.style.background = "rgba(124,58,237,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
              See How It Works
            </button>
          </div>
          <p className="text-xs mb-14" style={{ color: "rgba(200,185,220,0.38)" }}>
            ✓ No credit card required &nbsp;·&nbsp; ✓ 5-minute setup &nbsp;·&nbsp; ✓ Cancel anytime
          </p>

          {/* Trust strip */}
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-5"
               style={{ color: "rgba(200,185,220,0.35)" }}>
              Trusted by high-growth sales teams
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              {TRUST_NAMES.map(name => (
                <span key={name} className="text-sm font-semibold"
                      style={{ color: "rgba(200,185,220,0.30)" }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-5" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "#a78bfa" }}>
              The Problem
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
              Sales teams spend 70% of their time<br className="hidden sm:block" /> researching, not selling.
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(200,185,220,0.60)" }}>
              The manual B2B sales stack is broken. Here's where the hours go.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {PROBLEMS.map((p, i) => (
              <div key={i} className="rounded-2xl p-7 transition-all duration-200"
                   style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                   onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)"; e.currentTarget.style.background = "rgba(124,58,237,0.06)"; }}
                   onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                     style={{ background: "rgba(124,58,237,0.18)", color: "#a78bfa" }}>
                  {p.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-3">{p.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(200,185,220,0.58)" }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Case Studies ───────────────────────────────────────────────────── */}
      <section id="use-cases" className="py-24 px-5">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "#a78bfa" }}>
              Real-World Scenarios
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
              How manual outbound bleeds revenue.
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(200,185,220,0.60)" }}>
              A tale of two firms — and what changes when AI does the heavy lifting.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {CASES.map((c, i) => (
              <div key={i} className="rounded-2xl overflow-hidden"
                   style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}>

                {/* Header */}
                <div className="px-7 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(124,58,237,0.2)", color: "#c4b5fd" }}>
                    {c.label}
                  </span>
                  <h3 className="text-base font-bold text-white mt-3 leading-snug">{c.title}</h3>
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: "rgba(200,185,220,0.55)" }}>
                    <span className="font-semibold" style={{ color: "rgba(200,185,220,0.75)" }}>The situation: </span>
                    {c.situation}
                  </p>
                </div>

                {/* Old Way */}
                <div className="px-7 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(239,68,68,0.04)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                         style={{ background: "rgba(239,68,68,0.2)" }}>
                      <X size={11} style={{ color: "#f87171" }} />
                    </div>
                    <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "#f87171" }}>
                      The Old Way
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(200,185,220,0.58)" }}>
                    {c.oldWay.summary}
                  </p>
                  <div className="text-xs font-semibold px-3 py-1.5 rounded-lg inline-block"
                       style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {c.oldWay.result}
                  </div>
                </div>

                {/* Connecttr Way */}
                <div className="px-7 py-5" style={{ background: "rgba(124,58,237,0.05)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                         style={{ background: "rgba(124,58,237,0.25)" }}>
                      <CheckCircle size={11} style={{ color: "#a78bfa" }} />
                    </div>
                    <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "#a78bfa" }}>
                      The Connecttr Way
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(200,185,220,0.68)" }}>
                    {c.newWay.summary}
                  </p>
                  <div className="text-xs font-semibold px-3 py-1.5 rounded-lg inline-block"
                       style={{ background: "rgba(124,58,237,0.18)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}>
                    {c.newWay.result}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-5"
               style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "#a78bfa" }}>
              How It Works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
              Your entire outbound pipeline.<br className="hidden sm:block" /> Four steps. Zero manual work.
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(200,185,220,0.60)" }}>
              Connecttr collapses a messy 5-tool stack into a single, cohesive workflow.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => (
              <div key={i} className="relative rounded-2xl p-6"
                   style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Connector line on desktop */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-9 left-full w-5 z-10"
                       style={{ height: "1px", background: "linear-gradient(90deg, rgba(124,58,237,0.5), rgba(124,58,237,0.1))" }} />
                )}
                <div className="text-3xl font-black mb-4 leading-none"
                     style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.6), rgba(124,58,237,0.15))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {s.num}
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(200,185,220,0.55)" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-5">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "#a78bfa" }}>
              The Platform
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
              The all-in-one command centre.
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(200,185,220,0.60)" }}>
              Every tool your outbound team needs, unified in a single hub.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex gap-5 rounded-2xl p-7 transition-all duration-200"
                   style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                   onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.30)"; }}
                   onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: "rgba(124,58,237,0.18)", color: "#a78bfa" }}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(200,185,220,0.58)" }}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-5"
               style={{ background: "rgba(124,58,237,0.08)", borderTop: "1px solid rgba(124,58,237,0.18)", borderBottom: "1px solid rgba(124,58,237,0.18)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            { stat: "50%", label: "reduction in customer acquisition cost", source: "McKinsey" },
            { stat: "70%", label: "of sales time reclaimed from manual research", source: "Salesforce" },
            { stat: "3×", label: "more meetings booked vs. manual outreach", source: "Connecttr data" },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-4xl font-black text-white mb-2">{s.stat}</div>
              <div className="text-sm mb-1" style={{ color: "rgba(200,185,220,0.65)" }}>{s.label}</div>
              <div className="text-xs font-medium" style={{ color: "rgba(124,58,237,0.75)" }}>{s.source}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-5">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "#a78bfa" }}>
              Pricing
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
              Simple, transparent pricing.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Starter */}
            <div className="rounded-2xl p-8"
                 style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <div className="text-sm font-semibold mb-1" style={{ color: "rgba(200,185,220,0.65)" }}>Starter</div>
              <div className="text-4xl font-black text-white mb-1">Free</div>
              <div className="text-xs mb-7" style={{ color: "rgba(200,185,220,0.45)" }}>No credit card required</div>
              <ul className="space-y-3 mb-8">
                {["1 active campaign", "50 leads / month", "Email enrichment", "AI email drafting"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "rgba(200,185,220,0.70)" }}>
                    <CheckCircle size={14} style={{ color: "#a78bfa", flexShrink: 0 }} /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={handleCTA}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150"
                style={{ border: "1px solid rgba(124,58,237,0.4)", color: "#c4b5fd", background: "rgba(124,58,237,0.08)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.08)"; }}>
                Get Started Free
              </button>
            </div>

            {/* Growth */}
            <div className="rounded-2xl p-8 relative overflow-hidden"
                 style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.45)", boxShadow: "0 0 40px rgba(124,58,237,0.15)" }}>
              <div className="absolute top-4 right-4 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
                   style={{ background: "rgba(124,58,237,0.35)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.5)" }}>
                Most Popular
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: "rgba(200,185,220,0.65)" }}>Growth</div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-black text-white">$79</span>
                <span className="text-base mb-1.5" style={{ color: "rgba(200,185,220,0.55)" }}>/mo</span>
              </div>
              <div className="text-xs mb-7" style={{ color: "rgba(200,185,220,0.45)" }}>Billed monthly</div>
              <ul className="space-y-3 mb-8">
                {["Unlimited campaigns", "500 leads / month", "Priority enrichment", "AI email drafting", "Campaign analytics", "Email support"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "rgba(200,185,220,0.75)" }}>
                    <CheckCircle size={14} style={{ color: "#a78bfa", flexShrink: 0 }} /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={handleCTA}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98]"
                style={{ background: "#7c3aed", boxShadow: "0 0 20px rgba(124,58,237,0.40)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#6d28d9"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#7c3aed"; }}>
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="py-28 px-5 relative overflow-hidden"
               style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(124,58,237,0.18) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
            Ready to take the friction out<br className="hidden sm:block" /> of your growth?
          </h2>
          <p className="text-lg mb-10" style={{ color: "rgba(200,185,220,0.62)" }}>
            Join the modern sales teams using Connecttr to collapse research and expand revenue.
            Set up your pipeline in less than 5 minutes.
          </p>
          <button onClick={handleCTA}
            className="inline-flex items-center gap-2.5 px-9 py-4 rounded-xl text-base font-semibold text-white transition-all duration-150 active:scale-[0.97]"
            style={{ background: "#7c3aed", boxShadow: "0 0 32px rgba(124,58,237,0.50)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#6d28d9"; e.currentTarget.style.boxShadow = "0 0 44px rgba(124,58,237,0.60)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#7c3aed"; e.currentTarget.style.boxShadow = "0 0 32px rgba(124,58,237,0.50)"; }}>
            Build Your First Pipeline Free <ArrowRight size={18} />
          </button>
          <p className="mt-4 text-xs" style={{ color: "rgba(200,185,220,0.35)" }}>
            No credit card required · Cancel anytime
          </p>

          {/* Social proof stars */}
          <div className="mt-12 flex items-center justify-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} className="fill-current" style={{ color: "#7c3aed" }} />
            ))}
            <span className="ml-2 text-sm" style={{ color: "rgba(200,185,220,0.50)" }}>
              Loved by sales teams
            </span>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-5 py-12" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">

            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                     style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.4)" }}>
                  <img src="/clogo.png" alt={BRAND} className="w-4 h-4 object-contain"
                       onError={e => { e.target.style.display = "none"; }} />
                </div>
                <span className="font-bold text-sm text-white">{BRAND}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(200,185,220,0.45)" }}>
                From Intent to Inbox.<br />The B2B outbound platform.
              </p>
            </div>

            {[
              { heading: "Product", links: ["Features", "Pricing", "Changelog"] },
              { heading: "Company", links: ["About", "Careers", "Contact"] },
              { heading: "Legal", links: ["Privacy Policy", "Terms of Service", "GDPR"] },
            ].map(col => (
              <div key={col.heading}>
                <h4 className="text-xs font-bold tracking-widest uppercase mb-4"
                    style={{ color: "rgba(200,185,220,0.40)" }}>
                  {col.heading}
                </h4>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}>
                      <span className="text-sm cursor-pointer transition-colors"
                            style={{ color: "rgba(200,185,220,0.50)" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "rgba(200,185,220,0.50)"; }}>
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6"
               style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs" style={{ color: "rgba(200,185,220,0.30)" }}>
              © {new Date().getFullYear()} {BRAND}. All rights reserved.
            </p>
            <button onClick={toggle}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(200,185,220,0.40)", border: "1px solid rgba(255,255,255,0.07)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(200,185,220,0.40)"; }}>
              {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
