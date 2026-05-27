# Project Context Kit: FairValue (Texas Property Tax Protest Engine)
## Role: Master Technical Product Specification & Database Schema Blueprint
## Target Stack: Next.js (React/TypeScript), TailwindCSS, Shadcn/ui, Supabase (PostgreSQL), LangChain / Vercel AI SDK (OpenAI GPT-4o), Puppeteer / PDFKit

---

## 1. System Prompt & Identity Guidelines
You are an expert AI software engineer and UX architect building FairValue. Your coding decisions must reflect a product that turns a dense, bureaucratic legal process into a stress-free, delightful, human-centric user experience. 

### Core Engineering Principles:
*   Design-Led Engineering: Never build unstyled components. Prioritize scannability, clear typography layouts, data tables with strict horizontal alignments, and seamless multi-step UI transitions.
*   Radical Transparency: Rewrite complex legal jargon into plain, accessible conversational text.
*   No Placeholders: Write production-ready, highly typed TypeScript interfaces and explicit PostgreSQL DDL scripts.

---

## 2. Core Architecture Mapping

*   Frontend UI Layer: Next.js (App Router) + TailwindCSS + Shadcn/ui components. Optimized fully for mobile-first viewports (as users will take and upload damage photos directly from their smartphones).
*   Database & File Storage: Supabase (PostgreSQL) for user data, property records, and transactional states. Supabase Storage buckets for hosting uploaded user defect photos and final generated PDF evidence packets.
*   AI Conversational Engine: Vercel AI SDK utilizing llama-3.3-70b-versatile (Groq). The model maintains conversation context, executes a structured diagnostic home condition audit, and structures unstructured text inputs into strict database variables.
*   Document Generation Engine: `@react-pdf/renderer` — a React component (`EvidencePacket`) compiled server-side to a PDF buffer, uploaded to Supabase Storage.

---

## 3. Production-Ready Database Schema (PostgreSQL DDL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PROPERTIES TABLE (Scraped County Baseline Data)
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    county_account_number VARCHAR(100) UNIQUE NOT NULL,
    county_name VARCHAR(100) NOT NULL, -- e.g., "Dallas", "Collin", "Tarrant"
    street_address VARCHAR(255) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    owner_name VARCHAR(255),
    year_built INT,
    total_living_area_sqft INT NOT NULL,
    current_proposed_value NUMERIC(12, 2) NOT NULL, -- 2026 Assessment
    market_value_land NUMERIC(12, 2),
    market_value_improvements NUMERIC(12, 2),
    homestead_capped_value NUMERIC(12, 2), -- Structural limit evaluation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PROTESTS TRANSACTIONAL TABLE
CREATE TYPE protest_status AS ENUM ('auditing', 'payment_pending', 'processing_pdf', 'completed_ready');
CREATE TYPE selected_argument AS ENUM ('market_value', 'equity', 'both');

CREATE TABLE protests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE RESTRICT,
    status protest_status DEFAULT 'auditing',
    argument_type selected_argument,
    target_protest_value NUMERIC(12, 2),
    estimated_savings NUMERIC(12, 2),
    stripe_session_id VARCHAR(255),
    generated_pdf_url TEXT,
    generated_letter_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PROPERTY CONDITION DEFICITS (Itemized Deductions)
