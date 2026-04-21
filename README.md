# TrueAuth

TrueAuth is a high-performance, intelligent email management platform designed to help you reach "Inbox Zero" using AI-driven automation. It connects securely to your Gmail to categorize messages, automate cleanups, manage subscriptions, and draft contextual replies.

## Architecture

- **Frontend**: Angular 17 + Tailwind CSS (Vibrant UI, Glassmorphism, Dark Mode)
- **Backend**: Node.js + Express + TypeScript
- **Auth & Database**: Supabase (Postgres, Google OAuth, Real-time RLS)
- **Background Jobs**: Bull MQ + Redis (Distributed task processing)
- **AI Engine**: Google Generative AI (Gemini 1.5-flash / Gemini 1.5-pro)
- **API Engine**: Official `googleapis` library with advanced caching

## Key Features

### 1. Advanced Mailbox Synchronization
- **Historical Batch Sync**: A one-time, recursive background process that paginates through your entire Gmail history using Bull queues.
- **Incremental Manual Refresh**: High-speed ingestion using `after:DATE` filters to fetch only new mail since your last session.
- **Sync Control**: Full **Pause/Resume** functionality for historical scans directly from the dashboard.
- **Chronological Accuracy**: Sorting is powered by Gmail's `internalDate` (millisecond arrival time) instead of unreliable email headers.

### 2. Intelligent Dashboard & Analytics
- **Dual-Metric Tracking**: Separate tracking for "Total in Gmail" vs. "Total Scanned" in TrueAuth.
- **Deep Folder Insights**: Real-time counts for Unread, Drafts, Starred, and Priority items.
- **Composition Analytics**: Interactive Chart.js donut charts showing your mailbox distribution (Spam, Promotions, OTPs, etc.).

### 3. Smart Toolbox
- **Subscription Manager**: Automatic extraction of `List-Unsubscribe` headers with 1-click opt-out.
- **Automated Cleanups**: Atomic jobs to archive promotions, delete OTPs (older than 24h), and purge spam.
- **AI Drafting (Gemini)**: Extracts your personal tone from sent mail to generate replies in your voice directly into your Gmail Drafts.
- **Calendar Integration**: AI-driven event detection for 1-click calendar scheduling.

### 4. Data Privacy & Control
- **Purge My Data**: A nuclear option that permanently wipes all your emails, tokens, and logs from the TrueAuth database.
- **OAuth Security**: Full session isolation using Supabase Auth and Google OAuth2.

## Prerequisites

- **Google Cloud Console**:
  - Enable *Gmail API* and *Google Calendar API*.
  - Configure OAuth screen and credentials.
- **Supabase**:
  - Enable Google Auth Provider.
  - Set up PostgreSQL schema (see `supabase/migrations`).
- **Redis Instance**: Required for the Bull MQ background workers.

## Setup & Running (Local)

1. **Environment Config**:
   ```bash
   # Create backend/.env with:
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   LLM_API_KEY=...
   REDIS_URL=...
   ```

2. **Database Setup**:
   Run the SQL files in `supabase/migrations/` in order (00000 to 00005) in your Supabase SQL Editor.

3. **Launch**:
   ```bash
   # Using Docker
   docker-compose up --build -d
   
   # Or natively
   ./start-local.sh
   ```

## License
MIT
The purchase flow is simulated for now — swap POST /billing/purchase with a Razorpay/Stripe webhook when you're ready for production payments.