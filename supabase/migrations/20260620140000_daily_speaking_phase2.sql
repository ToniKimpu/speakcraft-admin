-- Phase 2: split the single combined Gemini call into two steps that each run in
-- a fresh worker (so neither shares a wall-clock budget):
--   1. TRANSCRIBE (flash, audio)  → transcript + pronunciation_notes  (`partial`)
--   2. ANALYZE   (flash, text)    → fixes/vocab/phrases/score from the transcript
-- `phase` tracks which step is next; `partial` holds step-1 output between them.
-- See DAILY_SPEAKING_ASYNC_PLAN.md.

ALTER TABLE "public"."daily_speaking_sessions"
  ADD COLUMN IF NOT EXISTS "phase" text NOT NULL DEFAULT 'transcribe',
  ADD COLUMN IF NOT EXISTS "partial" jsonb;