CREATE TABLE property_deficits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protest_id UUID REFERENCES protests(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- e.g., "Foundation", "Roof", "Plumbing"
    user_description TEXT NOT NULL,
    estimated_cost_to_cure NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. EVIDENCE ATTACHMENTS (Photos / Estimates)
CREATE TABLE evidence_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deficit_id UUID REFERENCES property_deficits(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- Supabase Storage URL
    attachment_type VARCHAR(50) NOT NULL, -- "photo" or "pdf_contractor_quote"
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR HIGH-VELOCITY QUERY PERFORMANCE
CREATE INDEX idx_properties_zip ON properties(zip_code);
CREATE INDEX idx_protests_user ON protests(user_id);
CREATE INDEX idx_deficits_protest ON property_deficits(protest_id);

---

## 4. The 5-Phase Conversational UX State Engine

The user flow is controlled by a deterministic state machine managed via the frontend Next.js application, passing the payload context downstream to the AI Orchestration layer.

### Phase 1: Hook & Contextual Baseline
*   State Variable: STATE_ADDRESS_LOOKUP
*   UI Mechanics: Single prominent input on landing page. Autocompletes addresses matching local records.
*   AI Context Pass: Once an address is selected, background API fetches matching data row from `properties`. The UI initializes a chat window where the AI introduces the 2026 county valuation ($624,500) and immediately surfaces an actionable data hook: "54% of homes on your block are assessed lower per square foot than yours."

### Phase 2: The Logic Selection
*   State Variable: STATE_ARGUMENT_SELECTION
*   UI Mechanics: Chat context presents three structural selection chips (market_value, equity, both).
*   AI Prompt Boundary: Chatbot explains the difference between an unequal appraisal defense and a physical property defect defense using accessible, plain-English definitions. The user's selection updates the `argument_type` in the database.

### Phase 3: The Deep Home Audit (Dynamic Variable Collection)
*   State Variable: STATE_CONDITION_AUDIT
*   UI Mechanics: The input line displays a camera/upload utility.
*   AI System Instructions: If the user text contains categorical trigger keys ("cracks", "leaks", "old roof", "foundation"), the AI must immediately freeze open-ended input and prompt for structured input parameters:
    1. "What is the estimated cost to fix this issue? (Rough guesses are perfectly fine)" -> Captures `estimated_cost_to_cure`.
    2. "Please snap or upload a photo of this issue for our official evidence annex." -> Mounts file upload component instantly within the chat panel.

### Phase 4: The Strategy Preview & Value Lock
*   State Variable: STATE_VALUE_PREVIEW
*   UI Mechanics: Closes the conversational interface. Renders a summary table layout: Current Value vs. Target Protest Value (Median Neighborhood Equity Rate less itemized Deficit Estimates).
*   The Conversion Gate: A call-to-action button: "Lock in My Evidence Packet & Protest Letter — $69". Triggers standard Stripe checkout module using custom session initialization.

### Phase 5: Hand-off & Execution
*   State Variable: STATE_DELIVERY
*   UI Mechanics: Renders after verified Stripe webhook event. Discharges direct download paths for two discrete files: `Official_Notice_of_Protest_Letter.pdf` and `DCAD_Protest_Evidence_Packet.pdf`. Includes a scannable step-by-step submission checklist instructing how to input fields within the county's electronic filing system (e.g., Dallas CAD uFile).

---

## 5. ARB (Appraisal Review Board) Evidence Engine Mechanics

To guarantee successful adjustments at a local hearing, the software's computation pipeline must enforce two algorithmic data transformations:

### 1. Equity Median Adjustment Formula
The backend pulls an array of neighborhood properties within the exact geography grid or zip code sharing equivalent characteristics (year_built +/- 5 years, total_living_area_sqft +/- 15%). 
*   It computes the unadjusted appraisal value per square foot for each comp: 
    Unadjusted Rate = Assessed Improvement Value / Total Living Area
*   It identifies the statistical median of that array.
*   Equalized Baseline Target = Median Neighborhood Rate * Subject Total Living Area

### 2. Market Value Cost-to-Cure Modification
Any verified property deficit documented during Phase 3 is extracted as a direct value subtraction:
*   Final Requested Value = Equalized Baseline Target - Sum(Estimated Cost-to-Cure)
*   Estimated Annual Tax Savings = (Current Proposed Value - Final Requested Value) * Local Composite Tax Rate (e.g., 0.0222)

---

## 6. PDF Evidence Packet Specification & Document Layout

The generated document must present an unassailable financial reporting layout. County appraisers review hundreds of packets a day; the layout must be optimized for ultra-fast data scannability.

### Structural Styling Constraints:
*   Color Palette: "Warm Editorial" — intentionally avoids the aggressive red/yellow of discount tax firms and the cold institutional blue of legacy insurance software. Applied consistently across both the web UI and the generated PDF document. The web UI uses OKLCH tokens; the PDF renderer uses the closest sRGB hex equivalents.

| Role | Token / Name | OKLCH (web) | Hex approx. (PDF) |
|---|---|---|---|
| Page background | `--background` / Warm cream | `oklch(0.97 0.007 80)` | `#F8F5F0` |
| Card / surface | `--card` / Warm white | `oklch(0.99 0.003 80)` | `#FDFCFA` |
| Primary text | `--foreground` / Midnight bronze | `oklch(0.22 0.02 55)` | `#2A2218` |
| Primary brand / CTAs | `--primary` / Terracotta | `oklch(0.50 0.12 30)` | `#A0522D` |
| Accent | `--accent` / Deep olive | `oklch(0.40 0.07 130)` | `#4A5E30` |
| Decorative | `--espresso` | `oklch(0.30 0.05 60)` | `#3D2B1F` |
| Dividers / borders | `--border` / Warm light gray | `oklch(0.90 0.007 80)` | `#E5DED5` |
| Secondary text | `--muted-foreground` | `oklch(0.55 0.02 55)` | `#7A6E60` |

*   UI/UX Styling Cues & Visual Rules — Three visual guardrails across the full design language:

    **Generous Whitespace (The Breathing Room Rule):** No dense blocks of text. Chat bubbles must have an adaptive max-width of 420px on mobile so sentences break into short, scannable, vertical rhythm lines.

    **Soft Geometry:** Sharp edges feel institutional and aggressive. Use a soft, modern radius framework: `rounded-xl` (12px) for conversational chat bubbles, and `rounded-2xl` (16px) for structural card wrappers and floating image capture modules.

    **Editorial Shadows (not borders):** All card surfaces use `shadow-editorial` (diffused OKLCH box-shadow) instead of solid borders. `shadow-editorial-hover` elevates on pointer hover. No dark mode.

*   Typography:
    - **Web UI:** Playfair Display (`font-heading` Tailwind utility, maps to `--font-serif`) for headings, wordmarks, eyebrow numbers, and branded section labels. Geist sans for all body/UI text. Both loaded via `next/font/google`.
    - **PDF renderer:** Helvetica-Bold for titles and section headers (PDF engines don't support Google Fonts). 10pt regular body text.
*   Layout Safety: Enforce `page-break-inside: avoid;` on all block table structural elements and picture grid wrappers to prevent unsightly structural rendering clipping across sheets.


### Target Page Assembly Architecture:
1.  Page 1: The Executive Summary: Houses property profile headers, legal parcel tracking info, an explicit statutory declaration citing Texas Tax Code sections, and a dominant Valuation Variance Summary Table showcasing the requested reduction amounts clearly.
2.  Page 2: The Equity Comparison Grid: A rigorous side-by-side comparative table framing the Subject Property alongside three localized neighborhood comps. Must format Distance, Year Built, Total Square Footage, and Adjusted Value Per Square Foot perfectly.
3.  Page 3: The Property Condition & Deficit Affidavit: A tabular breakdown displaying the home's localized physical flaws. Maps itemized categories, user/expert narrative accounts, and the exact dollar amount deductions requested under Cost-to-Cure practices.
4.  Page 4: Photo Evidence Annex: Securely locks user-uploaded damage imagery within balanced structural grid containers. Max 2 photos per page. Each image container must display a lower caption containing: An Exhibit Identification string (e.g., Exhibit C-1: Foundation Deficit), an automated UTC upload timestamp, and the descriptive contextual narrative captured during the Phase 3 conversational audit.

---

## 7. Authentication

*   Provider: Supabase Auth
*   Method: Email + password
*   Session handling: Supabase session cookies, verified via `middleware.ts` on every request to protected routes
*   Protected routes: `/dashboard`, `/protest/[id]`, `/checkout`
*   Public routes: `/` (landing / address lookup), `/login`, `/signup`
*   No OAuth providers for MVP. Supabase Auth's built-in email+password flow is sufficient.

---

## 8. Data Ingestion Pipeline

*   Counties in scope (MVP): Dallas (DCAD), Collin (CCAD), Tarrant (TAD)
*   Source: Each county publishes certified appraisal roll data as bulk export files (CSV/Excel/DBF) annually. These are public records and freely downloadable from each county CAD website.
*   Cadence: Download and re-ingest each January when updated assessments are published for the new tax year.
*   Script: A Node.js ingestion script parses each county's export format and upserts records into the `properties` table using `county_account_number` as the unique key.
*   Comp queries: Neighborhood comps for the equity formula are resolved entirely via SQL against the local `properties` table. No live scraping or external API calls at request time.
*   Address autocomplete in Phase 1: Powered by a full-text search or prefix index query against the `properties` table (`street_address` column).

```
// Ingestion script responsibilities per county file:
// 1. Parse raw export → normalize column names to schema fields
// 2. Map county_name enum value
// 3. Upsert into properties ON CONFLICT (county_account_number) DO UPDATE
// 4. Log ingestion count and any parse errors to stdout
```

---

## 9. AI Conversational Engine (Resolved)

*   SDK: Vercel AI SDK — not LangChain
*   Chat UI: `useChat` hook from `ai/react`. Handles message state, streaming, and optimistic updates natively with Next.js App Router.
*   Model: llama-3.3-70b-versatile via the Groq provider (`@ai-sdk/groq`)
*   Phase 3 structured extraction: The AI uses tool calls (not free-text parsing) to extract deficit data. When the model detects a categorical trigger keyword ("cracks", "leaks", "old roof", "foundation", "HVAC", "plumbing"), it invokes a `log_deficit` tool call:

```typescript
// Zod schema for the AI tool call
const logDeficitSchema = z.object({
  category: z.string(), // e.g., "Foundation", "Roof", "Plumbing"
  user_description: z.string(),
  estimated_cost_to_cure: z.number().default(0),
});
```

*   The frontend intercepts tool call results from the stream and renders the structured upload prompt UI inline within the chat panel.
*   Phase transitions are driven by the Next.js server action, not the AI model. The model is constrained to the current phase's system prompt context.

---

## 10. User Dashboard

*   Route: `/dashboard` (protected)
*   Displays: A list of all protests associated with the authenticated user, ordered by `created_at` descending.
*   Each protest card shows: property street address, current `status` chip, estimated savings amount, and — when `status = completed_ready` — direct download links to both PDFs.
*   Status chip progression: `auditing` → `payment_pending` → `processing_pdf` → `completed_ready`
*   CTA: A prominent "Start New Protest" button that resets to the landing page address lookup flow.
*   Empty state: Warm illustrated empty state with a single CTA directing user to enter their first property address.

---

## 11. Tax Rate Configuration

*   Tax rates are hardcoded in `config/tax-rates.ts` as a typed record. Updated manually each January alongside the data ingestion refresh.

```typescript
// config/tax-rates.ts
export const COUNTY_TAX_RATES: Record<string, number> = {
  dallas: 0.0222,   // Dallas County composite rate — verify each January
  collin: 0.0195,   // Collin County composite rate — verify each January
  tarrant: 0.0229,  // Tarrant County composite rate — verify each January
};
```

*   The `county_name` field on the `properties` table is the key. The savings estimate formula pulls the matching rate at compute time.

---

## 12. Legal Citations Configuration

*   Texas Tax Code citations used in the protest letter are stored in `config/legal-citations.ts`, not embedded in PDF templates. This allows updates without a code deploy if statutory references change.

```typescript
// config/legal-citations.ts
export const TEXAS_TAX_CODE_CITATIONS = {
  rightToProtest: "Texas Tax Code § 41.41",
  unequalAppraisal: "Texas Tax Code § 41.43",
  filingDeadline: "Texas Tax Code § 41.44",
  hearingProcedures: "Texas Tax Code § 41.66",
};
```

*   The PDF template imports and renders these strings into the statutory declaration block on Page 1 of the evidence packet.

---

## 13. Client-Side State Management

*   Library: Zustand
*   Store: A single `useProtestStore` manages the active protest session: current `phase`, `protest_id`, `property` data, accumulated `deficits`, and `target_protest_value`.
*   Persistence: On each phase transition (1→2, 2→3, etc.), the frontend fires a server action that updates the `status` and relevant fields on the `protests` row in Supabase. State is never client-only.
*   URL pattern: `/protest/[id]` — the protest UUID is the canonical reference. On page load, the server reads the protest row and rehydrates the Zustand store to the correct phase. This means the user can close the browser and return to the same URL to resume.

---

## 14. Error States

| Scenario | User-Facing Message | System Behavior |
|---|---|---|
| Address not found at lookup | "We don't have this property on file yet. FairValue currently covers Dallas, Collin, and Tarrant counties." | No protest row created. User remains on landing page. |
| Payment failure (Stripe) | Stripe's native error message surfaced inline in checkout UI. | `protest.status` stays `payment_pending`. User can retry. |
| PDF generation failure | "Your evidence packet is taking longer than expected. Click below to retry." + retry button on `/protest/[id]`. | `protest.status` stays `processing_pdf`. Generation job can be re-triggered. |
| Session expired mid-flow | Redirect to `/login?redirect=/protest/[id]` with a toast: "Your session expired. Please log back in to continue." | State is preserved in DB — user returns to correct phase after re-auth. |

---

## 15. Deadline Awareness

*   Displayed informational only — no urgency countdown or conversion pressure messaging.
*   Location: Phase 5 submission checklist (State: `STATE_DELIVERY`)
*   Copy: "Important: The Texas property tax protest deadline is **May 15**, or 30 days after the date your assessment notice was mailed — whichever is later. File your protest before this date."
*   No deadline-aware gating or blocking of user actions in MVP.

---

## 16. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Server-side only — ingestion script + PDF generation service

# OpenAI
OPENAI_API_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=                    # The $69 one-time protest packet product price ID

# Mapbox (Phase 0 property aerial map)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=    # Public token (pk.*) — Geocoding API v5 + Static Images API

# App
NEXT_PUBLIC_APP_URL=                # e.g., https://fairvalue.app — used for Stripe redirect URLs
```