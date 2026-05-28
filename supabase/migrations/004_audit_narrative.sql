-- Add audit_narrative to protests
-- Generated from the Phase 3 AI chat conversation at audit-complete time.
ALTER TABLE protests ADD COLUMN IF NOT EXISTS audit_narrative TEXT;
