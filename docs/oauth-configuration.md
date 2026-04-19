# OAuth configuration (Google + Supabase)

This app signs users in with **Supabase Auth** using the **Google** provider. Gmail and Calendar calls use **Google provider tokens** from that session, which the backend stores in `user_tokens` after sync.

---

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select or create a project.
2. **APIs & Services → OAuth consent screen**
   - Choose **External** (or Internal for Workspace-only).
   - Add app name, user support email, developer contact.
   - Add scopes (or add them on the OAuth client step):
     - `openid`
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/calendar.events`
   - If the app is in **Testing**, add each test user’s Google account under **Test users**.

3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: not required for Supabase-hosted redirect-only flow; you may add your site URL later if needed.
   - **Authorized redirect URIs**: add **exactly** the Supabase callback URL (see §2). Example:
     - `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`

4. Copy the **Client ID** and **Client secret** for Supabase (next section).

5. **APIs & Services → Library**: enable **Gmail API** and **Google Calendar API** for this project.

---

## 2. Supabase (Auth → Providers → Google)

1. In the [Supabase Dashboard](https://supabase.com/dashboard), open your project.
2. Go to **Authentication → Providers → Google**.
3. Enable Google and paste the **Client ID** and **Client secret** from Google Cloud.
4. **Authentication → URL Configuration**
   - **Site URL**: your app’s public origin (e.g. `http://localhost:4200` during dev).
   - **Redirect URLs**: add every URL users must return to after OAuth, including:
     - `http://localhost:4200/dashboard` (local Angular app)
     - Production: `https://your-domain.com/dashboard`
   - Supabase validates `redirect_to` from the client against this list.

The Google OAuth redirect always hits **Supabase first**:

`https://<project-ref>.supabase.co/auth/v1/callback`

That URI must **only** appear in **Google Cloud → OAuth client → Authorized redirect URIs**, not your local `/dashboard` URL. Your app’s `/dashboard` is passed as Supabase’s `redirect_to` query parameter and must be listed under **Supabase → Redirect URLs**.

---

## 3. Frontend (Angular)

- `environment.ts` must contain your Supabase **URL** and **anon (public) key** (not the service role key).
- Sign-in uses `signInWithOAuth` with:
  - `redirectTo`: `https://<your-app-origin>/dashboard`
  - Gmail + Calendar scopes (see `frontend/src/app/services/supabase.service.ts`).
  - `queryParams`: `access_type=offline` and `prompt=consent` so Google can issue a **refresh token** (first time or after consent).

After login, the app calls **`POST /api/auth/sync-google-tokens`** so the API can store `provider_token` / `provider_refresh_token` in `user_tokens`.

---

## 4. Backend (Express)

- `.env` should include:
  - `SUPABASE_URL` — project URL.
  - `SUPABASE_SERVICE_ROLE_KEY` — **service role** key (server only; never expose to the browser). Required to write `user_tokens`.
  - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — same OAuth client as in Supabase, used for refreshing tokens when calling Gmail/Calendar via `googleapis`.

---

## 5. Database

Run the SQL migrations (e.g. `supabase/migrations/00000_schema.sql`) so `public.user_tokens` exists. The sync endpoint inserts or updates one row per user.

---

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| **403: disallowed_useragent** | Complete Google sign-in in a **normal browser** (Chrome, Firefox, Edge). Avoid embedded WebViews, IDE Simple Browser, or in-app browsers. |
| **400** on `/api/mailbox` or `/api/subscriptions` | Tokens not in DB yet. Ensure sync ran after login; check backend logs (`[auth.sync]`). Confirm **service role** key is set. |
| **500** on `/api/auth/sync-google-tokens` | Read JSON response `code`, `details`, `hint`. Logs include `requestId` matching the `X-Request-Id` response header. |
| **Redirect mismatch** | Supabase **Redirect URLs** must include the exact `redirect_to` URL (including path). Google **Authorized redirect URIs** must include only Supabase’s `/auth/v1/callback`. |
| **No refresh token** | Sign out, sign in again with `prompt=consent` so Google can return `provider_refresh_token` when appropriate. |

---

## Logging

- **HTTP access**: each line includes `rid=<request-id>` (correlation id).
- **Structured logs**: `[timestamp] [LEVEL] [context] message {...json}`.
- Errors in routes and `auth.middleware` log `requestId`, `path`, and safe fields (no JWTs or full OAuth tokens).

Set `LOG_LEVEL=debug` for verbose `debug` lines (if used). Default is info/warn/error only.
