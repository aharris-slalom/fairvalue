# FairValue — Build Plan

> Work top-to-bottom within each phase. Each phase produces a working vertical slice before the next begins.
> Stack: Next.js App Router · TypeScript · TailwindCSS · Shadcn/ui · Supabase · Vercel AI SDK · Stripe · @react-pdf/renderer

---

## Phase 1 — Foundation
> Get a running Next.js app connected to Supabase with auth working end-to-end. Nothing else happens until this is solid.

- [x] Initialize Next.js project (App Router, TypeScript, TailwindCSS)
- [x] Install and configure Shadcn/ui
- [x] Create Supabase project, configure `.env.local` with all required env vars
- [x] Run DDL: execute full PostgreSQL schema (users, properties, protests, property_deficits, evidence_attachments + indexes)
- [x] Configure Supabase Auth (email + password, confirm email enabled)
- [x] Build `/signup` page (email + password form)
- [x] Build `/login` page (email + password form)
- [x] Implement `middleware.ts` — protect `/dashboard`, `/protest/[id]`, `/checkout` routes
- [x] Implement Supabase session provider in root layout
- [x] Configure Supabase Storage bucket for evidence photos
- [x] Set up Row Level Security (RLS) policies on all tables (users own their protests and deficits)
- [x] Verify auth round-trip: sign up → confirm email → log in → redirect to `/dashboard`

---

## Phase 2 — Data Layer
> Seed the database with real DFW county property data. Without this, Phase 3–5 have nothing to work with.

- [x] Download certified appraisal roll exports from Dallas CAD (DCAD), Collin CAD (CCAD), Tarrant Appraisal District (TAD) — DCAD pending correct file (real property characteristics export)
- [x] Write Node.js ingestion script (`scripts/ingest-county-data.ts`)
  - [ ] Dallas CAD parser (normalize column names → schema fields) — pending DCAD file
  - [x] Collin CAD parser
  - [x] Tarrant CAD parser
  - [x] Shared upsert function: `ON CONFLICT (county_account_number) DO UPDATE`
  - [x] Parse error logging + ingestion count summary
- [x] Run ingestion script against Supabase — 334,009 rows (Collin + Tarrant)
- [x] Add `street_address` index for fast prefix/full-text search (Phase 1 autocomplete)
- [x] Create `config/tax-rates.ts` with Dallas, Collin, Tarrant composite rates
- [x] Create `config/legal-citations.ts` with the four Texas Tax Code section references
- [x] Write and test the equity comp SQL query (zip code + year_built ±5 + sqft ±15%, median rate)

---

## Phase 3 — Core UX Shell
> Build the structural routing and state machine skeleton. All five phases exist as routes/components, even if they're mostly empty.

- [x] Create Zustand store (`useProtestStore`) — manages phase, protest_id, property data, deficits, target value
- [x] Build landing page (`/`) — address search input with autocomplete against `properties` table
- [x] Build server action: `lookupProperty(address)` → returns property row or null
- [x] Build server action: `createProtest(user_id, property_id)` → inserts protest row, returns protest_id
- [x] Build `/protest/[id]` route — reads protest row, rehydrates Zustand store to correct phase
- [x] Phase 1 shell: address confirmed → AI intro screen with county valuation surfaced
- [x] Phase 2 shell: argument selection chips (`market_value` / `equity` / `both`)
- [x] Phase 3 shell: chat interface placeholder
- [x] Phase 4 shell: value preview table placeholder
- [x] Phase 5 shell: delivery screen placeholder
- [x] Build `/dashboard` page — list user's protests, status chips, "Start New Protest" CTA
- [x] Implement phase transition server action: `advancePhase(protest_id, new_status)`
- [x] Implement all error state UI: address not found, session expired mid-flow

---

## Phase 4 — AI Conversational Engine
> Wire up the Vercel AI SDK and build the Phase 3 home audit chat with structured deficit extraction.

- [x] Install `ai`, `@ai-sdk/groq`, `@ai-sdk/openai`, `@ai-sdk/react` packages
- [x] Create API route `app/api/chat/route.ts` — streams responses via Vercel AI SDK (Groq llama-3.3-70b-versatile)
- [x] Write system prompt for Phase 1 intro — property data surfaced via UI; no separate AI prompt needed
- [x] Write system prompt for Phase 2 argument explanation — handled by `Phase2Argument` UI component with plain-English card descriptions
- [x] Write system prompt for Phase 3 home audit (`lib/prompts/audit.ts` — trigger keyword detection, structured extraction instructions, 8-category audit order)
- [x] Define `log_deficit` tool with Zod schema (`category` enum, `user_description`, `estimated_cost_to_cure`)
- [x] Implement `useChat` hook in Phase 3 chat component (`phase-3-audit.tsx`)
- [x] Implement tool call handler: on `log_deficit` output, renders `DeficitCard` inline within chat
- [x] Build file upload component (`photo-upload.tsx` — camera/file input, uploads to Supabase Storage, writes to `evidence_attachments`)
- [x] Build server action: `saveDeficit` — executed inline inside the tool's `execute` function in the chat route
- [x] Test Phase 3 end-to-end: trigger keyword → structured extraction → DB write → photo upload
- [x] Apply chat bubble styling: `rounded-xl`, warm palette, voice TTS toggle

