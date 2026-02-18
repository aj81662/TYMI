-- Migration: Ensure medications table has columns expected by website
-- Run this in Supabase SQL editor (or via your migration tool)

BEGIN;

-- Add text columns if missing
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS label_name text,
  ADD COLUMN IF NOT EXISTS drug_name text,
  ADD COLUMN IF NOT EXISTS strength text,
  ADD COLUMN IF NOT EXISTS route text,
  ADD COLUMN IF NOT EXISTS instruction text,
  ADD COLUMN IF NOT EXISTS frequency_text text,
  ADD COLUMN IF NOT EXISTS qty_text text,
  ADD COLUMN IF NOT EXISTS refills_text text,
  ADD COLUMN IF NOT EXISTS medication_key text;

-- Add boolean is_active and timestamps
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure user_key exists (text) to link to users.user_key
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS user_key text;

-- Create index on medication_key for lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_medications_medication_key'
  ) THEN
    CREATE INDEX idx_medications_medication_key ON public.medications (medication_key);
  END IF;
END$$;

COMMIT;

-- NOTE: This migration only adds missing columns and an index. It does NOT
-- alter RLS policies, constraints, or foreign key constraints. If you need
-- a foreign key to `users(user_key)`, add it explicitly when safe to do so.
