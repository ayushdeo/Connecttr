# Phase 1 — Lead Discovery: Progress Tracker

> Last updated: 2026-05-26
> Reference: [phase1-lead-discovery-plan.md](phase1-lead-discovery-plan.md)

Legend: ✅ Done · ⏳ Pending · 🧪 Needs test

---

## Track A — Website Analysis

| # | Priority | Task | Status | File(s) |
|---|---|---|---|---|
| A1 | P0 | Standardize env-var to `SCRAPEDO_TOKEN` (was `SCRAPE_DO_TOKEN` in web_extractor) | ✅ Done | `web_extractor.py:123` |
| A2 | P0 | Raise `max_tokens` from 600 → 1500 in company_analyzer | ✅ Done | `company_analyzer.py` |
| A3 | P1 | Add `_validate_brief()` — reject briefs with < 2 queries or quality < 0.40 | ✅ Done | `company_analyzer.py` |
| A4 | P1 | Add `_focus_content()` — strip nav noise, truncate to 8,000 chars before LLM | ✅ Done | `company_analyzer.py` |
| A5 | P2 | Add "all output must be in English" instruction to LLM prompt | ✅ Done | `company_analyzer.py` |

---

## Track B — Lead Discovery

| # | Priority | Task | Status | File(s) |
|---|---|---|---|---|
| B1 | P0 | Multi-selector fallback for Google result cards + add `&num=20&hl=en` | ✅ Done | `lead_discovery.py` |
| B2 | P0 | `_parse_linkedin_snippet()` — extract real name/role/company from Google snippet instead of page fetch | ✅ Done | `lead_discovery.py` |
| B3 | P1 | Path-aware job URL exclusion (was domain-only, missed `/jobs/` paths) | ✅ Done | `lead_discovery.py` |
| B4 | P1 | Expand role detection from 7 → 14 patterns (CTO, CMO, COO, Owner, Partner, etc.) | ✅ Done | `lead_discovery.py` |
| B5 | P2 | Per-query result count logging (`[discover] query=... raw=N candidates=N`) | ✅ Done | `lead_discovery.py` |

---

## Track C — Contact Enrichment

| # | Priority | Task | Status | File(s) |
|---|---|---|---|---|
| C1 | P0 | `_is_social_url()` — skip fetch for LinkedIn/Twitter/etc walls, go straight to synthesis | ✅ Done | `contact_enricher.py` |
| C2 | P0 | Multi-format email synthesis: `first.last@`, `flast@`, `first@`, `first_last@` (was `first@` only) | ✅ Done | `contact_enricher.py` |
| C3 | P1 | Hunter.io integration — primary enrichment path before synthesis | ✅ Done | `contact_enricher.py` |
| C4 | P1 | Fix `max_to_enrich` loop: `continue` → `break` (was iterating all leads after cap hit) | ✅ Done | `contact_enricher.py` |
| C5 | P2 | `_has_mx_record()` DNS check before synthesizing emails | ✅ Done | `contact_enricher.py` |
| C6 | P2 | Expand `BAD_EMAIL_DOMAINS` from 7 → 18 domains | ✅ Done | `contact_enricher.py` |

---

## Track D — Orchestration & Architecture

| # | Priority | Task | Status | File(s) |
|---|---|---|---|---|
| D1 | P1 | Move blocking HTTP calls off async event loop via `run_in_executor` | ✅ Done | `campaigns.py` |
| D2 | P1 | Remove / quarantine `scraper_service.py` dead code and `/pipeline/scrape` endpoint | ✅ Done | `scraper_service.py` deleted, `pipeline.py` |
| D3 | P2 | Add structured JSON pipeline observability logs (queries_run, raw_results, duration, email rates) | ✅ Done | `lead_discovery.py`, `contact_enricher.py` |

---

## Track E — UX

| # | Priority | Task | Status | File(s) |
|---|---|---|---|---|
| E1 | P1 | Editable `QueryBuilder` component before running discovery (platform/intent/keyword/location) | ✅ Done | `CampaignManager.jsx` |
| E2 | P1 | Replace all implementation-internal progress messages with user-friendly copy | ✅ Done | `lead_discovery.py`, `contact_enricher.py` |
| E3 | P1 | Show email discovery rate on success screen (verified / guessed / needs lookup) | ✅ Done | `campaigns.py`, `CampaignManager.jsx` |
| E4 | P2 | "Needs Email" filter tab in Email Hub (default to "Has Email" view) | ✅ Done | `EmailHub.jsx` |

---

## LLM Infrastructure (added this session)

| Task | Status | File(s) |
|---|---|---|
| Migrate all LLM calls: Perplexity → Gemini 2.5 Flash | ✅ Done | `llm_client.py`, all service files |
| Fix model name: `gemini-2.0-flash` → `gemini-2.5-flash` (2.0 restricted for new keys) | ✅ Done | `.env` |
| No retry on 401/403/404 — fail fast on permanent auth/config errors | ✅ Done | `llm_client.py` |
| Handle missing `content` key (thinking model w/ tiny token budgets) | ✅ Done | `llm_client.py` |
| Catch LLM errors in `analyze` endpoint — return HTTP 502 with message instead of silent timeout | ✅ Done | `campaigns.py` |

---

## Deploy Checklist

| Step | Status |
|---|---|
| Update `GOOGLE_AI_MODEL=gemini-2.5-flash` on Render dashboard | ⏳ Pending |
| Trigger redeploy on Render | ⏳ Pending |
| Smoke test: `POST /campaigns/analyze` with a real website URL | ⏳ Pending |
| Smoke test: Full discover → review modal → confirm flow | ⏳ Pending |

---

## What's Left (ordered by impact)

1. **Test the full flow** end-to-end with a real campaign website after deploy
2. ~~D2 — done~~
3. ~~E4 — done~~
4. ~~D3 — done~~

---

## Summary

- **25 of 25 plan items complete** (100%)
- All P0, P1, P2 items resolved
- Deploy pending final smoke test
