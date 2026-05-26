# Connecttr — Codebase Overview

## The Problem

B2B outbound sales is manually expensive: finding companies that *actually* need your product, getting their contact info, writing personalized emails, and knowing when to follow up — all of this requires significant human effort and usually produces low-quality leads. Connecttr automates the full customer acquisition loop for a given client company (an "org" in the system), from signal detection all the way to email engagement.

---

## Architecture at a Glance

```
React 19 (SPA)
    ↕ REST + SSE streaming
FastAPI (Python)
    ↕
MongoDB Atlas          Perplexity AI (Sonar)
Postmark               Scrape.do (Google scraper)
Google OAuth           Jina.ai (content extractor)
```

Deployed on **Render** — backend as a Gunicorn/UvicornWorker service at `connecttr.onrender.com`, frontend as a static build.

---

## The Four-Phase Pipeline

### Phase 1 — Lead Discovery

**Entry point:** `POST /campaigns/{id}/discover` — streamed SSE response

1. The client's website URL is passed to `back-end/app/services/company_analyzer.py`, which calls **Perplexity Sonar** to extract a structured campaign brief: services offered, ideal customer profile (ICP), lead signals (tools/platforms the ideal buyer uses), ready-made Google search queries, exclusion terms, and outreach angles.
2. Those search queries hit **Scrape.do** (a JS-rendering Google proxy) to pull LinkedIn posts, profile updates, and relevant pages that match the ICP.
3. Results are filtered (removes job postings, client's own domain, bad TLDs) and heuristically scored — social host presence (+0.35), ICP signal keyword overlap (+0.15 per hit), executive role keywords.
4. **Contact enrichment** (`back-end/app/services/contact_enricher.py`): for each lead, the source URL is fetched (primary via **Jina.ai**, fallback via BeautifulSoup + Scrape.do), contact/about pages are scraped for email addresses. If none found, an email is synthesized from the `firstname.lastname@companydomain.com` pattern.
5. Leads are upserted to MongoDB with `status="New"`, `campaign_id`, `org_id`, score, and `match_reasons`.

### Phase 2 — Intent Scoring

**Entry point:** `back-end/app/services/intent_service.py`

Runs on all `New` leads for a campaign. Produces a **composite final_score (0–100)**:

| Component | Weight | Method |
|---|---|---|
| `rule_score` | 0.30 | Keyword matching — hiring signals, urgency, commercial intent, penalties for job posts |
| `llm_score` | 0.50 | Perplexity Sonar: given ICP + services, does this text show buying intent? Returns 0–100 + `intent_type` (direct/indirect/weak/none) |
| `engagement_score` | 0.20 | Clicks×40 + Opens×10, ×1.5 multiplier if replied |

The weights are **not static** — `back-end/app/services/learning_service.py` adjusts `W_LLM` and `W_RULE` in 1% increments when observed vs. predicted conversion diverges by >5% (requires 30+ engagement events). Weights are stored per-org in `back-end/app/services/model_registry.py`.

### Phase 3 — Email Generation & Sending

**Entry point:** `POST /emailhub/templates` → `POST /emailhub/send`

1. **Template generation** (`back-end/app/services/perplexity_writer.py`): Perplexity generates 3 variants (A/B/C) — each with a different structural feature (short subject, question opener, social proof). Role-aware tone: Founder→direct, CEO→strategic, VP→results-driven. Body capped at 100–130 words.
2. **Variant selection** (`back-end/app/services/experiments.py`): **Thompson Sampling** — draws from `Beta(positive_replies+1, sent-positive_replies+1)` for each variant. Promotes to "winner" if P(best) > 95% with ≥50 sends.
3. **Send via Postmark** (`back-end/app/services/postmark_client.py`): Tracks opens + clicks. Reply-to is `r+{campaign_id}.{lead_id}@reply.connecttr.com` for reply routing.
4. **Engagement webhooks** (`POST /intent/webhooks/engagement`): Opens/clicks/replies update the lead's `engagement_score` and recalculate `final_score` in real time.
5. **Reply classification** (`back-end/app/services/reply_classifier.py`): Perplexity categorizes inbound replies into `meeting | positive | objection | later | referral | unsubscribe | not_interested`.

### Phase 4 — Campaign Health & Learning

`back-end/app/services/campaign_health.py` continuously monitors:
- Bounce rate > 8% in 48h → auto-pause + alert
- CTR drop > 30% vs 7-day baseline → alert

`back-end/app/services/learning_service.py` runs periodically once 30+ engagement events exist:
- Compares observed conversion rate vs. predicted
- Adjusts `W_LLM` and `W_RULE` by ±1% (learning rate) if discrepancy exceeds 5%
- Clamps weights between MIN=0.05 and MAX=0.90

---

## Tools & External Services

| Tool | Purpose |
|---|---|
| **Perplexity Sonar** | Company brief extraction, intent scoring, email generation, reply classification |
| **Scrape.do** | Proxied Google search with JS rendering |
| **Jina.ai** | Primary web content → clean markdown extraction |
| **Postmark** | Transactional email + open/click tracking |
| **Google OAuth + JWT** | Auth (httpOnly cookies, 30-day expiry) |
| **MongoDB Atlas** | All persistence — leads, emails, campaigns, orgs |
| **SlowAPI** | Rate limiting on auth endpoints (5 req/min) |
| **Tenacity** | Retry logic (3 attempts, exponential backoff) on all LLM calls |

---

## Multi-Tenancy & Security

Every database query is scoped by `org_id`. A user belongs to one org. Roles: `owner / admin / member`. All destructive operations (member removal, ownership transfer) are RBAC-gated and written to the `audit_logs` collection. The pipeline API (`/pipeline/*`) uses a separate `X-API-KEY` header for internal/service auth.

Security headers applied globally via middleware: `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`. Session cookies are `https_only=True`, `same_site=lax`.

---

## Key MongoDB Collections & Relationships

```
users → organizations → campaigns → leads → emails
                                         ↘ template_performance
                     → org_invites
                     → alerts
                     → audit_logs
                     → usage_stats        (daily send quotas, 50/user/day)
                     → bounce_stats       (domain-level bounce tracking)
                     → sessions
```

**Lead lifecycle:**

```
New → Scored → Sent → Opened / Clicked / Responded / Bounced → Archived
```

**Campaign lifecycle:**

```
Draft → Brief Ready → Leads Imported → Ongoing → (Auto-Paused if unhealthy) → Archived
```

---

## Backend Route Map

| Router | Prefix | Key Endpoints |
|---|---|---|
| `auth.py` | `/auth` | Google OAuth login/callback, `/auth/me`, logout |
| `campaigns.py` | `/campaigns` | `POST /{id}/discover` (streaming), `POST /analyze` |
| `campaign_store.py` | `/campaigns` | CRUD for campaign records |
| `email_hub.py` | `/emailhub` | List leads, generate templates, send email |
| `orgs.py` | `/orgs` | Member management, role changes |
| `pipeline.py` | `/pipeline` | Internal scrape + classify triggers (API key auth) |
| `intent_analytics.py` | `/intent` | Score/explain per lead, engagement webhooks |

---

## Frontend

React 19 SPA with 13 screen-level components, Tailwind CSS, Radix UI primitives, and Framer Motion for animations. All API calls include `credentials: 'include'` for cookie-based auth. Production API base defaults to `https://connecttr.onrender.com`.

**Two core user flows:**

- **Campaign Manager** (`front-end/src/screens/CampaignManager.jsx`): Enter website URL → analyze → discover leads with live progress bar (consumes SSE stream).
- **Email Hub** (`front-end/src/screens/EmailHub.jsx`): View scored leads, generate A/B/C email templates, send, view inbound replies as threaded message cards with engagement badges (open, click, bounce).

**Auth flow:** Google OAuth → backend callback creates/upserts user + org → JWT in httpOnly cookie → `AuthContext` validates on every mount via `GET /auth/me`.

---

## ML & Scoring Details

### Conversion Probability Model (`back-end/app/ml/predict.py`)

Logit-based (not a trained neural net) with hand-tuned weights:

```
z = W_RULE*rule_score + W_LLM*llm_score + W_PERSONA*persona_weight + W_TIME*time_score
prob = sigmoid(10 * (z - 0.5))
```

- **Persona weights:** Founder=0.9, CEO=0.85, VP=0.8, Manager=0.6
- **Time weights:** 9–11 AM and 2–4 PM = 1.0; all other hours = 0.5

### Thompson Sampling (`back-end/app/services/experiments.py`)

Online A/B test for email template variants. At send time, draws from `Beta(α, β)` per variant where `α = positive_replies + 1`, `β = sent - positive_replies + 1`. Runs 1000 simulations to estimate P(best). Promotes variant if P(best) > 0.95 with ≥50 sends.

### Reinforcement Weight Tuner (`back-end/app/services/learning_service.py`)

```
error = |observed_conversion_rate - predicted_conversion_rate|
if error > 0.05 and events >= 30:
    W_LLM += LEARNING_RATE * sign(error)
    W_RULE -= LEARNING_RATE * sign(error)
```

Weights clamped to [0.05, 0.90]. Learning rate: 0.01 per cycle.

---

## Environment Variables (Required)

| Variable | Used By |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection |
| `MONGO_DB_NAME` | Database name (`kodingbolte_db`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth |
| `SECRET_KEY` | JWT signing |
| `PERPLEXITY_API_KEY` | All LLM calls |
| `PERPLEXITY_MODEL` | Model name (`sonar`) |
| `SCRAPEDO_TOKEN` | Google search proxy |
| `POSTMARK_TOKEN` | Email sending |
| `POSTMARK_BROADCAST` | Postmark message stream |
| `INBOUND_DOMAIN` | Reply routing (`reply.connecttr.com`) |
| `FRONTEND_ORIGIN` | CORS allowlist |
| `BACKEND_PUBLIC_URL` | OAuth redirect URIs |
| `REQUEST_TIMEOUT_SECONDS` | LLM/scraper timeouts (default: 30) |

---

## What's Non-Obvious

- **Perplexity Sonar** was chosen over Claude Opus/Sonnet specifically because it's research-optimized — faster and cheaper for extraction tasks. `temperature: 0.0` is used on every LLM call for determinism.
- **Email synthesis fallback** (fabricating `firstname.lastname@domain.com` when no email is found) is intentional — maximizes coverage at the cost of some bounce rate.
- **The ML model is not trained** — `predict.py` is a logit function with manually set weights. The reinforcement tuner adjusts the intent scoring weights, not the prediction model weights.
- **Thompson Sampling is online** — it updates live with every send, so the system genuinely learns which email structure performs best per campaign without batch analysis.
- **Jina.ai is the primary extractor** (no API key required), with two fallbacks (direct requests + BeautifulSoup, then Scrape.do). This handles JS-heavy sites that return empty HTML to plain `requests`.
- The backend **fails fast at startup** if `BACKEND_PUBLIC_URL` or `FRONTEND_ORIGIN` are missing — prevents silent misconfiguration in production.
