# Connecttr Non-Prod Onboarding

This branch is prepared for local development and non-production verification of the Connecttr frontend and backend.

The goal is simple: a new developer should be able to clone the repo, create local `.env` files from the examples, install dependencies, and run both services locally without changing the application code or committing secrets.

## Branch

Use the `non-prod` branch:

```powershell
git clone https://github.com/ayushdeo/Connecttr.git
cd Connecttr
git checkout non-prod
```

## What This Branch Adds

- Local startup scripts for Windows:
  - `start-local.bat`
  - `start-backend.bat`
  - `start-frontend.bat`
- Safe env examples:
  - `back-end/.env.example`
  - `front-end/.env.example`
- Local-only dev login:
  - `http://127.0.0.1:8010/auth/dev-login?email=raxalino@gmail.com`
- Local backend/frontend defaults:
  - Backend: `http://127.0.0.1:8010`
  - Frontend: `http://127.0.0.1:3000`
- UI and backend fixes for campaign editing, Email Hub, analytics, and local auth.

For the detailed branch comparison against `main`, read:

[docs/non-prod_main-branch-differences-summary.md](docs/non-prod_main-branch-differences-summary.md)

For the original implementation handoff document, read:

[docs/Connecttr_Non_Prod_Change_Summary.docx](docs/Connecttr_Non_Prod_Change_Summary.docx)

## First-Time Setup

Create local env files from the examples:

```powershell
copy back-end\.env.example back-end\.env
copy front-end\.env.example front-end\.env
```

Fill `back-end/.env` with real values from the approved source of truth, such as Render environment variables or a secure secrets handoff.

Do not commit real `.env` files.

## Required Backend Env Values

The backend needs these real values locally:

```env
MONGO_URI=
MONGO_DB_NAME=kodingbolte_db
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SECRET_KEY=
SCRAPEDO_TOKEN=
PERPLEXITY_API_KEY=
POSTMARK_TOKEN=
POSTMARK_BROADCAST=broadcast
INBOUND_DOMAIN=reply.connecttr.com
POSTMARK_FROM_EMAIL=support@connecttr.com
API_SECRET=
```

For local development, keep these URL values:

```env
BACKEND_PUBLIC_URL=http://127.0.0.1:8010
FRONTEND_ORIGIN=http://127.0.0.1:3000
EMAILHUB_URL=http://127.0.0.1:8010
```

`EMAILHUB_INCLUDE_LEGACY_DATA=true` may be used locally to inspect old demo/audit Email Hub records. Do not set it on Render production.

## Required Frontend Env Values

The frontend only needs:

```env
REACT_APP_API_BASE=http://127.0.0.1:8010
```

Never put private API keys or backend secrets in frontend `REACT_APP_*` variables.

## Install Dependencies

Backend:

```powershell
cd back-end
pip install -r requirements.txt
```

Frontend:

```powershell
cd front-end
npm install
```

## Run Locally

From the repo root:

```powershell
.\start-local.bat
```

This starts exactly two server terminals:

- Backend on `http://127.0.0.1:8010`
- Frontend on `http://127.0.0.1:3000`

It also opens the local dev-login URL:

```text
http://127.0.0.1:8010/auth/dev-login?email=raxalino@gmail.com
```

## Local Google Login

Dev-login is the fastest local test path because it bypasses Google OAuth and still creates real local auth cookies.

If you want Google login locally, Google Cloud must include this exact authorized redirect URI:

```text
http://127.0.0.1:8010/auth/callback/google
```

Whitelisting an email account is not enough by itself; Google also checks the exact redirect URI.

## Useful Local URLs

```text
http://127.0.0.1:8010/health
http://127.0.0.1:8010/docs
http://127.0.0.1:3000/
http://127.0.0.1:3000/dashboard
http://127.0.0.1:3000/campaigns
http://127.0.0.1:3000/email-hub
http://127.0.0.1:3000/analytics
http://127.0.0.1:3000/settings
http://127.0.0.1:3000/organization
```

## Git Safety

Commit source files, scripts, docs, and `.env.example` files only.

Do not commit:

- `back-end/.env`
- `front-end/.env`
- credentials files
- dashboard exports
- logs
- local browser or terminal output