---

## Phase 5 — Computation Engine
> Implement the two ARB formulas. These feed Phase 4's value preview table.

- [x] Write `computeEquityTarget` server function — inlined in `lockProtestValue` (`lib/actions/computation.ts`)
  - [x] Query comps from `properties` (same zip, year_built ±5, sqft ±15%; falls back to value range ±30% when sqft is absent)
  - [x] Compute unadjusted rate per comp: `current_proposed_value / total_living_area_sqft`
  - [x] Find statistical median of comp rates
  - [x] Return: `median_rate × subject_sqft`
- [x] Write `computeFinalValue` server function — inlined in `lockProtestValue`
  - [x] Fetch `equity_target` from above
  - [x] Sum all `estimated_cost_to_cure` from `property_deficits` for this protest
  - [x] Return: `equity_target − sum(cost_to_cure)`
- [x] Write `computeEstimatedSavings` server function — inlined in `lockProtestValue`
  - [x] Look up county tax rate from `config/tax-rates.ts`
  - [x] Return: `(current_proposed_value − final_value) × county_tax_rate`
- [x] Write server action: `lockProtestValue(protest_id)` → writes `target_protest_value` + `estimated_savings` to protest row, advances status to `payment_pending`
- [x] Build Phase 4 value preview table (Current Value → Equity Comp Target → Documented Repair Deduction → Target Protest Value → Estimated Annual Savings)
- [ ] Validate formula output against a real DCAD property manually

---

## Phase 6 — Payments (Stripe)
> Gate PDF delivery behind the $69 Stripe checkout. No PDFs are generated before payment is confirmed.
> Note: A mock checkout modal (test mode, fake card form) is in place in `phase-4-preview.tsx` and calls `generateEvidencePacket` directly. Replace with real Stripe before launch.

- [ ] Create Stripe product and price ($69 one-time, note Price ID in env vars)
- [ ] Install `stripe` package
- [ ] Build server action: `createCheckoutSession(protest_id)` → creates Stripe Checkout session with metadata `{ protest_id }`, sets `stripe_session_id` on protest row
- [ ] Build `/checkout` redirect route (redirects to Stripe-hosted checkout)
- [ ] Create Stripe webhook handler `app/api/webhooks/stripe/route.ts`
  - [ ] Verify webhook signature
  - [ ] On `checkout.session.completed`: advance protest status to `processing_pdf`, trigger PDF generation job
  - [ ] On `payment_intent.payment_failed`: surface error, status stays `payment_pending`
- [ ] Configure Stripe webhook endpoint in Stripe dashboard (test + production)
- [ ] Test full payment round-trip in Stripe test mode

---

## Phase 7 — PDF Generation
> Build the evidence packet. This is the core deliverable the user is paying for.
> Renderer: `@react-pdf/renderer` (React component → PDF, not Puppeteer/PDFKit).

- [x] Choose and install renderer: `@react-pdf/renderer`
- [x] Build Page 1 (Cover): property address, county account number, appraisal district, prepared date, cover footer
- [x] Statutory declaration block using `config/legal-citations.ts` — cover page footer now cites §§ 41.41, 41.43, 41.44, 41.66 via config; comp page `§ 41.43(b)` citation also pulled from config
- [x] Build Page 2 (Value Analysis): Valuation Variance Summary Table — current value, equity comp target, documented deduction, target protest value, estimated savings callout
- [x] Build Page 3 (Comparable Property Analysis): comp table with address, sqft, value, $/sqft columns (up to 20 comps); subject property highlighted row; Texas Tax Code § 41.43(b) citation
- [x] Build Page 4 (Property Condition Report): tabular deficit cards — category, user narrative, cost-to-cure; total deduction highlighted row (conditional on deficits existing)
- [x] Build Photo Evidence Annex page — fetches `evidence_attachments` rows, downloads each image from Supabase Storage as a buffer, embeds as base64 data URI; renders 2 photos per page with Exhibit ID, deficit category, description, and UTC upload timestamp (`EvidencePhoto` interface in `evidence-packet.tsx`)
- [x] Apply palette to PDF templates (navy `#1e3a5f` headers, slate body text, green savings callout)
- [x] Apply typography: Helvetica-Bold titles and headers, 10pt regular body
- [x] Build `generateEvidencePacket(protest_id)` server function → compiles data, renders both PDFs via @react-pdf/renderer, uploads to Supabase Storage (`protest-pdfs` bucket), generates 7-day signed URLs for each
- [x] Build `generateProtestLetter(protest_id)` server function → one-page formal Notice of Intent to Protest; cites §§ 41.41, 41.43, 41.44, 41.66 via `config/legal-citations.ts`; grounds adapt to `argument_type`; rendered and uploaded atomically inside `generateEvidencePacket` (`components/pdf/protest-letter.tsx`)
- [x] On PDF generation complete: write `generated_pdf_url` and `generated_letter_url` to protest row, advance status to `completed_ready`
- [x] Build retry mechanism: when `protest.status = 'processing_pdf'` (stuck), Phase 4 renders a retry UI ("taking longer than expected") with a **Retry PDF Generation** button that re-invokes `generateEvidencePacket`

