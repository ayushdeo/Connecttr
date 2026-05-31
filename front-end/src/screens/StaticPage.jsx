import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { ArrowLeft, Sun, Moon, CheckCircle, Zap, Search, Shield, Brain, BarChart2, Globe } from "lucide-react";
import { BRAND } from "../brand";

// ─── Page content ────────────────────────────────────────────────────────────

const PAGES = {
  features: {
    title: "Features",
    subtitle: "Everything you need to scale B2B outbound growth.",
    sections: [
      {
        icon: <Search size={24} />,
        heading: "Lead Discovery Engine",
        body: "Monitor hiring activity, funding announcements, technology stack changes, partnerships, expansion signals, executive hires, and other intent indicators. Connecttr continuously scans the web so your pipeline is always stocked with prospects who are actively signalling buying intent — not static lists built six months ago.",
      },
      {
        icon: <Shield size={24} />,
        heading: "Data Enrichment & Verification",
        body: "Resolve professional identities, verify business contact information, and consolidate account intelligence. Connecttr surfaces verified corporate email addresses and direct dials so your outreach lands in the right inbox every time — eliminating bounce rates and wasted sequences.",
      },
      {
        icon: <Brain size={24} />,
        heading: "Contextual Personalisation Engine",
        body: "Generate tailored outreach drafts based on company context, role responsibilities, and publicly available business signals. Every email is unique — not a mail-merge template. The engine reads each prospect's public footprint and weaves genuine personal hooks into every single draft.",
      },
      {
        icon: <BarChart2 size={24} />,
        heading: "Unified Sales Hub",
        body: "Manage prospects, campaigns, drafts, analytics, and workflows from a single dashboard. No more switching between five tools. Everything your outbound team needs lives in one place, with a clean interface designed for speed and clarity.",
      },
      {
        icon: <Globe size={24} />,
        heading: "Integrations",
        body: "CRM synchronisation, email delivery providers, analytics tools, and webhook support. Connecttr fits into your existing stack rather than forcing you to rebuild it. Connect your CRM, sync contacts automatically, and push activity data wherever you need it.",
      },
    ],
  },

  pricing: {
    title: "Pricing",
    subtitle: "Simple, transparent pricing. No hidden fees.",
    pricing: true,
    tiers: [
      {
        name: "Starter",
        price: "Free",
        sub: "No credit card required",
        features: ["50 enriched contacts per month", "Basic intent monitoring", "AI email drafts", "Community support"],
        cta: "Get Started Free",
        highlight: false,
      },
      {
        name: "Growth",
        price: "$99",
        period: "/month",
        sub: "Billed monthly",
        features: ["1,500 enriched contacts per month", "Advanced intent monitoring", "CRM integrations", "Campaign analytics", "Priority support"],
        cta: "Start Free Trial",
        highlight: true,
      },
      {
        name: "Enterprise",
        price: "Custom",
        sub: "Talk to our team",
        features: ["Unlimited enrichment", "Custom workflows", "Advanced security controls", "Dedicated account manager", "Custom onboarding and SLA"],
        cta: "Contact Sales",
        highlight: false,
      },
    ],
  },

  changelog: {
    title: "Changelog",
    subtitle: "What's new in Connecttr.",
    changelog: true,
    entries: [
      {
        date: "May 2026",
        items: [
          { type: "Feature",     text: "OntoAgent Framework v2 released — faster, more accurate intent classification across all discovery signals." },
          { type: "Improvement", text: "Faster enrichment pipeline — average enrichment latency reduced by 40%." },
          { type: "Improvement", text: "Reduced draft generation latency — email drafts now generate in under 2 seconds." },
          { type: "Fix",         text: "Analytics synchronisation improvements — campaign metrics now update in real-time." },
        ],
      },
    ],
  },

  about: {
    title: "About",
    subtitle: "Built to eliminate the busywork that slows modern B2B growth teams.",
    sections: [
      {
        heading: "Our Story",
        body: "Built in Los Angeles, California, Connecttr was created to eliminate the repetitive work that slows modern B2B growth teams. Founded by engineers and researchers connected to the USC technology ecosystem, Connecttr combines AI, automation, and data intelligence into a single platform that takes a company brief and turns it into a complete prospecting workflow.",
      },
      {
        heading: "Mission",
        body: "Help businesses spend less time researching and more time building relationships and closing deals. We believe the future of outbound sales is AI-native — where every rep has a tireless research assistant working in the background, surfacing the right prospect at the right moment with the right message.",
      },
      {
        heading: "Vision",
        body: "Become the operating system for AI-native B2B growth. We're building toward a world where the entire outbound workflow — discovery, enrichment, personalisation, delivery, and analysis — is fully automated, with humans focused entirely on high-value relationship work.",
      },
      {
        heading: "Values",
        body: null,
        bullets: ["Customer obsession — every product decision starts with what makes customers more successful.", "Transparency — clear pricing, clear data practices, clear communication.", "Product craftsmanship — we care deeply about quality, detail, and experience.", "Responsible AI — we build AI systems that are accurate, fair, and used ethically.", "Continuous innovation — we ship fast, learn quickly, and keep raising the bar."],
      },
    ],
  },

  careers: {
    title: "Careers",
    subtitle: "Join us in building the future of AI-powered outbound growth.",
    sections: [
      {
        heading: "Why Connecttr",
        bullets: [
          "Solve challenging AI and automation problems that directly impact revenue for businesses worldwide.",
          "Build products used by growth teams across industries.",
          "Work alongside ambitious engineers and operators who move fast and care about craft.",
          "Hybrid culture based in Los Angeles, California.",
        ],
      },
      {
        heading: "Open Roles",
        roles: [
          { title: "Senior AI Agent Engineer", dept: "Engineering", type: "Full-time · Hybrid LA" },
          { title: "Backend Platform Engineer", dept: "Engineering", type: "Full-time · Hybrid LA" },
          { title: "Full Stack Product Engineer", dept: "Engineering", type: "Full-time · Hybrid LA" },
          { title: "Growth Marketing Manager", dept: "Marketing", type: "Full-time · Hybrid LA" },
        ],
      },
    ],
  },

  contact: {
    title: "Contact",
    subtitle: "We'd love to hear from you.",
    sections: [
      {
        heading: "Get in Touch",
        body: "Enterprise inquiries, partnerships, product feedback, and media requests are welcome. Our team typically responds within one business day.",
      },
      {
        heading: "Support",
        contact: { label: "Email", value: "info@connecttr.com", href: "mailto:info@connecttr.com" },
      },
      {
        heading: "Office",
        body: "Los Angeles, California, USA",
      },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    subtitle: "Connecttr is committed to protecting your information.",
    legal: true,
    sections: [
      { heading: "What We Collect", body: "We collect information necessary to provide platform functionality, account management, analytics, and support. This includes account details provided during registration, usage data about how you interact with the platform, and business contact information processed as part of enrichment workflows." },
      { heading: "How We Use It", body: "Customer data is processed securely and access is restricted to authorized personnel. We use your information to operate and improve the platform, provide customer support, send important service communications, and comply with legal obligations." },
      { heading: "AI Training", body: "Customer-provided information is not used to train public AI models. Your data and your customers' data stays yours. We use industry-standard AI models and APIs to power the platform's capabilities without exposing your data to model training pipelines." },
      { heading: "Your Rights", body: "Users may request access, correction, or deletion of eligible personal information at any time. To exercise these rights, contact us at info@connecttr.com. We will respond to eligible requests within 30 days in accordance with applicable law." },
      { heading: "Data Security", body: "We implement appropriate technical and organisational measures to protect your information against unauthorised access, alteration, disclosure, or destruction. All data in transit is encrypted using TLS and data at rest is encrypted using AES-256." },
    ],
  },

  terms: {
    title: "Terms of Service",
    subtitle: "By using Connecttr, you agree to the following terms.",
    legal: true,
    sections: [
      { heading: "Acceptance", body: "By accessing or using Connecttr, you agree to comply with and be bound by these Terms of Service and all applicable laws and regulations. If you do not agree, please do not use the platform." },
      { heading: "Subscriptions", body: "Subscriptions automatically renew at the end of each billing period unless cancelled before the renewal date. You may cancel at any time through your account settings or by contacting support. Refunds are provided at our discretion in accordance with applicable law." },
      { heading: "Acceptable Use", body: "Customers are responsible for lawful use of outreach workflows and communications. You agree not to use Connecttr to send spam, violate anti-spam laws (including CAN-SPAM and GDPR), harass individuals, or engage in any activity that violates applicable laws or regulations." },
      { heading: "Platform Changes", body: "Connecttr may update platform functionality, features, and pricing over time. We will provide reasonable notice of material changes. Continued use of the platform after changes take effect constitutes acceptance of the updated terms." },
      { heading: "Limitation of Liability", body: "Liability is limited to the maximum extent permitted by California law. In no event shall Connecttr be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the platform." },
    ],
  },

  gdpr: {
    title: "GDPR Compliance",
    subtitle: "Connecttr supports GDPR-aligned data practices.",
    legal: true,
    sections: [
      { heading: "Our Approach", body: "Connecttr supports GDPR-aligned practices for customers operating within or targeting the European Economic Area. We act as a data processor for enrichment workflows and provide the tools necessary for customers to meet their obligations as data controllers." },
      { heading: "Data Subject Requests", body: "Data subject requests can be submitted for access, correction, export, or deletion. Requests should be submitted to info@connecttr.com. We will acknowledge requests within 72 hours and fulfil eligible requests within 30 days in accordance with GDPR Article 12." },
      { heading: "Data Processed", body: "Only business-relevant and publicly available professional information is processed for enrichment workflows. This includes publicly listed business email addresses, professional role information, company data, and other signals available in the public domain." },
      { heading: "Data Removal", body: "Customers can request removal of specific records through dedicated compliance channels. Individuals who wish to be excluded from Connecttr's enrichment database may submit a removal request to info@connecttr.com." },
      { heading: "Security & Accountability", body: "Security, transparency, and accountability are core principles of our compliance programme. We maintain records of processing activities, conduct regular security assessments, and provide DPA agreements upon request for enterprise customers." },
    ],
  },
};

// ─── Badge colour by changelog type ─────────────────────────────────────────

const BADGE = {
  Feature:     { bg: "rgba(124,58,237,0.18)", color: "#c4b5fd", border: "rgba(124,58,237,0.35)" },
  Improvement: { bg: "rgba(34,197,94,0.12)",  color: "#86efac", border: "rgba(34,197,94,0.30)" },
  Fix:         { bg: "rgba(251,191,36,0.12)",  color: "#fde68a", border: "rgba(251,191,36,0.30)" },
};

// ─── Component ───────────────────────────────────────────────────────────────

const StaticPage = ({ page }) => {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  const bg       = isDark ? "#0a0612"            : "#f9f6ff";
  const fg       = isDark ? "#f0ebf8"            : "#1a0d2e";
  const muted    = (a) => isDark ? `rgba(200,185,220,${a})` : `rgba(70,40,110,${a})`;
  const card     = isDark ? "rgba(255,255,255,0.04)" : "#ffffff";
  const border   = isDark ? "rgba(255,255,255,0.08)" : "rgba(124,58,237,0.12)";
  const navBg    = isDark ? "rgba(10,6,18,0.94)" : "rgba(249,246,255,0.96)";
  const sectionBg = isDark ? "rgba(255,255,255,0.025)" : "rgba(124,58,237,0.03)";

  const content = PAGES[page];
  if (!content) return <div style={{ padding: 40 }}>Page not found.</div>;

  return (
    <div style={{ background: bg, color: fg, minHeight: "100vh", fontFamily: "Inter,system-ui,sans-serif" }}>

      {/* Simple top nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 40, background: navBg, backdropFilter: "blur(16px)", borderBottom: `1px solid ${border}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => navigate("/")}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: muted(0.65), background: "transparent", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8, transition: "color 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = fg; }}
              onMouseLeave={e => { e.currentTarget.style.color = muted(0.65); }}>
              <ArrowLeft size={15} /> Back
            </button>
            <div style={{ width: 1, height: 18, background: border }} />
            <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(124,58,237,0.20)", border: "1px solid rgba(124,58,237,0.40)" }}>
                <img src="/clogo.png" alt={BRAND} style={{ width: 14, height: 14, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: fg }}>{BRAND}</span>
            </button>
          </div>

          <button onClick={toggle}
            style={{ padding: 8, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", color: muted(0.55), transition: "color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = fg; }}
            onMouseLeave={e => { e.currentTarget.style.color = muted(0.55); }}>
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </nav>

      {/* Page header */}
      <div style={{ padding: "72px 20px 48px", textAlign: "center", background: isDark ? "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.14) 0%, transparent 60%)" : "none" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16, lineHeight: 1.1 }}>
            {content.title}
          </h1>
          <p style={{ fontSize: 17, color: muted(0.65), lineHeight: 1.6 }}>{content.subtitle}</p>
        </div>
      </div>

      {/* Page body */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px 96px" }}>

        {/* ── Pricing ────────────────────────────────────────────────── */}
        {content.pricing && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 24 }}>
            {content.tiers.map((tier, i) => (
              <div key={i} style={{
                borderRadius: 20, padding: 32,
                background: tier.highlight ? (isDark ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.07)") : card,
                border: `1px solid ${tier.highlight ? "rgba(124,58,237,0.45)" : border}`,
                boxShadow: tier.highlight ? "0 0 40px rgba(124,58,237,0.15)" : "none",
                position: "relative",
              }}>
                {tier.highlight && (
                  <span style={{ position: "absolute", top: 16, right: 16, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: "rgba(124,58,237,0.30)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.50)" }}>
                    Most Popular
                  </span>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, color: muted(0.60), marginBottom: 4 }}>{tier.name}</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 38, fontWeight: 900, color: isDark ? "#fff" : fg }}>{tier.price}</span>
                  {tier.period && <span style={{ fontSize: 14, color: muted(0.50), marginBottom: 7 }}>{tier.period}</span>}
                </div>
                <div style={{ fontSize: 12, color: muted(0.42), marginBottom: 28 }}>{tier.sub}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {tier.features.map(f => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: muted(0.72) }}>
                      <CheckCircle size={14} style={{ color: "#a78bfa", flexShrink: 0, marginTop: 2 }} /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate("/login")}
                  style={{ width: "100%", padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "background 0.15s",
                    color: tier.highlight ? "#fff" : "#c4b5fd",
                    background: tier.highlight ? "#7c3aed" : "rgba(124,58,237,0.10)",
                    border: tier.highlight ? "none" : "1px solid rgba(124,58,237,0.35)",
                    boxShadow: tier.highlight ? "0 0 18px rgba(124,58,237,0.35)" : "none",
                  }}>
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Changelog ──────────────────────────────────────────────── */}
        {content.changelog && (
          <div>
            {content.entries.map((entry, i) => (
              <div key={i} style={{ marginBottom: 48 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                  <span>{entry.date}</span>
                  <div style={{ flex: 1, height: 1, background: border }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {entry.items.map((item, j) => (
                    <div key={j} style={{ display: "flex", gap: 16, padding: "20px 24px", borderRadius: 14, background: card, border: `1px solid ${border}` }}>
                      <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, height: 22, padding: "0 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: BADGE[item.type]?.bg, color: BADGE[item.type]?.color, border: `1px solid ${BADGE[item.type]?.border}` }}>
                        {item.type}
                      </span>
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: muted(0.75), margin: 0 }}>{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Careers (special) ──────────────────────────────────────── */}
        {page === "careers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {content.sections.map((sec, i) => (
              <div key={i}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: isDark ? "#fff" : fg, marginBottom: 24 }}>{sec.heading}</h2>
                {sec.bullets && (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                    {sec.bullets.map((b, j) => (
                      <li key={j} style={{ display: "flex", gap: 12, fontSize: 15, color: muted(0.72), lineHeight: 1.6 }}>
                        <CheckCircle size={16} style={{ color: "#a78bfa", flexShrink: 0, marginTop: 3 }} /> {b}
                      </li>
                    ))}
                  </ul>
                )}
                {sec.roles && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {sec.roles.map((role, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderRadius: 14, background: card, border: `1px solid ${border}`, flexWrap: "wrap", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? "#fff" : fg, marginBottom: 4 }}>{role.title}</div>
                          <div style={{ fontSize: 12, color: muted(0.55) }}>{role.dept} · {role.type}</div>
                        </div>
                        <button onClick={() => navigate("/contact")}
                          style={{ padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#c4b5fd", background: "rgba(124,58,237,0.14)", border: "1px solid rgba(124,58,237,0.35)", cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.24)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.14)"; }}>
                          Apply Now
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Contact (special) ──────────────────────────────────────── */}
        {page === "contact" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 24 }}>
            {content.sections.map((sec, i) => (
              <div key={i} style={{ padding: "28px 28px", borderRadius: 16, background: card, border: `1px solid ${border}` }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#a78bfa", marginBottom: 14 }}>{sec.heading}</h3>
                {sec.body && <p style={{ fontSize: 14, lineHeight: 1.7, color: muted(0.68) }}>{sec.body}</p>}
                {sec.contact && (
                  <a href={sec.contact.href}
                    style={{ fontSize: 15, fontWeight: 600, color: "#a78bfa", textDecoration: "none" }}
                    onMouseEnter={e => { e.currentTarget.style.textDecoration = "underline"; }}
                    onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}>
                    {sec.contact.value}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Features (special) ─────────────────────────────────────── */}
        {page === "features" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {content.sections.map((sec, i) => (
              <div key={i} style={{ display: "flex", gap: 24, padding: "32px", borderRadius: 18, background: card, border: `1px solid ${border}`, alignItems: "flex-start" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "rgba(124,58,237,0.18)", color: "#a78bfa" }}>
                  {sec.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: isDark ? "#fff" : fg, marginBottom: 12 }}>{sec.heading}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: muted(0.68) }}>{sec.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Generic section (about, legal pages) ───────────────────── */}
        {(page === "about" || content.legal) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {content.sections.map((sec, i) => (
              <div key={i} style={{ padding: "32px", borderRadius: 18, background: i % 2 === 0 ? card : sectionBg, border: `1px solid ${border}` }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: isDark ? "#fff" : fg, marginBottom: 16 }}>{sec.heading}</h2>
                {sec.body && <p style={{ fontSize: 14, lineHeight: 1.8, color: muted(0.70) }}>{sec.body}</p>}
                {sec.bullets && (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {sec.bullets.map((b, j) => (
                      <li key={j} style={{ display: "flex", gap: 12, fontSize: 14, color: muted(0.70), lineHeight: 1.65 }}>
                        <CheckCircle size={15} style={{ color: "#a78bfa", flexShrink: 0, marginTop: 2 }} /> {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Footer strip */}
      <div style={{ borderTop: `1px solid ${border}`, padding: "20px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: muted(0.35), margin: 0 }}>
          © {new Date().getFullYear()} {BRAND} · <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#a78bfa", padding: 0 }}>Back to home</button>
        </p>
      </div>
    </div>
  );
};

export default StaticPage;
