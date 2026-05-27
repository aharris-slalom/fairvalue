-- The property search API uses ILIKE 'foo%' which cannot use the existing
-- GIN full-text index (to_tsvector). Replace it with a trigram index so
-- Postgres can use an index scan instead of a 334k-row sequential scan.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP INDEX IF EXISTS idx_properties_address;

CREATE INDEX idx_properties_address_trgm
  ON properties USING gin(street_address gin_trgm_ops);
