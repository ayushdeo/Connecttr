# Non-Prod vs Main Branch Differences Summary

This file documents the differences introduced on the `non-prod` branch compared with `main`, the issues found during local/prod review, the roadmap used to fix them, and the final intended branch state after the first non-prod setup commit.

Primary implementation commit:

```text
20fe4e3 Prepare non-prod local dev setup
```

## Goals

- Preserve the existing environment-variable configuration model.
- Keep Render production settings production-only.
- Let developers run the full frontend and backend locally.
- Avoid committing secrets.
- Make local testing safer before deploying to Render.
- Fix the highest-impact UI and data-flow bugs found in dashboard, campaigns, Email Hub, analytics, and settings.

## Issues Spotted

### Local Environment And Auth

- Local frontend could render `/login`, but Google login failed locally with backend `Internal Server Error`.
- The local machine had dead proxy env vars such as `HTTP_PROXY=http://127.0.0.1:9`, causing backend OAuth metadata calls to Google to fail.
- Local Google login also needs an exact Google Cloud redirect URI, not just an email whitelist.
- Local cookies were difficult to use when backend session settings were production-only HTTPS.
- Running local servers manually created stale terminals and confusing port conflicts.

### Environment Variable Consistency

- Render uses `SCRAPEDO_TOKEN`, while some backend code paths expected `SCRAPE_DO_TOKEN`.
- `scraper_service.py` had a hardcoded Scrape.do fallback token, which is risky.
- `postmark_client.py` loaded the older `apiKey.env` path instead of the standard backend `.env`.
- `.env.example` files were missing or incomplete for the next developer.
- Real `.env` files and logs needed to stay ignored.

### Campaign UX

- Campaign service chips showed `+N` but did not expand.
- Existing campaign `Edit Brief` opened the new-campaign flow instead of editing the selected campaign.
- Campaign detail cards were read-only even though the requested UX needed section-level edit entry points.
- Some campaign creation screens lacked local back navigation.

### Email Hub

- Some Email Hub data could white-screen the app due to missing name, subject, timestamp, or malformed message fields.
- The secure org-scoped API showed only one lead for `raxalino@gmail.com`, while old production screenshots showed many `Unknown` audit/demo leads.
- Old email message rows for the mailbox thread did not have `org_id`, so strict org-scoped thread loading hid valid legacy messages for the authorized lead.

### Analytics

- Analytics was mostly static in `main`.
- Email Engagement displayed a loading-style placeholder.
- Channel tabs looked interactive but did not meaningfully change data.
- The live-derived analytics initially looked sparse because the current user's org has only one real scoped lead.
- The trend chart was anchored to today's date, making older demo data look flat or empty.
- The Email Engagement pane needed better vertical scaling.

### Settings And Organization

- Some settings rows looked clickable but did nothing.
- Organization settings needed a clearer back path.
- `orgs.py` referenced audit collection behavior but was missing the import for `get_audit_collection`.

## Roadmap Implemented

### Step 1: Stabilize Local Running

- Added `start-local.bat` to launch exactly two local server terminals.
- Added `start-backend.bat` for backend port `8010`.
- Added `start-frontend.bat` for frontend port `3000`.
- Local backend startup clears dead proxy env vars for the backend process.
- Local startup writes logs to ignored files.
- `.gitignore` now ignores local logs and Word temporary doc files.

### Step 2: Document And Standardize Env Setup

- Added `back-end/.env.example`.
- Added `front-end/.env.example`.
- Documented local URL values:
  - `BACKEND_PUBLIC_URL=http://127.0.0.1:8010`
  - `FRONTEND_ORIGIN=http://127.0.0.1:3000`
  - `EMAILHUB_URL=http://127.0.0.1:8010`
  - `REACT_APP_API_BASE=http://127.0.0.1:8010`
- Documented that secrets stay in local `.env` files or Render env vars, never Git.

### Step 3: Local Auth Support