---

## Phase 8 — Phase 5 Delivery Screen
> Final user-facing screen: download links + filing checklist.

- [x] Build Phase 5 delivery UI (`phase-5-delivery.tsx` — renders when `status = completed_ready`)
- [x] Display protest letter download button — Notice of Protest card (primary style) renders above the evidence packet card; reads `letterUrl` from Zustand store (seeded from `generated_letter_url` on page load)
- [x] Display evidence packet download button (signed Supabase Storage URL)
- [x] Build step-by-step county filing checklist
  - [x] Dallas CAD uFile link
  - [x] Collin CAD Protest link
  - [x] Tarrant CAD Protest link
  - [x] Deadline reminder copy: "Texas protest deadline is May 15, or 30 days after your assessment notice — whichever is later."
- [x] Signed Supabase Storage URLs (7-day expiry, generated in `generateEvidencePacket`)

---

## Phase 9 — Polish & Mobile
> Harden the UI, test mobile flows, and ensure the camera upload path works on real devices.

- [x] Audit all pages for mobile-first layout — all pages use `px-4`, `max-w-*`, `dvh`, `flex-wrap`; `viewportFit: 'cover'` set in layout; `pb-safe` utility defined
- [x] Test Phase 3 camera upload on iOS Safari and Android Chrome — `capture="environment"` on file input confirmed; `accept="image/*"` scoped correctly
- [x] Apply soft geometry (`rounded-xl` chat bubbles, `rounded-2xl` card wrappers) consistently — confirmed throughout; `ChatBubble` uses `rounded-xl`, all card wrappers use `rounded-2xl`
- [x] Implement toast notifications for phase transitions and errors — Sonner wired in root layout with `richColors`; toasts on login/signup errors, Phase 3 audit lock, address search failure, photo upload success/failure
- [x] Implement loading states / skeleton screens — address lookup spinner, Phase 3 typing dots, Phase 4 processing spinner, dashboard `loading.tsx` skeleton (3 ghost protest cards)
- [x] Accessibility pass — `ChatBubble` now renders markdown (bold + line breaks); Phase 3 textarea auto-resizes; `AddressSearch` has Arrow/Enter/Escape keyboard nav + `aria-activedescendant` + correct `aria-selected`; both modals have `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-label` on close buttons, and mobile-safe overlay scroll; mock checkout card fields have `inputMode="numeric"`
- [x] **Warm Editorial design system overhaul** — replaced corporate palette with terracotta/olive/espresso OKLCH tokens; Playfair Display serif headings via `next/font/google`; `shadow-editorial` replaces card borders; full-screen randomized slideshow with frosted glass card on landing; `active:scale-[0.97]` micro-interactions on all CTAs; eyebrow labels and espresso decorative rules applied consistently across all 7 screens (landing, Phase 0, Phase 2, Phase 3, Phase 4, Phase 5, dashboard, login)

---

## Phase 10 — Pre-Launch
> Security, secrets, and production readiness before any real users.

- [ ] Audit all Supabase RLS policies — confirm no row is accessible by a non-owner user
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the client bundle
- [ ] Switch Stripe to production keys, update webhook endpoint URL
- [ ] Verify all env vars are set in Vercel (or chosen hosting) production environment
- [ ] Set up Vercel project and configure production domain
- [ ] Run one full end-to-end smoke test in production: sign up → lookup → audit → pay → download PDFs
- [ ] Confirm PDF Supabase Storage URLs are private (not public bucket)
- [ ] Review Groq API spend limits and set a usage cap

---

## Running Checklist Stats

| Phase | Items | Done |
|---|---|---|
| 1 — Foundation | 12 | 12 ✅ |
| 2 — Data Layer | 8 | 7 (DCAD pending) |
| 3 — Core UX Shell | 13 | 13 ✅ |
| 4 — AI Engine | 12 | 12 ✅ |
| 5 — Computation Engine | 10 | 9 (manual validation pending) |
| 6 — Payments | 9 | 0 (mock checkout in place; Stripe not integrated) |
| 7 — PDF Generation | 13 | 13 ✅ |
| 8 — Delivery Screen | 6 | 6 ✅ |
| 9 — Polish & Mobile | 6 | 6 ✅ |
| 10 — Pre-Launch | 8 | 0 |
| **Total** | **97** | **78** |
