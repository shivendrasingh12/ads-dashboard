# Ads Command — Complete Setup Guide

This guide takes you from zero to a live team dashboard in about 45 minutes.
No paid services required. Everything runs on free tiers.

---

## Overview

| What | Where | Cost |
|------|-------|------|
| App hosting | Vercel (free) | ₹0 |
| Reminder storage | Vercel KV (free tier) | ₹0 |
| Google Ads data | Google Ads API (free) | ₹0 |
| Meta Ads data | Meta Graph API (free) | ₹0 |

---

## PART 1 — Google Ads API Setup

### Step 1.1 — Apply for Google Ads API access

1. Go to https://ads.google.com → Tools & Settings → API Center
2. Fill in the "Apply for Basic Access" form
   - Company name: your agency/brand name
   - Use case: "Internal reporting dashboard"
3. You will receive a **Developer Token** — copy it
   - Basic access is enough (no need for Standard access for your own accounts)
   - Approval is usually instant for basic access

### Step 1.2 — Create a Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project (e.g. "Ads Dashboard")
3. In the left menu → APIs & Services → Enable APIs
4. Search for **Google Ads API** → Enable it

### Step 1.3 — Create OAuth 2.0 Credentials

1. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: **Desktop app**
3. Name it anything (e.g. "Ads Dashboard")
4. Download or copy:
   - **Client ID** → this is `GOOGLE_CLIENT_ID`
   - **Client Secret** → this is `GOOGLE_CLIENT_SECRET`

### Step 1.4 — Configure OAuth consent screen

1. APIs & Services → OAuth consent screen
2. User Type: Internal (if your Google account is a Workspace account) OR External
3. Add scope: `https://www.googleapis.com/auth/adwords`
4. Add your email as a test user if External

### Step 1.5 — Get your Refresh Token (one-time)

Run this on your local machine (not on server):

```bash
# In the project folder:
npm install googleapis
node scripts/get-google-refresh-token.js
```

- It will print a URL — open it in your browser
- Log in with the Google account that has access to your Google Ads account
- Approve the permissions
- Paste the code back into the terminal
- Copy the printed `GOOGLE_REFRESH_TOKEN` value

### Step 1.6 — Find your Customer ID

1. Log into https://ads.google.com
2. Top right corner — your Customer ID is shown as `XXX-XXX-XXXX`
3. Remove the dashes: `XXXXXXXXXX` → this is `GOOGLE_CUSTOMER_ID`

If you manage multiple accounts via a Manager (MCC) account:
- Use the MCC Customer ID
- The API will fetch all child accounts automatically

---

## PART 2 — Meta Ads API Setup

### Step 2.1 — Create a Meta App

1. Go to https://developers.facebook.com/apps/
2. Click **Create App**
3. Use case: **Other** → Business
4. Give it a name (e.g. "Ads Dashboard")
5. From App Settings → Basic:
   - Copy **App ID** → `META_APP_ID`
   - Copy **App Secret** → `META_APP_SECRET`

### Step 2.2 — Add Marketing API product

1. In your app dashboard → Add Product → **Marketing API** → Set Up
2. This unlocks the ad data endpoints

### Step 2.3 — Create a System User Access Token (never expires)

This is the recommended approach — regular user tokens expire in 60 days.

1. Go to https://business.facebook.com → Settings → System Users
2. Create a **System User** (Admin level)
3. Click **Generate New Token** on that system user
4. Select your app
5. Add these permissions:
   - `ads_read`
   - `ads_management`
   - `business_management`
   - `read_insights`
6. Copy the token → this is `META_ACCESS_TOKEN`

### Step 2.4 — Get your Ad Account ID

1. Go to https://business.facebook.com → Ad Accounts
2. Your Ad Account ID is shown as a number (e.g. `123456789`)
3. Add `act_` prefix → `act_123456789` → this is `META_AD_ACCOUNT_ID`

### Step 2.5 — Add the System User to your Ad Account

1. Business Settings → Ad Accounts → select your account
2. Add People → select the System User you created
3. Give it **Analyst** role (read-only is enough for the dashboard)

---

## PART 3 — Deploy to Vercel (Free)

### Step 3.1 — Push code to GitHub

```bash
# In the project folder:
git init
git add .
git commit -m "Initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/ads-dashboard.git
git push -u origin main
```

### Step 3.2 — Deploy on Vercel

1. Go to https://vercel.com → Sign up free with your GitHub account
2. Click **Add New Project**
3. Import your `ads-dashboard` GitHub repo
4. Framework: **Next.js** (auto-detected)
5. Click **Deploy** — first deploy will fail (no env vars yet) — that's fine

### Step 3.3 — Add environment variables on Vercel

1. In your Vercel project → **Settings** → **Environment Variables**
2. Add each variable from `.env.example`:

```
GOOGLE_CLIENT_ID          = (from Step 1.3)
GOOGLE_CLIENT_SECRET      = (from Step 1.3)
GOOGLE_DEVELOPER_TOKEN    = (from Step 1.1)
GOOGLE_REFRESH_TOKEN      = (from Step 1.5)
GOOGLE_CUSTOMER_ID        = (from Step 1.6)
META_APP_ID               = (from Step 2.1)
META_APP_SECRET           = (from Step 2.1)
META_ACCESS_TOKEN         = (from Step 2.3)
META_AD_ACCOUNT_ID        = (from Step 2.4)
APP_SECRET                = (generate: openssl rand -base64 32)
```

