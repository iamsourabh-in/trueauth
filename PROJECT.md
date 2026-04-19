You are an expert full‑stack AI coding agent. Build a complete, working web application called **trueauth.in** – an email manager that connects to Gmail, cleans up the mailbox, manages subscriptions, drafts replies, and integrates with Google Calendar.

**Important**: Use **Node.js (Express)** for the backend, **Supabase** for authentication (Google OAuth) and database, and **React** for the frontend. All user data and Gmail/Calendar tokens must be stored in Supabase.

### 🔧 Tech Stack (strict)
- **Backend**: Node.js + Express (TypeScript)
- **Auth & DB**: Supabase (built‑in Google OAuth provider, PostgreSQL)
- **Background jobs**: Bull (with Redis) or simple `setTimeout`/cron (MVP friendly)
- **Frontend**: Angular + Tailwind CSS
- **APIs**: Google APIs (`googleapis` npm package) for Gmail and Calendar, LLM (Gemini or OpenAI)

### 🔐 Authentication & Google Setup with Supabase
- Use **Supabase Auth** with the Google provider. No manual OAuth flow.
- When a user signs in via Google, Supabase returns a session. The backend receives the user’s `access_token` and `refresh_token` from Supabase’s `provider_token` and `provider_refresh_token`.
- Store these tokens in a Supabase table `user_tokens` (user_id, gmail_token, calendar_token, expires_at).
- Required Google OAuth scopes (configure in Google Cloud Console + Supabase):
  - `https://www.googleapis.com/auth/gmail.modify`
  - `https://www.googleapis.com/auth/calendar.events`
  - `https://www.googleapis.com/auth/userinfo.email`
- Provide a `.env` file with:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for the Google API calls)
  - `LLM_API_KEY` (Gemini or OpenAI)
  - `REDIS_URL` (optional for Bull)

### 🧹 Core Features – Fully Implement

#### 1. Mailbox Scanner & Risk Signals
- Endpoint: `GET /api/mailbox/status`
- Use `googleapis` Gmail client with user’s stored token.
- Fetch last 500 emails (batch with `gmail.users.messages.list` and `batch.get`).
- Compute: total unread, total emails, risk signals (emails with mismatched SPF/DKIM or suspicious links).
- Frontend dashboard shows a “Scan Now” button and displays results.

#### 2. Subscription Manager
- Endpoint: `GET /api/subscriptions`
- Scan emails for `List-Unsubscribe` header or body containing “unsubscribe” + marketing patterns.
- Use an LLM call to confirm if it’s a subscription.
- Return a clean list: sender, frequency, unsubscribe link/email.
- One‑click unsubscribe: perform HTTP GET to `List-Unsubscribe` URL or send an email with `unsubscribe` in subject.

#### 3. Automatic Cleanup Rules
User can trigger manually via UI buttons. Each action is logged in Supabase (`cleanup_log` table) with ability to revert within 7 days.
- **Promotions**: Move emails with Gmail category `CATEGORY_PROMOTIONS` to a label “ToReview” (not auto‑delete).
- **OTP removal**: Regex `\b\d{6}\b` in subject/body → move to trash after 1 hour (configurable).
- **Junk / Spam**: Apply user‑chosen action (archive/delete) to emails already marked as SPAM.

#### 4. AI Drafting (in user’s voice)
- Endpoint: `POST /api/draft/reply` – receives `threadId`.
- Fetch last 10 sent emails from user (via Gmail API) to learn tone.
- Generate a draft reply using LLM (Gemini recommended for Gmail integration).
- Create draft via Gmail API (`users.drafts.create`). User reviews in Gmail before sending.

#### 5. Calendar Integration
- Endpoint: `POST /api/calendar/suggest`
- Scan email body/ subject for date/time phrases (e.g., “meeting tomorrow at 2pm”).
- Use LLM to extract event details (title, start, end).
- Return suggested event to frontend. User confirms, then create via Google Calendar API.

#### 6. Inbox Zero Dashboard
- Real‑time stats: processed vs remaining, cleaned count.
- Bulk actions: “Archive all read promotions”, “Delete all OTPs older than 1 day”, “Unsubscribe from selected”.
- All bulk actions processed as background jobs (Bull queue) to avoid timeouts.

### 📁 Project Structure (generate all files)
