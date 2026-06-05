# HeroKids Booking — Setup & Run Guide

## Quick start (local development)

### 1. Prerequisites

- Node.js 18 or later
- npm

### 2. Clone and install

```bash
git clone <your-repo> herokids-booking
cd herokids-booking
npm install
```

### 3. Configure environment variables

Copy the example file and edit it:

```bash
cp .env.example .env.local
```

The minimum required values to run locally (without Google Calendar):

```
DATABASE_URL=./herokids.db
ACCESS_PASSWORD=herokids2026
```

Change `ACCESS_PASSWORD` to something your team will use to log in.

### 4. Set up the database

```bash
npm run db:migrate   # creates herokids.db and runs the schema
npm run db:seed      # inserts 8 sample bookings for testing
```

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the password from `.env.local`.

---

## Google Calendar integration

### How it works

When a booking is created, updated, or cancelled the app calls the Google Calendar API to keep an event in sync. If the API call fails, the booking is still saved — the error is shown in the booking detail view so staff can retry manually.

### Step-by-step setup

#### 1. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. "HeroKids Booking")
3. Go to **APIs & Services → Library**
4. Search for and enable **Google Calendar API**

#### 2. Create OAuth 2.0 credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Choose **Web application**
4. Name it (e.g. "HeroKids Booking Local")
5. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/google/callback`
   - Your production URL when deploying (e.g. `https://yourdomain.com/api/auth/google/callback`)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret** into `.env.local`

#### 3. Get a refresh token (one-time)

Google Calendar requires a long-lived refresh token. The easiest way to get one is using the OAuth Playground:

1. Go to [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground)
2. Click the gear icon (⚙) in the top right → check **"Use your own OAuth credentials"**
3. Enter your Client ID and Client Secret
4. In the left panel, select **Google Calendar API v3** → tick `https://www.googleapis.com/auth/calendar`
5. Click **Authorize APIs** and sign in with the Google account that owns the calendar
6. Click **Exchange authorization code for tokens**
7. Copy the **Refresh token** into `.env.local`

Alternatively, run the included helper script:

```bash
npx tsx src/scripts/get-token.ts
```

This prints an auth URL, opens it in your browser, and captures the refresh token.

#### 4. Set the calendar ID

By default the app uses `primary` (the main calendar of the authenticated user).

To use a specific calendar:
1. Open Google Calendar in your browser
2. Click the three dots next to the calendar → **Settings and sharing**
3. Scroll down to **Integrate calendar** → copy the **Calendar ID** (looks like `abc123@group.calendar.google.com`)
4. Set it in `.env.local`:

```
GOOGLE_CALENDAR_ID=abc123@group.calendar.google.com
```

#### 5. Final .env.local with Google Calendar

```env
DATABASE_URL=./herokids.db
ACCESS_PASSWORD=your_staff_password

GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_REFRESH_TOKEN=1//0abc...long-token...
GOOGLE_CALENDAR_ID=primary
```

Restart `npm run dev` after editing `.env.local`.

---

## Database management

| Command | Description |
|---|---|
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Reset and insert sample data |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |

The database is a single SQLite file (`herokids.db`) in the project root. Back it up by copying this file.

---

## Deployment notes (production checklist)

- [ ] Set `ACCESS_PASSWORD` to a strong, shared staff password
- [ ] Use a persistent volume for `herokids.db` (not ephemeral storage)
- [ ] Set `NEXT_PUBLIC_APP_URL` to your production domain
- [ ] Add the production domain to OAuth redirect URIs in Google Cloud Console
- [ ] Consider upgrading authentication to a proper auth system (NextAuth.js, Clerk, etc.) before exposing to the public internet

---

## First version limitations

These are known limitations in this MVP that can be addressed in future versions:

1. **Authentication**: Simple shared password cookie. Fine for internal staff on a trusted network. Not suitable for internet-facing deployment without upgrading to NextAuth / Clerk / similar.

2. **Single venue**: The capacity rule is hard-coded to one room with a max of 30 children. Multiple rooms or configurable capacity can be added later.

3. **No recurring bookings**: Each booking is a single time slot. Recurring sessions would need a separate model.

4. **No customer-facing interface**: Bookings are staff-only. Customer self-booking requires an additional public-facing form and booking confirmation flow.

5. **SQLite**: Excellent for a single-server setup. If you need multi-instance deployment or expect very high concurrent write volume, migrate to PostgreSQL (Drizzle supports it with minimal changes).

6. **Google Calendar refresh token**: The refresh token is stored in an environment variable. It doesn't expire unless revoked, but if it is revoked you'll need to regenerate it using the steps above.

7. **No audit log**: Changes to bookings are not tracked. Adding a `booking_history` table would provide a change log.