3. Set Environment to: **Production, Preview, Development**
4. Click **Save**

### Step 3.4 — Add Vercel KV (for persistent reminders)

Without this, reminders reset when the server restarts (fine for testing, not ideal for production).

1. In Vercel project → **Storage** tab
2. Create Database → **KV**
3. Name it `ads-dashboard-kv`
4. Click **Connect to Project** → select your project
5. Vercel automatically adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` to your env vars

### Step 3.5 — Redeploy

1. Vercel project → **Deployments** → click the three dots on latest → **Redeploy**
2. Or push any change to GitHub — Vercel auto-deploys on every push

### Step 3.6 — Share with your team

Your dashboard URL will be: `https://ads-dashboard-XXXX.vercel.app`

- Share this URL with your team — no login required by default
- To add a simple password (optional), set `DASHBOARD_PASSWORD` env var
  and redeploy (see Password Protection section below)

---

## PART 4 — Optional: Password Protection

To stop the public from accessing your dashboard, add a middleware password:

1. Set `DASHBOARD_PASSWORD=yourteampassword` in Vercel env vars
2. Create `middleware.js` in the project root:

```js
import { NextResponse } from 'next/server'

export function middleware(request) {
  const password = process.env.DASHBOARD_PASSWORD
  if (!password) return NextResponse.next()

  const cookie = request.cookies.get('dash-auth')
  if (cookie?.value === password) return NextResponse.next()

  const { searchParams } = new URL(request.url)
  const attempt = searchParams.get('p')
  if (attempt === password) {
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.set('dash-auth', password, { maxAge: 60 * 60 * 24 * 30 })
    return response
  }

  return new NextResponse('Access your dashboard at: ' + request.url + '?p=YOUR_PASSWORD', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Ads Dashboard"' },
  })
}

export const config = { matcher: ['/((?!api|_next).*)'] }
```

3. Team members visit `https://your-dashboard.vercel.app?p=yourteampassword` once
4. They're then logged in via cookie for 30 days

---

## PART 5 — Custom Domain (Optional, Free)

You can use a free subdomain or connect your own domain:

### Using your own domain:
1. Vercel project → Settings → Domains
2. Add your domain (e.g. `ads.youragency.com`)
3. Add the DNS records Vercel shows you (CNAME or A record)
4. Free SSL certificate is auto-provisioned

### Using a free subdomain:
- Your Vercel URL (`ads-dashboard.vercel.app`) already works as-is
- You can also use Vercel's custom subdomain: `yourteamname.vercel.app`

---

## PART 6 — Running Locally (for development)

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/ads-dashboard.git
cd ads-dashboard

# Install dependencies
npm install

# Copy env file and fill in your credentials
cp .env.example .env.local
# Edit .env.local with your values

# Start development server
npm run dev

# Open http://localhost:3000
```

---

## Troubleshooting

### "Google Ads API not returning data"
- Check that your Customer ID has no dashes
- Ensure the Google account used for the refresh token has access to that Customer ID
- Basic access developer token only works with test accounts — apply for Standard if needed for live accounts
- Check Vercel function logs: Vercel dashboard → your project → Functions tab

### "Meta API returning empty results"
- Ensure the System User has been added to the Ad Account with at least Analyst role
- Check that the Access Token has `ads_read` and `read_insights` permissions
- Meta tokens can be debugged at: https://developers.facebook.com/tools/debug/accesstoken/

### "Reminders reset after a while"
- Set up Vercel KV as described in Step 3.4
- Without KV, reminders live in server memory (reset on cold starts)

### "Changes tab shows nothing"
- Google change history requires the account to be allow-listed for the `change_event` resource
- This is a Google Ads API restriction — not all accounts have it
- Contact Google Ads API support to request access

### Vercel free tier limits
- 100GB bandwidth/month
- 100 serverless function executions/day on Hobby plan
- Functions time out after 10 seconds
- All well within limits for a team internal tool

---

## File Structure Reference

```
ads-dashboard/
├── pages/
│   ├── index.js              ← Main dashboard UI
│   ├── _app.js               ← App wrapper
│   └── api/
│       ├── status.js         ← Check which platforms are connected
│       ├── campaigns.js      ← Fetch campaigns (Google + Meta)
│       ├── adgroups.js       ← Fetch ad groups / adsets
│       ├── ads.js            ← Fetch individual ads
│       ├── insights.js       ← Auto-generated recommendations
│       ├── reminders.js      ← CRUD for scheduled reminders
│       └── changes.js        ← Change history (Google only)
├── lib/
│   ├── googleAds.js          ← Google Ads API client
│   ├── metaAds.js            ← Meta Graph API client
│   ├── reminders.js          ← Reminder storage (KV or memory)
│   └── recommendations.js    ← Recommendation logic
├── styles/
│   └── globals.css           ← Global styles
├── scripts/
│   └── get-google-refresh-token.js  ← One-time token generator
├── .env.example              ← Template for all env vars
├── next.config.js
├── package.json
└── SETUP.md                  ← This file
```
