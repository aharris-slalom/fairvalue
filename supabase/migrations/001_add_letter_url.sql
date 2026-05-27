-- Migration 001: Add generated_letter_url to protests table
-- Run in Supabase SQL Editor.

ALTER TABLE protests
  ADD COLUMN IF NOT EXISTS generated_letter_url TEXT;
