# Deploying to Railway

## Overview

Railway runs the app as a single Next.js service backed by a managed PostgreSQL database.  
Migrations run automatically on every deploy via the `start:prod` script before the server starts.

---

## One-time setup

### 1. Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project → Deploy from GitHub repo**
3. Authorise Railway to access your GitHub account and select this repo
4. Railway detects Next.js automatically and queues a first deploy (it will fail until you add the database and variables — that's expected)

### 2. Add a PostgreSQL database

1. Inside your Railway project, click **+ New → Database → PostgreSQL**
2. Railway provisions a Postgres instance and injects `DATABASE_URL` into your service automatically — you don't need to copy anything

### 3. Set environment variables

In the Railway dashboard, open your **app service → Variables tab** and add the following.  
Do **not** put these in any file — set them only in the dashboard.

| Variable | Value | Notes |
|---|---|---|
| `ACCESS_PASSWORD` | e.g. `herokids2026` | Staff login password |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console | See Google Calendar setup in `SETUP.md` |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console | |
| `GOOGLE_REFRESH_TOKEN` | from OAuth Playground | |

`DATABASE_URL`, `NODE_ENV`, `NEXT_PUBLIC_APP_URL`, `GOOGLE_REDIRECT_URI`, and `GOOGLE_CALENDAR_ID` are already set — Railway injects `DATABASE_URL` from the Postgres plugin, and the rest come from `.env.production` which is committed to the repo.

### 4. Update `.env.production` with your Railway domain

After the first successful deploy Railway assigns a domain like `https://herokids-booking.up.railway.app`.

1. Copy that URL
2. Edit `.env.production` in the repo:
   ```
   NEXT_PUBLIC_APP_URL=https://herokids-booking.up.railway.app
   GOOGLE_REDIRECT_URI=https://herokids-booking.up.railway.app/api/auth/google/callback
   ```
3. Also add the redirect URI to **Google Cloud Console → Credentials → your OAuth client → Authorised redirect URIs**
4. Commit and push — Railway redeploys automatically

### 5. Set a custom domain (optional)

In **Railway → your service → Settings → Domains**, click **Add custom domain** and follow the DNS instructions.  
After the domain is live, update `NEXT_PUBLIC_APP_URL` and `GOOGLE_REDIRECT_URI` again.

---

## How deploys work

Every push to your connected branch triggers:

```
npm run build          # Next.js production build
npm run start:prod     # runs db:migrate then next start
```

`db:migrate` applies any pending migrations before the server starts, so schema changes are always in sync with the deployed code.

---

## Secrets that must never be committed

| File | Should it be committed? |
|---|---|
| `.env.local` | No — gitignored |
| `.env.production` | Yes — contains only non-secret defaults |
| `.env.example` | Yes — template with placeholder values |

Real secrets (`ACCESS_PASSWORD`, `GOOGLE_*` tokens) live only in the Railway Variables tab.

---

## Useful Railway CLI commands

```bash
# Install
npm install -g @railway/cli

# Login
railway login

# Tail live logs
railway logs

# Open a shell into the running container
railway shell

# Run a one-off command (e.g. re-seed production — careful!)
railway run npm run db:seed
```
