-- Migration: Add `doctors` table and audit columns to `medications`
-- Run in Supabase SQL editor or migration runner

BEGIN;

-- Create doctors table to track doctor accounts separately
CREATE TABLE IF NOT EXISTS public.doctors (
  id bigserial PRIMARY KEY,
  user_key text UNIQUE,
  display_name text,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Add audit columns to medications
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS added_by_role text,
  ADD COLUMN IF NOT EXISTS added_by_user_key text;

-- Optional: index for fast queries by added_by_user_key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_medications_added_by_user_key'
  ) THEN
    CREATE INDEX idx_medications_added_by_user_key ON public.medications (added_by_user_key);
  END IF;
END$$;

COMMIT;

-- NOTE: This migration does not create foreign key constraints to avoid
-- introducing dependency issues; add FK constraints when ready.
