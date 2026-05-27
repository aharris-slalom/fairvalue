-- FairValue — Full Database Schema
-- Run this in the Supabase SQL Editor for your project.

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tables ───────────────────────────────────────────────────────────────────

-- 1. USERS
-- Mirrors Supabase Auth users. Populated via a trigger on auth.users insert.
-- email is nullable to support anonymous sign-ins (no email until account upgrade).
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PROPERTIES (Scraped County Baseline Data)
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    county_account_number VARCHAR(100) UNIQUE NOT NULL,
    county_name VARCHAR(100) NOT NULL, -- 'dallas' | 'collin' | 'tarrant'
    street_address VARCHAR(255) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    owner_name VARCHAR(255),
    year_built INT,
    total_living_area_sqft INT NOT NULL,
    current_proposed_value NUMERIC(12, 2) NOT NULL,
    market_value_land NUMERIC(12, 2),
    market_value_improvements NUMERIC(12, 2),
    homestead_capped_value NUMERIC(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PROTESTS
CREATE TYPE protest_status AS ENUM (
    'auditing',
    'payment_pending',
    'processing_pdf',
    'completed_ready'
);

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

-- 4. PROPERTY DEFICITS (Itemized Deductions)
CREATE TABLE property_deficits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protest_id UUID REFERENCES protests(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    user_description TEXT NOT NULL,
    estimated_cost_to_cure NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. EVIDENCE ATTACHMENTS
CREATE TABLE evidence_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deficit_id UUID REFERENCES property_deficits(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    attachment_type VARCHAR(50) NOT NULL, -- 'photo' | 'pdf_contractor_quote'
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_properties_zip ON properties(zip_code);
-- Trigram index enables fast ILIKE prefix/contains searches on street_address
CREATE INDEX idx_properties_address_trgm ON properties USING gin(street_address gin_trgm_ops);
CREATE INDEX idx_protests_user ON protests(user_id);
CREATE INDEX idx_deficits_protest ON property_deficits(protest_id);

-- ─── Auth Trigger ─────────────────────────────────────────────────────────────
-- Automatically creates a users row when a new auth.users record is inserted.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE protests ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_deficits ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_attachments ENABLE ROW LEVEL SECURITY;

-- properties is read-only for all authenticated users (county data, not personal)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_read_authenticated"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

-- users: own row only
CREATE POLICY "users_own_row"
  ON users FOR ALL
  USING (auth.uid() = id);

-- protests: own rows only
CREATE POLICY "protests_own"
  ON protests FOR ALL
  USING (auth.uid() = user_id);

-- property_deficits: accessible if the parent protest belongs to the user
CREATE POLICY "deficits_own_protest"
  ON property_deficits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM protests
      WHERE protests.id = property_deficits.protest_id
        AND protests.user_id = auth.uid()
    )
  );

-- evidence_attachments: accessible if the parent deficit's protest belongs to the user
CREATE POLICY "attachments_own_deficit"
  ON evidence_attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM property_deficits pd
      JOIN protests p ON p.id = pd.protest_id
      WHERE pd.id = evidence_attachments.deficit_id
        AND p.user_id = auth.uid()
    )
  );

-- ─── Storage ──────────────────────────────────────────────────────────────────
-- Run these separately in the Supabase Storage section or via the dashboard:
-- 1. Create a private bucket named: evidence-photos
-- 2. Create a private bucket named: protest-pdfs
--
-- Storage policies (run after creating buckets):

INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-photos', 'evidence-photos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('protest-pdfs', 'protest-pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "evidence_photos_own"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'evidence-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'evidence-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "protest_pdfs_own"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'protest-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'protest-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
