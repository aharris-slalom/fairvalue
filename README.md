# FairValue

AI-guided Texas property tax protest automation. Homeowners enter an address, walk through a 5-phase audit flow with an AI assistant, and download a formatted evidence packet ready to file with the Appraisal Review Board — for a flat $69.

Currently supports **Dallas, Collin, and Tarrant counties**.

---

## How it works

1. **Enter your address** — Assessment data is pulled instantly from county records.
2. **Walk through your home** — An AI assistant asks about conditions, defects, and repairs. Every issue is logged as a dollar-denominated deficit.
3. **Download your packet** — A formatted PDF evidence packet and protest letter, ready to file with the ARB.

---

## Tech stack

- **Framework:** Next.js 16 App Router · TypeScript
- **Styling:** Tailwind CSS · shadcn/ui
- **Auth & DB:** Supabase (PostgreSQL + Auth + Storage) with RLS
- **AI:** Vercel AI SDK · Groq (`llama-3.3-70b-versatile`) for streaming chat
- **PDF:** `@react-pdf/renderer`
- **Maps:** Mapbox (satellite aerial + geocoding)
- **State:** Zustand
- **Payments:** Stripe (mock checkout — not yet live)

---

## Local development

**1. Clone and install**

```bash
git clone <your-repo-url>
cd property_tax_protest_app
npm install
```

**2. Configure environment variables**

Copy the example below into a new `.env.local` file at the project root and fill in your keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GROQ_API_KEY=

NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**3. Run the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Import the repo at [vercel.com/new](https://vercel.com/new). Vercel auto-detects Next.js.
2. On the import screen, add all environment variables from `.env.local` before clicking **Deploy**. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain (e.g. `https://your-app.vercel.app`).
3. In your **Supabase project → Authentication → URL Configuration**, set:
   - **Site URL:** `https://your-app.vercel.app`
   - **Redirect URLs:** `https://your-app.vercel.app/auth/callback`
