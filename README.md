# TrueAuth

TrueAuth is a complete, working intelligent web application that connects to your Gmail, cleans up your mailbox, manages your subscriptions, drafts contextual replies via AI, and auto-integrates with Google Calendar.

## Architecture

- **Frontend**: Angular 17 + Tailwind CSS (Vibrant UI, Glassmorphism, Dark Mode)
- **Backend**: Node.js + Express + TypeScript
- **Auth & Database**: Supabase (Postgres Database, Google OAuth Provider)
- **Background Jobs**: Bull Queue & Redis
- **AI Processing**: Google Generative AI (Gemini 1.5-flash / Gemini 1.5-pro)
- **Mail APIs**: the official `googleapis` npm package

## Core Features
1. **Inbox Zero Dashboard**: Clean analytics pane scanning your email pipeline and flagging risk signals.
2. **Subscription Manager**: Extracts `List-Unsubscribe` headers securely and provides 1-click links to opt out.
3. **Automated Cleanups**: Drop "Archive Promotions" and "Delete OTPs" jobs to a robust Bull MQ runner via single click.
4. **AI Drafting (Gemini)**: Reads your last 10 sent emails to extract your personal tone and generates immediate draft replies in your native voice directly into Gmail Drafts.
5. **Smart Calendar Suggests**: Gemini-powered parsing detects meetings dynamically to help setup calendar blocks.

## Prerequisites

- Request a **Google Cloud OAuth Client**.
  - Enable *Gmail API* and *Google Calendar API*.
  - Use Scopes: `https://www.googleapis.com/auth/gmail.modify`, `https://www.googleapis.com/auth/calendar.events`, `https://www.googleapis.com/auth/userinfo.email`
- Create a **Supabase Project**.
  - Head to Authentication -> Providers -> enable **Google** (using your google credentials).
  - Copy the generated Supabase redirect URI into your Google Cloud Authorized redirect URIs.
- **Docker & Docker Compose** installed locally.

## Setup & Running

**1. Clone the environment variables**
In `backend/`, copy the example keys, and ensure your keys are accurate:
```bash
# backend/.env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LLM_API_KEY=your-gemini-or-openai-key
REDIS_URL=redis://redis:6379 
```

**2. Update Frontend Environment**
Adjust the Supabase client inside `frontend/src/app/services/supabase.service.ts` to reflect your public anonymous key and URL.

**3. Initial Database Migration**
Connect to your Supabase Postgres SQL UI or CLI and execute the layout defined dynamically in `supabase/migrations/00000_schema.sql` to generate the correct schema and audit tables.

**4. Spin up the Stack via Docker Compose**
Execute the following to orchestrate the backend, frontend, and Redis instances simultaneously in containers:
```bash
docker-compose up --build -d
```

**Alternatively: Run Natively (Without Docker)**
If you prefer to run the Node.js and Angular servers natively on your machine (useful for active development):
```bash
./start-local.sh
```
*(This script will spin up Redis in the background but launch the Express and Angular servers natively using your local Node binaries).*

**Access Points**:
- **Application Frontend**: `http://localhost:4200`
- **Backend API**: `http://localhost:3000`
- **Redis Queue**: `localhost:6379`

## Interacting
- On `http://localhost:4200` hit `Sign in with Google`. The Google pop-up will appear.
- Accept the permissions requested by Supabase; upon completion Supabase secures your Token inside Postgres.
- Head to the Dashboard. Unload your inbox!