- Added local-only `/auth/dev-login`.
- Added shared auth response helper to issue cookies consistently.
- Adjusted cookie security so production remains secure while localhost can use HTTP cookies.
- Kept Google OAuth env-variable loading intact.

### Step 4: Campaign Editing Improvements

- Added backend `PATCH /campaigns/{cid}`.
- Added existing-campaign edit modal.
- Added pencil edit buttons for campaign detail sections.
- Added service-chip expand/collapse.
- Added back navigation in campaign setup.

### Step 5: Email Hub Hardening

- Added frontend safe fallbacks for missing names, emails, subjects, timestamps, and message content.
- Kept org-scoped lead listing as the default safe behavior.
- Allowed legacy no-org email messages to display only after the lead itself is authorized.
- Added local-only `EMAILHUB_INCLUDE_LEGACY_DATA=true` support for inspecting old audit/demo leads locally.

### Step 6: Analytics Improvements

- Replaced static analytics values with live values derived from `/emailhub/leads` and `/campaigns`.
- Added loading/error states.
- Added working channel-tab state.
- Added honest empty-state messaging for LinkedIn/Web metrics that are not collected yet.
- Anchored lead trend charts to the latest loaded lead timestamp.
- Adjusted Email Engagement card height behavior to avoid overflow.

### Step 7: Settings Cleanup

- Marked unfinished settings rows as `Soon` or `Read only`.
- Added back navigation from Organization settings.

## Final Intended Differences From Main

### Added Files

```text
README.md
back-end/.env.example
front-end/.env.example
docs/Connecttr_Non_Prod_Change_Summary.docx
docs/non-prod_main-branch-differences-summary.md
start-backend.bat
start-frontend.bat
start-local.bat
```

### Modified Files

```text
.gitignore
back-end/app/main.py
back-end/app/api/auth.py
back-end/app/api/campaign_store.py
back-end/app/api/email_hub.py
back-end/app/api/orgs.py
back-end/app/services/lead_discovery.py
back-end/app/services/postmark_client.py
back-end/app/services/scraper_service.py
back-end/app/services/web_extractor.py
front-end/src/config.js
front-end/src/layout/Shell.jsx
front-end/src/screens/AnalyticsDashboard.jsx
front-end/src/screens/CampaignManager.jsx
front-end/src/screens/EmailHub.jsx
front-end/src/screens/OrganizationSettings.jsx
front-end/src/screens/SettingsPanel.jsx
front-end/src/screens/StartNewCampaign.jsx
```

### Removed Branch Artifact

```text
write-access-test.txt
```

This was a prior branch push-access artifact and is not part of the intended non-prod setup.

## Files That Must Not Be Committed

```text
back-end/.env
front-end/.env
creds.txt
*.log
*.err
*.out
dashboard PDFs or credential exports
```

## Current Data Behavior

By default, Email Hub data is org-scoped for safety.

For local testing only, `EMAILHUB_INCLUDE_LEGACY_DATA=true` can be enabled to show old audit/demo leads. This helps local UI testing match older production screenshots, but it must not be enabled on Render production.

## Verification Completed

- Backend health endpoint returned `200`.
- Dev-login issued auth cookies and redirected to local frontend.
- Secure scoped Email Hub returned the one lead for the current user's org.
- Local-only legacy Email Hub mode returned 1561 demo/audit leads.
- Mailbox thread returned 4 messages, including the inbound reply.
- Backend Python syntax checks passed for edited API files.
- Frontend production build passed with only pre-existing lint warnings.

## Known Remaining Notes

- Local Google login still requires Google Cloud redirect URI:

```text
http://127.0.0.1:8010/auth/callback/google
```

- LinkedIn and Web analytics remain empty until those channels are actually tracked.
- Lead discovery failure should be investigated separately because it may depend on Scrape.do/network behavior and production parity.
- `front-end/package-lock.json` had metadata-only noise and was intentionally not part of the setup commit.
