# Deployment Guide: Free Hosting

This guide outlines how to deploy the entire TrueAuth stack using free-tier services.

## 1. Database & Auth (Supabase)
**Provider**: [Supabase](https://supabase.com/) (Free Tier)
- **Database**: 500MB Postgres included.
- **Authentication**: Google OAuth is free up to 50k monthly active users.
- **Actions**:
  - Create a new project.
  - Go to **SQL Editor** and paste all migrations from `supabase/migrations/*.sql`.
  - Go to **Authentication > Providers** and enable Google. Use the Client ID and Secret from your Google Cloud Console.
  - Add the Supabase Redirect URL to your Google Cloud Console "Authorized Redirect URIs".

## 2. Global Task Queue (Redis)
**Provider**: [Upstash](https://upstash.com/) (Free Tier)
- **Redis**: 10,000 requests per day for free.
- **Actions**:
  - Create a "Global" Redis database.
  - Copy the `REDIS_URL` (looks like `redis://default:password@host:port`).

## 3. Backend API (Render)
**Provider**: [Render](https://render.com/) (Free Web Service)
- **Service Type**: Web Service.
- **Actions**:
  - Connect your GitHub repository.
  - **Runtime**: Render might auto-detect 'Docker'. **Change the Runtime dropdown to 'Node'** manually.
  - **Root Directory**: Set this to `backend` (Found under the **Advanced** toggle).
  - **Start Command**: `npm start` (Now runs pre-compiled JS).
  - **Environment Variables**: 
    - Add all keys from your `.env` file.
    - **Crucial**: Add `NODE_OPTIONS` = `--max-old-space-size=400` (This prevents 'Out of Memory' crashes on Render's 512MB free tier).
  - *Note: Free tier services "spin down" after inactivity. First request might take ~30s.*

## 4. Frontend (Vercel)
**Provider**: [Vercel](https://vercel.com/) (Free Hobby Tier)
- **Framework**: Angular.
- **Actions**:
  - Connect your GitHub repository.
  - Root Directory: `frontend`.
  - **Environment Variables**:
    - Add these variables in the **Vercel Project Settings > Environment Variables** UI:
      - `SUPABASE_URL`: Your production Supabase project URL.
      - `SUPABASE_ANON_KEY`: Your production Supabase anonymous key.
      - `API_URL`: Your Render backend URL (e.g., `https://trueauth-api.onrender.com/api`).
    - **How it works**: I've added a `set-env.js` script that runs automatically during the Vercel build. It reads these variables and generates the `src/environments/environment.prod.ts` file for you, so your secrets are never committed to Git.
  - Vercel automatically detects Angular and builds it using `npm run build`.

## 5. Google Cloud Configuration
Ensure that your **Authorized JavaScript Origins** and **Authorized Redirect URIs** are updated in the [Google Cloud Console](https://console.cloud.google.com/):
- **Origins**: `https://your-app.vercel.app`
- **Redirects**: `https://your-supabase-project.supabase.co/auth/v1/callback`

---

## Deployment Checklist
- [ ] Database migrated?
- [ ] Google OAuth configured in Supabase?
- [ ] Redis URL set in Backend?
- [ ] Backend URL set in Frontend `environment.prod.ts`?
- [ ] Google Cloud redirect URIs updated to match production?
